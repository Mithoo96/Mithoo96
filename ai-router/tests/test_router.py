"""End-to-end tests against a local fake API server. No real keys, no network, no tokens."""
from __future__ import annotations

import json
import os
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
REPO = ROOT.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(HERE))

from airouter import errors, providers as prov, router as router_mod, usage  # noqa: E402
from airouter.redact import redact  # noqa: E402
from airouter.router import Router, classify_task  # noqa: E402
from fake_server import FakeAPI  # noqa: E402

# Fake credentials shaped like real ones so redaction is really exercised. They are
# assembled at runtime so no key-shaped literal lives in the source (secret scanners).
_PAD = "FAKE" + "0123456789abcdefABCDEF0123456789"
FAKE_KEYS = {
    "ANTHROPIC_API_KEY": "sk-" + "ant-api03-" + _PAD,
    "GROQ_API_KEY": "gsk" + "_" + _PAD,
    "GEMINI_API_KEY": "AI" + "za" + _PAD,
    "OPENROUTER_API_KEY": "sk-" + "or-v1-" + _PAD[::-1],
    "GITHUB_MODELS_TOKEN": "github" + "_pat_" + _PAD.lower(),
}
PROVIDER_ENV = ["ANTHROPIC_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY",
                "OPENROUTER_API_KEY", "GITHUB_MODELS_TOKEN", "AI_ENABLE_CLAUDE_CLI",
                "AI_DAILY_BUDGET_USD", "AI_MAX_COST_PER_REQUEST_USD", "AI_DISABLED_PROVIDERS",
                "AI_CUSTOM_PROVIDERS", "OLLAMA_MODELS"]

SERVER: FakeAPI | None = None


def setUpModule():
    global SERVER
    SERVER = FakeAPI().start()


def tearDownModule():
    SERVER.stop()


class Base(unittest.TestCase):
    keys = ("ANTHROPIC_API_KEY", "GROQ_API_KEY", "GEMINI_API_KEY")

    def setUp(self):
        self._env = dict(os.environ)
        self.home = tempfile.mkdtemp(prefix="ai-router-test-")
        for name in PROVIDER_ENV:
            os.environ.pop(name, None)
        os.environ.update({
            "AI_ROUTER_HOME": self.home, "AI_ROUTER_NO_DOTENV": "1",
            "ANTHROPIC_API_BASE": SERVER.url + "/anthropic",
            "GROQ_BASE_URL": SERVER.url + "/groq",
            "GEMINI_BASE_URL": SERVER.url + "/gemini",
            "OPENROUTER_BASE_URL": SERVER.url + "/openrouter",
            "GITHUB_MODELS_BASE_URL": SERVER.url + "/github",
            "OLLAMA_HOST": SERVER.url + "/ollama",
            "AI_BACKOFF_BASE": "0.01", "AI_REQUEST_TIMEOUT": "5",
        })
        for name in self.keys:
            os.environ[name] = FAKE_KEYS[name]
        SERVER.reset()
        prov._OLLAMA_CACHE.clear()
        self.sleeps = []
        router_mod.sleep = self.sleeps.append

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env)
        router_mod.sleep = __import__("time").sleep
        shutil.rmtree(self.home, ignore_errors=True)

    def run_ai(self, *args, stdin="", extra_env=None):
        env = dict(os.environ, PYTHONPATH=str(ROOT), **(extra_env or {}))
        return subprocess.run([sys.executable, "-m", "airouter", *args], input=stdin,
                              capture_output=True, text=True, env=env, timeout=60)


class TestClassification(unittest.TestCase):
    def test_tasks(self):
        cases = {
            "Translate this paragraph into French": "transform",
            "Summarize the following meeting notes": "summarize",
            "Write a README for this CLI": "docs",
            "Write a python function that parses ISO dates": "simple_code",
            "Explain how this repository is structured": "repo_analysis",
            "Design the architecture for a multi-region queue": "complex",
            "Debug this race condition in my worker pool": "complex",
            "What is the capital of Peru?": "general",
        }
        for prompt, task in cases.items():
            self.assertEqual(classify_task(prompt), task, prompt)

    def test_large_code_context_is_repo_analysis(self):
        self.assertEqual(classify_task("refactor this code", 50_000), "repo_analysis")


class TestErrorDetection(unittest.TestCase):
    def test_classify(self):
        self.assertEqual(errors.classify(429, '{"error":{"type":"rate_limit_error"}}'), errors.RATE_LIMIT)
        self.assertEqual(errors.classify(429, "You exceeded your current quota"), errors.QUOTA)
        self.assertEqual(errors.classify(402, "insufficient credits"), errors.QUOTA)
        self.assertEqual(errors.classify(401, "invalid x-api-key"), errors.AUTH)
        self.assertEqual(errors.classify(403, "forbidden"), errors.AUTH)
        self.assertEqual(errors.classify(400, "prompt is too long: 250000 tokens > 200000"), errors.CONTEXT)
        self.assertEqual(errors.classify(400, "context_length_exceeded"), errors.CONTEXT)
        self.assertEqual(errors.classify(413, "Request too large"), errors.CONTEXT)
        self.assertEqual(errors.classify(529, "overloaded_error"), errors.UNAVAILABLE)
        self.assertEqual(errors.classify(503, ""), errors.UNAVAILABLE)
        self.assertEqual(errors.classify(404, "model not found"), errors.NOT_FOUND)
        self.assertEqual(errors.classify(None, "Claude usage limit reached"), errors.QUOTA)

    def test_retry_after(self):
        self.assertEqual(errors.parse_retry_after({"Retry-After": "12"}), 12.0)
        self.assertAlmostEqual(errors.parse_retry_after({"x-ratelimit-reset-requests": "1m30s"}), 90.0)
        self.assertIsNone(errors.parse_retry_after({}))

    def test_backoff_is_exponential_and_respects_retry_after(self):
        os.environ["AI_BACKOFF_BASE"] = "1"
        try:
            d0, d1, d2 = (router_mod.backoff_delay(i) for i in range(3))
            self.assertTrue(1 <= d0 < 1.3 and 2 <= d1 < 2.6 and 4 <= d2 < 5.1)
            self.assertEqual(router_mod.backoff_delay(0, retry_after=3), 3)
            self.assertIsNone(router_mod.backoff_delay(0, retry_after=3600))  # too long: move on
        finally:
            os.environ.pop("AI_BACKOFF_BASE")


class TestProviderSwitching(Base):
    def test_simple_tasks_go_to_zero_cost_models(self):
        res = Router().run("Summarize: the cat sat on the mat.", "auto")
        self.assertEqual(res.task, "summarize")
        self.assertTrue(res.model.zero_cost, res.model.key)
        self.assertEqual(SERVER.hits["anthropic"], 0)

    def test_claude_mode_uses_claude(self):
        res = Router().run("Write a python function to add numbers", "claude")
        self.assertEqual(res.model.key, "anthropic/claude-sonnet-5-5")
        req = [r for r in SERVER.requests if r["provider"] == "anthropic"][-1]
        self.assertEqual(req["headers"].get("x-api-key") or req["headers"].get("X-Api-Key"),
                         FAKE_KEYS["ANTHROPIC_API_KEY"])
        self.assertNotIn("temperature", req["body"])

    def test_complex_task_routes_to_strongest_claude(self):
        res = Router().run("Debug this deadlock in my distributed lock service", "auto")
        self.assertEqual(res.task, "complex")
        self.assertEqual(res.model.key, "anthropic/claude-opus-5-5")

    def test_free_mode_never_uses_paid_models(self):
        plan = Router().plan("Design the architecture for a payments system", "free")
        self.assertTrue(plan.candidates)
        self.assertTrue(all(m.zero_cost for m in plan.candidates))
        self.assertFalse(any(m.provider == "anthropic" for m in plan.candidates))

    def test_daily_budget_excludes_paid_models(self):
        usage.record("anthropic", "claude-opus-5-5", "auto", "complex", 1000, 1000, 5.0, 10, True)
        os.environ["AI_DAILY_BUDGET_USD"] = "1"
        plan = Router().plan("Debug this deadlock", "auto")
        self.assertTrue(all(m.zero_cost for m in plan.candidates))
        self.assertTrue(any("budget" in n for n in plan.notes))

    def test_custom_openai_compatible_provider(self):
        os.environ.update({"AI_CUSTOM_PROVIDERS": "mylab", "AI_CUSTOM_MYLAB_BASE_URL": SERVER.url + "/mylab",
                           "AI_CUSTOM_MYLAB_API_KEY_ENV": "MYLAB_KEY", "MYLAB_KEY": "sk-" + "mylab-" + _PAD,
                           "AI_CUSTOM_MYLAB_MODELS": "lab-coder-32b", "AI_CUSTOM_MYLAB_TIER": "free"})
        os.environ["AI_DISABLED_PROVIDERS"] = "groq,gemini,ollama,anthropic"
        res = Router().run("hello there", "auto")
        self.assertEqual(res.model.key, "mylab/lab-coder-32b")


class TestFallback(Base):
    def test_claude_rate_limited_falls_back_and_cools_down(self):
        SERVER.always["anthropic"] = (429, {"type": "error", "error": {"type": "rate_limit_error",
                                      "message": "rate limited"}}, {"retry-after": "42"})
        r = Router()
        res = r.run("Write a python function to add numbers", "claude")
        self.assertNotEqual(res.model.provider, "anthropic")
        self.assertTrue(res.model.zero_cost)
        self.assertEqual(SERVER.hits["anthropic"], 1, "a 429 must not be retried against the same provider")
        until, reason = usage.cooldowns()["anthropic"]
        self.assertIn("rate_limit", reason)
        self.assertAlmostEqual(until - __import__("time").time(), 42, delta=3)
        # While cooling down, the router does not call Anthropic at all.
        r.run("Write a python function to add numbers", "claude")
        self.assertEqual(SERVER.hits["anthropic"], 1)

    def test_transient_errors_retry_with_backoff(self):
        SERVER.queues["anthropic"] = [(503, {"error": "unavailable"}, {}), (529, {"type": "error",
                                      "error": {"type": "overloaded_error"}}, {})]
        res = Router().run("Write a python function", "claude")
        self.assertEqual(res.model.provider, "anthropic")
        self.assertEqual(SERVER.hits["anthropic"], 3)
        self.assertEqual(len(self.sleeps), 2)
        self.assertLess(self.sleeps[0], self.sleeps[1])

    def test_auth_error_moves_on(self):
        SERVER.always["groq"] = (401, {"error": {"message": "Invalid API Key"}}, {})
        os.environ["AI_DISABLED_PROVIDERS"] = "ollama"
        res = Router().run("Summarize: hi", "free")
        self.assertEqual(res.model.provider, "gemini")
        self.assertIn("auth", usage.cooldowns()["groq"][1])

    def test_quota_exceeded_long_cooldown(self):
        SERVER.always["gemini"] = (429, {"error": {"message": "You exceeded your current quota",
                                                   "status": "RESOURCE_EXHAUSTED"}}, {})
        os.environ["AI_DISABLED_PROVIDERS"] = "ollama,groq"
        with self.assertRaises(errors.NoProviderAvailable):
            Router().run("Summarize: hi", "free")
        until, reason = usage.cooldowns()["gemini"]
        self.assertIn("quota", reason)
        self.assertGreater(until - __import__("time").time(), 3000)

    def test_context_error_skips_smaller_models(self):
        SERVER.always["groq"] = (400, {"error": {"message": "context_length_exceeded"}}, {})
        os.environ["AI_DISABLED_PROVIDERS"] = "ollama,anthropic"
        res = Router().run("Summarize: hi", "auto")
        self.assertEqual(res.model.provider, "gemini")
        self.assertEqual(SERVER.hits["groq"], 1, "other groq models with the same window are skipped")

    def test_full_chain_claude_to_free_to_local(self):
        SERVER.always["anthropic"] = (529, {"type": "error", "error": {"type": "overloaded_error"}}, {})
        SERVER.always["groq"] = (429, {"error": {"message": "rate limit"}}, {"retry-after": "5"})
        SERVER.always["gemini"] = (429, {"error": {"message": "rate limit"}}, {"retry-after": "5"})
        res = Router().run("Write a python function to add numbers", "claude")
        self.assertEqual(res.model.provider, "ollama")
        failures = [a for a in res.attempts if "skipped" not in a]
        self.assertEqual(len(failures), 3, res.attempts)  # anthropic, groq, gemini each called once
        self.assertEqual((SERVER.hits["groq"], SERVER.hits["gemini"]), (1, 1))

    def test_clear_error_when_nothing_available(self):
        SERVER.ollama_up = False
        for p in ("anthropic", "groq", "gemini"):
            SERVER.always[p] = (503, {"error": "down"}, {})
        proc = self.run_ai("claude", "--no-stdin", "Write a function", extra_env={"AI_MAX_RETRIES": "0"})
        self.assertEqual(proc.returncode, 2, proc.stderr)
        self.assertIn("All configured providers failed", proc.stderr)

    def test_refusal_is_not_rerouted(self):
        SERVER.always["anthropic"] = (200, {"type": "message", "content": [], "stop_reason": "refusal",
                                            "usage": {"input_tokens": 1, "output_tokens": 0}}, {})
        with self.assertRaises(errors.ProviderError) as ctx:
            Router().run("Write a function", "claude")
        self.assertEqual(ctx.exception.kind, errors.REFUSAL)
        self.assertEqual(SERVER.hits["groq"] + SERVER.hits["gemini"] + SERVER.hits["ollama"], 0)


class TestLocalRouting(Base):
    keys = ()

    def test_detects_ollama_models_and_skips_embeddings(self):
        ids = [m.id for m in Router().all_models() if m.provider == "ollama"]
        self.assertEqual(sorted(ids), ["llama3.2:3b", "qwen2.5-coder:7b"])

    def test_local_coding_uses_coder_model(self):
        res = Router().run("Write a python function that reverses a list", "local")
        self.assertEqual(res.model.key, "ollama/qwen2.5-coder:7b")
        self.assertEqual(res.cost, 0)

    def test_local_simple_text_prefers_local_in_auto(self):
        os.environ["GROQ_API_KEY"] = FAKE_KEYS["GROQ_API_KEY"]
        res = Router().run("Translate 'good morning' into Spanish", "auto")
        self.assertEqual(res.model.provider, "ollama")

    def test_local_mode_without_ollama_explains_install(self):
        SERVER.ollama_up = False
        plan = Router().plan("hi", "local")
        self.assertFalse(plan.candidates)
        self.assertTrue(any("brew install ollama" in n for n in plan.notes))


class TestUsageTracking(Base):
    def test_tokens_and_cost_recorded(self):
        Router().run("Write a python function", "claude")
        Router().run("Summarize: hi", "free")
        stats = {r["provider"]: r for r in usage.daily_stats(1)}
        self.assertEqual(stats["anthropic"]["input_tokens"], 10)
        self.assertEqual(stats["anthropic"]["output_tokens"], 5)
        self.assertAlmostEqual(stats["anthropic"]["cost_usd"], 10 / 1e6 * 2 + 5 / 1e6 * 10, places=9)
        self.assertEqual(sum(r["cost_usd"] for p, r in stats.items() if p != "anthropic"), 0)
        proc = self.run_ai("usage", "--json")
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertTrue(json.loads(proc.stdout)["daily"])

    def test_health_checks(self):
        proc = self.run_ai("health", "--json")
        rows = {r["provider"]: r for r in json.loads(proc.stdout)}
        self.assertEqual(rows["anthropic"]["ok"], "yes")
        self.assertEqual(rows["ollama"]["ok"], "yes")
        self.assertEqual(rows["openrouter"]["ok"], "no")  # not configured


class TestSecretsNeverExposed(Base):
    keys = tuple(FAKE_KEYS)

    def test_keys_absent_from_all_output_and_storage(self):
        # Providers that echo the key back in their error bodies.
        echo = (401, {"error": {"message": "Invalid API key " + FAKE_KEYS["GROQ_API_KEY"]}}, {})
        SERVER.always["groq"] = echo
        SERVER.always["anthropic"] = (401, {"type": "error", "error": {"type": "authentication_error",
                                      "message": "bad key " + FAKE_KEYS["ANTHROPIC_API_KEY"]}}, {})
        outputs = []
        for args in (["status"], ["providers"], ["providers", "--json"], ["models"], ["models", "--refresh"],
                     ["health"], ["route", "--no-stdin", "summarize this"], ["claude", "--no-stdin", "hi"],
                     ["auto", "--no-stdin", "--json", "summarize: x"], ["usage"], ["doctor"]):
            proc = self.run_ai(*args)
            outputs.append(proc.stdout + proc.stderr)
        blob = "\n".join(outputs)
        for name, key in FAKE_KEYS.items():
            self.assertNotIn(key, blob, f"{name} leaked into CLI output")
            self.assertNotIn(key[8:24], blob, f"part of {name} leaked into CLI output")
        for path in Path(self.home).rglob("*"):
            if path.is_file():
                data = path.read_bytes()
                for name, key in FAKE_KEYS.items():
                    self.assertNotIn(key.encode(), data, f"{name} stored in {path}")
        db = Path(self.home) / "usage.db"
        rows = sqlite3.connect(str(db)).execute("SELECT * FROM cooldowns").fetchall()
        self.assertTrue(any("REDACTED" in str(r) for r in rows))

    def test_redact_patterns(self):
        os.environ.pop("ANTHROPIC_API_KEY")
        self.assertNotIn("zzzzzzzz", redact("key " + "sk-ant-" + "api03-" + "z" * 20 + " end"))
        self.assertNotIn("abcdefghijklmnop", redact("Authorization: Bearer abcdefghijklmnopqrstu"))
        self.assertNotIn("ghp_", redact("token " + "ghp" + "_" + "abcdefghijklmnopqrstuvwxyz0123"))

    def test_env_example_and_gitignore(self):
        example = (REPO / ".env.example").read_text()
        for line in example.splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                name, value = line.split("=", 1)
                if any(s in name for s in ("KEY", "TOKEN")):
                    self.assertEqual(value.strip(), "", f"{name} must be empty in .env.example")
        ignored = (REPO / ".gitignore").read_text().splitlines()
        self.assertIn(".env", [x.strip() for x in ignored])
        tracked = subprocess.run(["git", "ls-files"], cwd=REPO, capture_output=True, text=True).stdout.split()
        self.assertFalse([f for f in tracked if os.path.basename(f) == ".env"])


class TestClaudeCodeConfigIntact(unittest.TestCase):
    def test_project_config_files_unchanged_and_valid(self):
        settings = json.loads((REPO / ".claude" / "settings.json").read_text())
        self.assertTrue(settings["enabledPlugins"]["ponytail@ponytail"])
        mcp = json.loads((REPO / ".mcp.json").read_text())
        self.assertEqual(mcp["mcpServers"]["mindstudio"]["headers"]["Authorization"],
                         "Bearer ${MINDSTUDIO_MCP_TOKEN}")
        diff = subprocess.run(["git", "diff", "--quiet", "HEAD", "--", ".claude/settings.json", ".mcp.json"],
                              cwd=REPO)
        self.assertEqual(diff.returncode, 0, "Claude Code config files were modified")

    @unittest.skipUnless(shutil.which("claude"), "claude CLI not installed")
    def test_claude_cli_still_runs(self):
        proc = subprocess.run(["claude", "--version"], capture_output=True, text=True, timeout=60)
        self.assertEqual(proc.returncode, 0)
        self.assertIn("Claude Code", proc.stdout)


if __name__ == "__main__":
    unittest.main()
