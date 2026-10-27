"""Task classification, model ranking and fallback execution."""
from __future__ import annotations

import random
import re
import time
from dataclasses import dataclass, field

from . import config, errors, providers as prov, usage
from .catalog import TIERS, Model, Provider, build_providers
from .redact import redact

# min_coding, min_reasoning, tier preference, heavy (prefer capability over cost)
TASKS = {
    "transform":     dict(coding=1, reasoning=1, order=("local", "free", "cheap", "premium"), heavy=False,
                          desc="rewrite / translate / reformat text"),
    "summarize":     dict(coding=1, reasoning=2, order=("local", "free", "cheap", "premium"), heavy=False,
                          desc="summaries, TL;DRs, key points"),
    "docs":          dict(coding=2, reasoning=2, order=("free", "local", "cheap", "premium"), heavy=False,
                          desc="documentation, READMEs, docstrings, comments"),
    "general":       dict(coding=1, reasoning=2, order=("local", "free", "cheap", "premium"), heavy=False,
                          desc="short general questions"),
    "simple_code":   dict(coding=3, reasoning=2, order=("local", "free", "cheap", "premium"), heavy=False,
                          desc="small functions, scripts, regexes, SQL, unit tests"),
    "repo_analysis": dict(coding=4, reasoning=3, order=("free", "local", "cheap", "premium"), heavy=True,
                          desc="understanding large code / many files"),
    "complex":       dict(coding=4, reasoning=4, order=("premium", "cheap", "free", "local"), heavy=True,
                          desc="architecture, debugging, hard reasoning"),
}

RULES = [
    ("complex", r"architect|system design|design (a|the) (system|service|api)|debug|root[- ]cause|"
                r"race condition|deadlock|memory leak|stack ?trace|traceback|segfault|why (does|is) .{0,60}"
                r"(fail|crash|break|slow|hang)|security (review|audit)|threat model|trade-?offs?|"
                r"concurren|distributed|prove|formal|optimi[sz]e the algorithm|migration plan"),
    ("repo_analysis", r"\brepo(sitory)?\b|codebase|code base|across (all |the )?files|multiple files|"
                      r"project structure|dependency graph|call graph|where is .{0,40} (defined|used)"),
    ("docs", r"docstring|readme|documentation|document (this|the)|jsdoc|changelog|release notes|"
             r"api docs|write (a |the )?comments?"),
    ("summarize", r"summari[sz]e|summary|tl;?dr|key points|recap|gist of|condense"),
    ("transform", r"translate|rephrase|rewrite|reword|paraphrase|reformat|proofread|fix (the )?grammar|"
                  r"spelling|convert .{0,40} (to|into)|to (json|yaml|csv|markdown)|lower ?case|upper ?case|"
                  r"title case|make (it|this) (shorter|formal|casual)"),
    ("simple_code", r"```|\bdef \w+\(|\bfunction\b|\bclass \w+|\bregex|\bsql\b|\bbash\b|shell script|"
                    r"\bpython\b|javascript|typescript|\bgo(lang)?\b|\brust\b|unit tests?|write (a |the )?"
                    r"(script|function|method|query|test)|implement|fix (this|the) (bug|error)|"
                    r"\bcode\b|compile error|snippet|refactor"),
]


def classify_task(prompt: str, context_tokens: int | None = None) -> str:
    text = prompt.lower()
    head = text[:4000]  # instructions usually come first; pasted context follows
    for task, pattern in RULES:
        if re.search(pattern, head):
            if task == "simple_code" and (context_tokens or 0) > 20_000:
                return "repo_analysis"
            return task
    if (context_tokens or 0) > 20_000:
        return "summarize"
    return "general"


@dataclass
class Plan:
    mode: str
    task: str
    est_input_tokens: int
    max_tokens: int
    candidates: list[Model]
    skipped: list[tuple[str, str]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def explain(self) -> str:
        lines = [f"mode={self.mode} task={self.task} ({TASKS[self.task]['desc']}) "
                 f"est_input_tokens={self.est_input_tokens} max_tokens={self.max_tokens}"]
        req = TASKS[self.task]
        for i, m in enumerate(self.candidates):
            meets = m.coding >= req["coding"] and m.reasoning >= req["reasoning"]
            cost = m.estimate_cost(self.est_input_tokens, self.max_tokens)
            lines.append(f"  {i + 1:>2}. {m.key:<48} tier={m.tier:<7} coding={m.coding} "
                         f"reasoning={m.reasoning} est_cost<=${cost:.4f}{'' if meets else '  (below recommended)'}")
        for key, why in self.skipped:
            lines.append(f"   -  {key:<48} skipped: {why}")
        lines += [f"  note: {n}" for n in self.notes]
        return redact("\n".join(lines))


@dataclass
class RunResult:
    text: str
    model: Model
    task: str
    mode: str
    input_tokens: int
    output_tokens: int
    cost: float
    latency_ms: int
    attempts: list[str]
    estimated_tokens: bool


def backoff_delay(attempt: int, retry_after: float | None = None) -> float | None:
    """Exponential backoff with jitter; None means "don't wait, move on"."""
    base = config.get_float("AI_BACKOFF_BASE", 1.0) * (2 ** attempt)
    cap = config.get_float("AI_BACKOFF_MAX", 30.0)
    if retry_after is not None:
        if retry_after > cap:
            return None
        return max(retry_after, 0.0)
    return min(cap, base + random.uniform(0, base * 0.25))


sleep = time.sleep  # replaced in tests


class Router:
    def __init__(self, providers: dict[str, Provider] | None = None):
        self.providers = providers if providers is not None else build_providers()

    # -- discovery -------------------------------------------------------------
    def provider_models(self, p: Provider) -> list[Model]:
        if p.kind == "ollama":
            return prov.ollama_models(p) if p.configured else []
        return list(p.models)

    def all_models(self, configured_only: bool = True) -> list[Model]:
        disabled = {x.strip() for x in (config.get("AI_DISABLED_PROVIDERS") or "").split(",") if x.strip()}
        out = []
        for p in self.providers.values():
            if p.name in disabled or (configured_only and not p.configured):
                continue
            out.extend(self.provider_models(p))
        return out

    # -- planning ----------------------------------------------------------------
    def plan(self, prompt: str, mode: str = "auto", task: str | None = None,
             system: str | None = None, max_tokens: int | None = None) -> Plan:
        if mode not in ("auto", "free", "local", "claude"):
            raise ValueError(f"unknown mode {mode}")
        est_in = prov.estimate_tokens((system or "") + prompt)
        task = task or classify_task(prompt, est_in)
        if task not in TASKS:
            raise ValueError(f"unknown task {task}; choose from {', '.join(TASKS)}")
        max_tokens = max_tokens or config.get_int("AI_MAX_TOKENS", 4096)
        req = TASKS[task]
        plan = Plan(mode, task, est_in, max_tokens, [])

        cooling = usage.cooldowns()
        budget = config.get_float("AI_DAILY_BUDGET_USD", 0.0)
        over_budget = budget > 0 and usage.spend_today() >= budget
        if over_budget:
            plan.notes.append(f"daily budget ${budget:.2f} reached: paid models excluded")
        per_request_cap = config.get_float("AI_MAX_COST_PER_REQUEST_USD", 0.0)

        models = self.all_models()
        if mode == "free":
            models = [m for m in models if m.zero_cost]
        elif mode == "local":
            models = [m for m in models if m.provider == "ollama"]

        eligible = []
        for m in models:
            why = None
            if m.provider in cooling:
                until, reason = cooling[m.provider]
                why = f"cooling down {int(until - time.time())}s ({reason})"
            elif est_in + max_tokens > m.context:
                why = f"context {m.context} < needed {est_in + max_tokens}"
            elif over_budget and not m.zero_cost:
                why = "daily budget reached"
            elif per_request_cap and m.estimate_cost(est_in, max_tokens) > per_request_cap:
                why = f"estimated cost above AI_MAX_COST_PER_REQUEST_USD={per_request_cap}"
            if why:
                plan.skipped.append((m.key, why))
            else:
                eligible.append(m)

        def meets(m: Model, c=req["coding"], r=req["reasoning"]) -> bool:
            return m.coding >= c and m.reasoning >= r

        def rank(m: Model, order=req["order"], heavy=req["heavy"]):
            tier_rank = order.index(m.tier) if m.tier in order else len(TIERS)
            cost = m.estimate_cost(est_in, max_tokens)
            cap = m.coding + m.reasoning
            if heavy:
                return (not meets(m), tier_rank, -cap, cost, m.latency)
            return (not meets(m), tier_rank, cost, m.latency, -cap)

        if mode == "claude":
            claude = [m for m in eligible if m.provider in ("anthropic", "claude-cli")]
            rest = [m for m in eligible if m not in claude]
            if task == "complex":
                claude.sort(key=lambda m: (-(m.coding + m.reasoning), m.estimate_cost(est_in, max_tokens)))
            else:
                claude.sort(key=lambda m: (not meets(m, 4, 3), m.estimate_cost(est_in, max_tokens)))
            fallback_order = ("free", "local", "cheap", "premium")
            rest.sort(key=lambda m: rank(m, fallback_order, True))
            if not claude:
                plan.notes.append("no Claude provider available right now; using fallback chain")
            plan.candidates = claude + rest
        else:
            eligible.sort(key=rank)
            plan.candidates = eligible

        if plan.candidates and not meets(plan.candidates[0]):
            plan.notes.append("no available model meets the recommended capability for this task; "
                              "using the best available one")
        if mode == "local" and not models:
            plan.notes.append("no local models found: is Ollama installed and running? "
                              "(macOS: `brew install ollama && ollama serve`, then `ollama pull qwen2.5-coder:7b`)")
        return plan

    # -- execution ---------------------------------------------------------------
    def run(self, prompt: str, mode: str = "auto", task: str | None = None,
            system: str | None = None, max_tokens: int | None = None,
            fallback: bool = True, timeout: float | None = None, on_event=None) -> RunResult:
        plan = self.plan(prompt, mode, task, system, max_tokens)
        chain = plan.candidates
        if not fallback:
            chain = chain[:1]
        timeout = timeout or config.get_float("AI_REQUEST_TIMEOUT", 120.0)
        max_retries = config.get_int("AI_MAX_RETRIES", 2)
        attempts: list[str] = []
        context_floor = 0
        notify = on_event or (lambda msg: None)

        if not chain:
            detail = "; ".join(f"{k}: {w}" for k, w in plan.skipped) or "no providers configured"
            raise errors.NoProviderAvailable(
                redact(f"No configured provider is available for mode '{mode}'. {detail}. "
                       f"Run `ai providers` to see what is configured."), [])

        for m in chain:
            p = self.providers[m.provider]
            if m.provider in usage.cooldowns():
                attempts.append(f"{m.key}: skipped (provider cooling down)")
                continue
            if context_floor and m.context <= context_floor:
                attempts.append(f"{m.key}: skipped (context {m.context} too small)")
                continue
            for attempt in range(max_retries + 1):
                t0 = time.monotonic()
                try:
                    res = prov.chat(p, m, prompt, system, plan.max_tokens, timeout)
                except errors.ProviderError as e:
                    latency = int((time.monotonic() - t0) * 1000)
                    usage.record(m.provider, m.id, mode, plan.task, 0, 0, 0.0, latency, False, e.kind)
                    if e.kind == errors.REFUSAL:
                        # Re-routing a refusal to another provider would be circumvention.
                        raise
                    if e.retryable and attempt < max_retries:
                        delay = backoff_delay(attempt, e.retry_after)
                        if delay is not None:
                            notify(f"{m.key}: {e.kind}, retrying in {delay:.1f}s")
                            sleep(delay)
                            continue
                    attempts.append(str(e))
                    self._react(e, m, notify)
                    if e.kind == errors.CONTEXT:
                        context_floor = max(context_floor, m.context)
                    break
                latency = int((time.monotonic() - t0) * 1000)
                if m.provider == "claude-cli" and not config.get_bool("CLAUDE_CLI_COUNT_COST"):
                    cost = 0.0  # covered by the subscription
                elif res.reported_cost is not None and not m.zero_cost:
                    cost = float(res.reported_cost)
                else:
                    cost = m.estimate_cost(res.input_tokens, res.output_tokens)
                usage.record(m.provider, m.id, mode, plan.task, res.input_tokens, res.output_tokens,
                             cost, latency, True, None, res.estimated_tokens)
                return RunResult(res.text, m, plan.task, mode, res.input_tokens, res.output_tokens,
                                 cost, latency, attempts, res.estimated_tokens)

        raise errors.NoProviderAvailable(
            "All configured providers failed or are limited. Nothing was retried around a "
            "rate limit or quota. Attempts:\n  " + "\n  ".join(redact(a) for a in attempts), attempts)

    def _react(self, e: errors.ProviderError, m: Model, notify) -> None:
        """Put limited/broken providers on cooldown so we stop calling them."""
        if e.kind == errors.RATE_LIMIT:
            secs = e.retry_after or config.get_float("AI_RATE_LIMIT_COOLDOWN", 60)
        elif e.kind == errors.QUOTA:
            secs = max(e.retry_after or 0, config.get_float("AI_QUOTA_COOLDOWN", 3600))
        elif e.kind == errors.AUTH:
            secs = config.get_float("AI_AUTH_COOLDOWN", 1800)
        elif e.kind in (errors.UNAVAILABLE, errors.TIMEOUT):
            secs = config.get_float("AI_UNAVAILABLE_COOLDOWN", 120)
        else:
            notify(f"{m.key}: {e.kind}, trying next model")
            return
        usage.set_cooldown(m.provider, secs, f"{e.kind}: {e.args[0]}")
        notify(f"{m.key}: {e.kind}; {m.provider} paused for {int(secs)}s, trying next provider")
