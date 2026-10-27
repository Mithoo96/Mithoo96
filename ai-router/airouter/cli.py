"""`ai` command line interface."""
from __future__ import annotations

import argparse
import json
import os
import stat
import subprocess
import sys
import time

from . import __version__, config, errors, health, usage
from .catalog import discovered_cache_path, heuristic_scores
from .providers import list_remote_models
from .redact import describe_key, redact, SECRET_PATTERNS
from .router import Router, TASKS

EXIT_NO_PROVIDER = 2
EXIT_REFUSED = 3


def out(text: str = "") -> None:
    sys.stdout.write(redact(text) + "\n")


def err(text: str) -> None:
    sys.stderr.write(redact(text) + "\n")


def table(rows: list[dict], cols: list[str]) -> str:
    if not rows:
        return "(none)"
    widths = {c: max(len(c), *(len(str(r.get(c, "") if r.get(c) is not None else "")) for r in rows)) for c in cols}
    line = "  ".join(c.upper().ljust(widths[c]) for c in cols)
    body = ["  ".join(str(r.get(c) if r.get(c) is not None else "").ljust(widths[c]) for c in cols) for r in rows]
    return "\n".join([line] + body)


# --- commands -------------------------------------------------------------------

def cmd_providers(args) -> int:
    router = Router()
    cool = usage.cooldowns()
    rows = []
    for p in router.providers.values():
        models = router.provider_models(p) if p.configured else p.models
        status = "ready" if p.configured else "not configured"
        if p.name in cool:
            status = f"cooling {int(cool[p.name][0] - time.time())}s"
        if p.kind == "ollama" and p.configured and not models:
            status = "not running"
        rows.append({"provider": p.name, "tier": p.tier, "status": status, "models": len(models),
                     "credential": describe_key(p.key_env) if p.kind != "claude_cli"
                     else ("AI_ENABLE_CLAUDE_CLI=1" if p.configured else "set AI_ENABLE_CLAUDE_CLI=1"),
                     "description": p.description})
    if args.json:
        out(json.dumps(rows, indent=2))
    else:
        out(table(rows, ["provider", "tier", "status", "models", "credential", "description"]))
    return 0


def cmd_models(args) -> int:
    router = Router()
    if args.refresh:
        return refresh_models(router, args)
    rows = []
    for m in router.all_models(configured_only=not args.all):
        if args.provider and m.provider != args.provider:
            continue
        if args.free and not m.zero_cost:
            continue
        rows.append({"model": m.key, "tier": m.tier, "coding": m.coding, "reasoning": m.reasoning,
                     "context": m.context, "$in/M": f"{m.cost_in:g}", "$out/M": f"{m.cost_out:g}",
                     "latency": m.latency})
    if args.json:
        out(json.dumps(rows, indent=2))
    else:
        out(table(rows, ["model", "tier", "coding", "reasoning", "context", "$in/M", "$out/M", "latency"]))
        if not rows:
            out("\nNo models available. Add an API key to ~/.config/ai-router/.env or start Ollama.")
    return 0


def refresh_models(router: Router, args) -> int:
    """List what each configured provider serves now (no tokens spent)."""
    found: dict[str, list[dict]] = {}
    for p in router.providers.values():
        if not p.configured or (args.provider and p.name != args.provider) or p.kind == "claude_cli":
            continue
        try:
            items = list_remote_models(p)
        except errors.ProviderError as e:
            err(f"{p.name}: {e}")
            continue
        entries = []
        for it in items:
            mid = it.get("id")
            if not mid:
                continue
            coding, reasoning = heuristic_scores(mid)
            cin, cout = it.get("cost_in", 0.0) or 0.0, it.get("cost_out", 0.0) or 0.0
            tier = p.tier
            routable = False
            if p.name == "openrouter":
                # Only auto-route OpenRouter models that are explicitly free.
                routable = mid.endswith(":free") and cin == 0 and cout == 0
                tier = "free" if routable else "cheap"
            entries.append({"provider": p.name, "id": mid, "tier": tier, "coding": coding,
                            "reasoning": reasoning, "context": int(it.get("context") or 32_768),
                            "cost_in": cin, "cost_out": cout, "latency": 2, "routable": routable})
        found[p.name] = entries
        out(f"{p.name}: {len(entries)} model(s)" + (
            f", {sum(e['routable'] for e in entries)} free added to routing" if p.name == "openrouter" else ""))
        for e in entries[: args.limit]:
            out(f"  {e['id']}")
    discovered_cache_path().write_text(json.dumps(found, indent=1))
    out(f"\nSaved to {discovered_cache_path()}. Pin models with <PROVIDER>_MODELS in your .env.")
    return 0


def cmd_usage(args) -> int:
    rows = usage.daily_stats(args.days)
    if args.json:
        out(json.dumps({"daily": rows, "models": usage.model_stats(args.days)}, indent=2))
        return 0
    out(f"Usage, last {args.days} day(s):")
    out(table(rows, ["day", "provider", "requests", "ok", "failed", "input_tokens", "output_tokens",
                     "cost_usd", "avg_latency_ms"]))
    total = sum((r["cost_usd"] or 0) for r in rows)
    free_req = sum(r["ok"] or 0 for r in rows if (r["cost_usd"] or 0) == 0)
    out(f"\nTotal cost: ${total:.4f}   Successful zero-cost requests: {free_req}")
    budget = config.get_float("AI_DAILY_BUDGET_USD", 0.0)
    if budget:
        out(f"Today: ${usage.spend_today():.4f} of ${budget:.2f} daily budget")
    out("\nBy model:")
    out(table(usage.model_stats(args.days), ["provider", "model", "requests", "input_tokens",
                                             "output_tokens", "cost_usd"]))
    return 0


def cmd_health(args) -> int:
    router = Router()
    rows = []
    for p in router.providers.values():
        if args.provider and p.name != args.provider:
            continue
        r = health.check(p)
        rows.append({"provider": r["provider"], "ok": "yes" if r["ok"] else "no",
                     "latency_ms": r["latency_ms"], "detail": r["detail"]})
    if args.json:
        out(json.dumps(rows, indent=2))
    else:
        out(table(rows, ["provider", "ok", "latency_ms", "detail"]))
    return 0


def cmd_status(args) -> int:
    router = Router()
    out(f"ai-router {__version__}   data: {config.data_dir()}")
    out("")
    cmd_providers(argparse.Namespace(json=False))
    cool = usage.cooldowns()
    if cool:
        out("\nCooldowns (limits are respected, not bypassed):")
        for name, (until, reason) in cool.items():
            out(f"  {name}: {int(until - time.time())}s left - {reason}")
    hl = usage.last_health()
    if hl:
        out("\nLast health check:")
        for name, h in sorted(hl.items()):
            age = int(time.time() - h["ts"])
            out(f"  {name:<11} {'ok ' if h['ok'] else 'FAIL'} {age}s ago  {h['detail']}")
    rows = [r for r in usage.daily_stats(1)]
    out(f"\nToday: {sum(r['requests'] for r in rows)} request(s), "
        f"{sum((r['input_tokens'] or 0) + (r['output_tokens'] or 0) for r in rows)} tokens, "
        f"${sum((r['cost_usd'] or 0) for r in rows):.4f}")
    ollama = router.providers.get("ollama")
    if ollama and not router.provider_models(ollama):
        out("\nOllama: no local models detected. To install on macOS: `brew install ollama`, "
            "then `ollama serve` and `ollama pull qwen2.5-coder:7b`.")
    free = [m for m in router.all_models() if m.zero_cost]
    out(f"\nZero-cost models available: {len(free)}" + ("" if free else
        "  (add GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY / GITHUB_MODELS_TOKEN, or run Ollama)"))
    return 0


def read_prompt(args) -> str:
    parts = []
    if args.prompt:
        parts.append(" ".join(args.prompt))
    for path in args.file or []:
        with open(path, encoding="utf-8", errors="replace") as fh:
            parts.append(f"\n--- {path} ---\n{fh.read()}")
    if not sys.stdin.isatty() and not args.no_stdin:
        data = sys.stdin.read()
        if data.strip():
            parts.append(data)
    return "\n".join(parts).strip()


def cmd_route(args) -> int:
    prompt = read_prompt(args)
    if not prompt:
        err("error: no prompt given")
        return 1
    plan = Router().plan(prompt, args.mode, args.task, args.system, args.max_tokens)
    if args.json:
        out(json.dumps({"mode": plan.mode, "task": plan.task, "est_input_tokens": plan.est_input_tokens,
                        "candidates": [m.key for m in plan.candidates], "skipped": plan.skipped,
                        "notes": plan.notes}, indent=2))
    else:
        out(plan.explain())
    return 0


def cmd_run(args) -> int:
    mode = args.command
    prompt = read_prompt(args)
    if not prompt:
        err(f"usage: ai {mode} \"your prompt\"   (or pipe text on stdin)")
        return 1
    router = Router()
    if args.dry_run:
        out(router.plan(prompt, mode, args.task, args.system, args.max_tokens).explain())
        return 0
    verbose = not args.quiet
    fallback = not args.no_fallback
    try:
        res = router.run(prompt, mode, args.task, args.system, args.max_tokens, fallback=fallback,
                         on_event=(lambda msg: err(f"ai: {msg}")) if verbose else None)
    except errors.NoProviderAvailable as e:
        err(f"ai: {e}")
        return EXIT_NO_PROVIDER
    except errors.ProviderError as e:
        err(f"ai: {e}")
        return EXIT_REFUSED if e.kind == errors.REFUSAL else 1
    if args.json:
        out(json.dumps({"text": res.text, "provider": res.model.provider, "model": res.model.id,
                        "task": res.task, "mode": res.mode, "input_tokens": res.input_tokens,
                        "output_tokens": res.output_tokens, "cost_usd": round(res.cost, 6),
                        "latency_ms": res.latency_ms, "fallback_attempts": res.attempts}, indent=2))
    else:
        sys.stdout.write(res.text if res.text.endswith("\n") else res.text + "\n")
        if verbose:
            failed = sum("skipped" not in a for a in res.attempts)
            approx = "~" if res.estimated_tokens else ""
            err(f"ai: {res.model.key} [{res.model.tier}] task={res.task} {res.latency_ms}ms "
                f"{approx}{res.input_tokens}->{approx}{res.output_tokens} tok ${res.cost:.5f}"
                + (f" (after {failed} failed provider attempt(s))" if failed else ""))
    return 0


def cmd_reset(args) -> int:
    n = usage.clear_cooldown(args.provider)
    out(f"cleared {n} cooldown(s)")
    return 0


def cmd_doctor(args) -> int:
    """Check that secrets are stored safely."""
    problems = 0
    for path in config.env_files():
        if path.exists():
            mode = stat.S_IMODE(path.stat().st_mode)
            ok = mode & 0o077 == 0
            out(f"{'ok  ' if ok else 'WARN'} {path} permissions {oct(mode)}"
                + ("" if ok else f"  -> run: chmod 600 {path}"))
            problems += not ok
    gi = config.REPO_DIR.parent / ".gitignore"
    for candidate in (config.REPO_DIR / ".gitignore", gi):
        if candidate.exists():
            ok = any(line.strip() in (".env", "*.env", ".env*") for line in candidate.read_text().splitlines())
            out(f"{'ok  ' if ok else 'WARN'} {candidate} {'ignores' if ok else 'does not ignore'} .env")
            problems += not ok
    try:
        root = subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=config.REPO_DIR,
                              capture_output=True, text=True).stdout.strip()
        files = subprocess.run(["git", "ls-files"], cwd=root, capture_output=True, text=True).stdout.split()
        tracked_env = [f for f in files if os.path.basename(f) == ".env"]
        leaks = []
        for f in files:
            try:
                text = open(os.path.join(root, f), encoding="utf-8", errors="ignore").read()
            except OSError:
                continue
            if any(p.search(text) for p in SECRET_PATTERNS[:7]):
                leaks.append(f)
        out(f"{'ok  ' if not tracked_env else 'FAIL'} no .env file tracked by git")
        out(f"{'ok  ' if not leaks else 'FAIL'} no API-key-shaped strings in tracked files"
            + (f": {', '.join(leaks)}" if leaks else ""))
        problems += bool(tracked_env) + bool(leaks)
    except FileNotFoundError:
        out("skip git checks (git not found)")
    out(f"python {sys.version.split()[0]}")
    return 1 if problems else 0


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="ai", description="Route prompts across your configured AI providers.")
    ap.add_argument("--version", action="version", version=f"ai-router {__version__}")
    sub = ap.add_subparsers(dest="command")

    sp = sub.add_parser("status", help="providers, cooldowns, today's usage")
    sp.set_defaults(func=cmd_status)
    sp = sub.add_parser("providers", help="configured providers (never prints keys)")
    sp.add_argument("--json", action="store_true")
    sp.set_defaults(func=cmd_providers)
    sp = sub.add_parser("models", help="routable models")
    sp.add_argument("--provider")
    sp.add_argument("--free", action="store_true", help="only zero-cost models")
    sp.add_argument("--all", action="store_true", help="include unconfigured providers")
    sp.add_argument("--refresh", action="store_true", help="query providers' live model lists")
    sp.add_argument("--limit", type=int, default=15)
    sp.add_argument("--json", action="store_true")
    sp.set_defaults(func=cmd_models)
    sp = sub.add_parser("usage", help="daily token / cost statistics")
    sp.add_argument("--days", type=int, default=7)
    sp.add_argument("--json", action="store_true")
    sp.set_defaults(func=cmd_usage)
    sp = sub.add_parser("health", help="check provider reachability (spends no tokens)")
    sp.add_argument("--provider")
    sp.add_argument("--json", action="store_true")
    sp.set_defaults(func=cmd_health)
    sp = sub.add_parser("reset-cooldown", help="clear cooldowns (after you fixed a key, etc.)")
    sp.add_argument("provider", nargs="?")
    sp.set_defaults(func=cmd_reset)
    sp = sub.add_parser("doctor", help="check secret hygiene")
    sp.set_defaults(func=cmd_doctor)

    def prompt_args(p, route=False):
        p.add_argument("prompt", nargs="*")
        p.add_argument("-f", "--file", action="append", help="append a file's content to the prompt")
        p.add_argument("-t", "--task", choices=list(TASKS), help="override task detection")
        p.add_argument("-s", "--system", help="system prompt")
        p.add_argument("-m", "--max-tokens", type=int)
        p.add_argument("--json", action="store_true")
        p.add_argument("--no-stdin", action="store_true", help="do not read stdin")

    helps = {"auto": "pick the best model for the task (cost, capability, context, availability)",
             "free": "best currently available zero-cost model",
             "claude": "Claude first, then free providers, then local",
             "local": "local Ollama models only"}
    for mode, text in helps.items():
        sp = sub.add_parser(mode, help=text)
        prompt_args(sp)
        sp.add_argument("--dry-run", action="store_true", help="show the routing plan only")
        sp.add_argument("-q", "--quiet", action="store_true")
        sp.add_argument("--no-fallback", action="store_true", help="only try the first choice")
        sp.set_defaults(func=cmd_run)
    sp = sub.add_parser("route", help="explain the routing decision without calling a model")
    prompt_args(sp)
    sp.add_argument("--mode", default="auto", choices=list(helps))
    sp.set_defaults(func=cmd_route)
    return ap


def main(argv: list[str] | None = None) -> int:
    config.load_env()
    parser = build_parser()
    args = parser.parse_args(argv)
    if not getattr(args, "func", None):
        parser.print_help()
        return 0
    try:
        return args.func(args)
    except KeyboardInterrupt:
        return 130
    except (ValueError, OSError) as e:
        err(f"ai: error: {e}")
        return 1
