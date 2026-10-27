"""Providers and model metadata.

Scores are coarse 1-5 ratings used only for routing. Model IDs, tiers and
prices change over time: every list here can be overridden from the
environment (see .env.example), and `ai models --refresh` discovers what each
provider actually serves right now.
"""
from __future__ import annotations

import json
import os
import re
import shutil
from dataclasses import dataclass, field, asdict

from . import config

# Tier order is also the default preference order for cheap work.
TIERS = ("local", "free", "cheap", "premium")


@dataclass
class Model:
    provider: str
    id: str
    tier: str
    coding: int = 2
    reasoning: int = 2
    context: int = 8192
    cost_in: float = 0.0     # USD per 1M input tokens
    cost_out: float = 0.0    # USD per 1M output tokens
    latency: int = 2         # 1 fast, 2 normal, 3 slow

    @property
    def key(self) -> str:
        return f"{self.provider}/{self.id}"

    @property
    def zero_cost(self) -> bool:
        return self.cost_in == 0 and self.cost_out == 0

    def estimate_cost(self, tokens_in: int, tokens_out: int) -> float:
        return tokens_in / 1e6 * self.cost_in + tokens_out / 1e6 * self.cost_out

    def to_dict(self) -> dict:
        d = asdict(self)
        d["key"] = self.key
        return d


@dataclass
class Provider:
    name: str
    kind: str                      # anthropic | openai | ollama | claude_cli
    base_url: str
    key_env: str | None
    tier: str
    description: str
    models: list[Model] = field(default_factory=list)
    extra_headers: dict = field(default_factory=dict)

    @property
    def api_key(self) -> str | None:
        return config.get(self.key_env) if self.key_env else None

    @property
    def configured(self) -> bool:
        if self.kind == "ollama":
            return config.get_bool("AI_ENABLE_OLLAMA", True)
        if self.kind == "claude_cli":
            return config.get_bool("AI_ENABLE_CLAUDE_CLI", False) and shutil.which(
                config.get("CLAUDE_CLI_PATH", "claude")) is not None
        return bool(self.api_key)


# --- default model metadata -------------------------------------------------
# (id, coding, reasoning, context, cost_in, cost_out, latency)
ANTHROPIC_MODELS = [
    ("claude-haiku-5-5", 3, 3, 1_000_000, 0.10, 0.50, 1),
    ("claude-sonnet-5-5", 5, 4, 1_000_000, 2.00, 10.00, 2),
    ("claude-opus-5-5", 5, 5, 1_000_000, 4.00, 20.00, 3),
]
OPENROUTER_FREE_MODELS = [
    ("meta-llama/llama-3.3-70b-instruct:free", 3, 3, 65_536, 0, 0, 2),
    ("qwen/qwen3-coder:free", 4, 3, 262_144, 0, 0, 2),
    ("deepseek/deepseek-r1:free", 3, 4, 65_536, 0, 0, 3),
]
GEMINI_MODELS = [
    ("gemini-2.5-flash-lite", 2, 2, 1_000_000, 0, 0, 1),
    ("gemini-2.5-flash", 3, 3, 1_000_000, 0, 0, 1),
    ("gemini-2.5-pro", 4, 4, 1_000_000, 0, 0, 2),
]
GROQ_MODELS = [
    ("llama-3.1-8b-instant", 2, 2, 131_072, 0, 0, 1),
    ("llama-3.3-70b-versatile", 3, 3, 131_072, 0, 0, 1),
    ("openai/gpt-oss-120b", 4, 4, 131_072, 0, 0, 1),
]
# GitHub Models' free tier caps request size well below the models' native window.
GITHUB_MODELS = [
    ("openai/gpt-4.1-mini", 3, 3, 8_000, 0, 0, 2),
    ("openai/gpt-4.1", 4, 4, 8_000, 0, 0, 2),
]
CLAUDE_CLI_MODELS = [
    ("sonnet", 5, 4, 200_000, 0, 0, 3),
    ("opus", 5, 5, 200_000, 0, 0, 3),
]

KNOWN = {m[0]: m for group in (ANTHROPIC_MODELS, OPENROUTER_FREE_MODELS, GEMINI_MODELS,
                                GROQ_MODELS, GITHUB_MODELS) for m in group}


def heuristic_scores(model_id: str, size_b: float | None = None) -> tuple[int, int]:
    """Guess (coding, reasoning) for a model we have no metadata for."""
    name = model_id.lower()
    if size_b is None:
        m = re.search(r"(\d+(?:\.\d+)?)b\b", name)
        size_b = float(m.group(1)) if m else None
    big = size_b is not None and size_b >= 30
    mid = size_b is not None and 12 <= size_b < 30
    coding = 3 if big else 2
    reasoning = 3 if big else 2
    if re.search(r"coder|code|starcoder|devstral|codestral|codellama", name):
        coding = 4 if (big or mid) else 3
    if re.search(r"r1|qwq|reason|think|gpt-oss", name):
        reasoning += 1
    return min(coding, 5), min(reasoning, 5)


def _model(provider: str, tier: str, spec: tuple) -> Model:
    mid, coding, reasoning, ctx, cin, cout, lat = spec
    if tier in ("local", "free"):
        cin = cout = 0.0
    return Model(provider, mid, tier, coding, reasoning, ctx, cin, cout, lat)


def _env_models(provider: str, env_name: str, tier: str, defaults: list[tuple],
                default_ctx: int = 32_768) -> list[Model]:
    """Use <PROVIDER>_MODELS when set; unknown IDs get heuristic scores."""
    override = config.get(env_name)
    if not override:
        return [_model(provider, tier, spec) for spec in defaults]
    models = []
    for mid in [x.strip() for x in override.split(",") if x.strip()]:
        spec = KNOWN.get(mid)
        if spec is None:
            coding, reasoning = heuristic_scores(mid)
            spec = (mid, coding, reasoning, default_ctx, 0, 0, 2)
        models.append(_model(provider, tier, spec))
    return models


def _apply_pricing_overrides(models: list[Model]) -> None:
    """AI_PRICE_<provider>__<model> = "in,out" (USD per 1M tokens)."""
    for m in models:
        var = "AI_PRICE_" + re.sub(r"[^A-Za-z0-9]", "_", f"{m.provider}__{m.id}").upper()
        value = config.get(var)
        if value and "," in value:
            try:
                m.cost_in, m.cost_out = (float(x) for x in value.split(",", 1))
            except ValueError:
                pass


def discovered_cache_path():
    return config.data_dir() / "discovered_models.json"


def load_discovered() -> dict[str, list[dict]]:
    try:
        return json.loads(discovered_cache_path().read_text())
    except (OSError, ValueError):
        return {}


def build_providers() -> dict[str, Provider]:
    providers: dict[str, Provider] = {}

    def tier_for(name: str, default: str) -> str:
        tier = (config.get(f"{name.upper().replace('-', '_')}_TIER") or default).lower()
        return tier if tier in TIERS else default

    tier = tier_for("anthropic", "premium")
    p = Provider("anthropic", "anthropic",
                 config.get("ANTHROPIC_API_BASE", "https://api.anthropic.com"),
                 "ANTHROPIC_API_KEY", tier, "Anthropic Messages API (paid, your own API key)")
    p.models = _env_models("anthropic", "ANTHROPIC_MODELS", tier, ANTHROPIC_MODELS, 200_000)
    # Haiku is priced like a budget model; keep it in the cheap tier.
    for m in p.models:
        if m.tier == "premium" and m.cost_in <= 0.5:
            m.tier = "cheap"
    providers[p.name] = p

    tier = tier_for("claude_cli", "premium")
    p = Provider("claude-cli", "claude_cli", "", None, tier,
                 "Claude Code CLI in print mode (your Claude subscription; opt-in)")
    p.models = _env_models("claude-cli", "CLAUDE_CLI_MODELS", tier, CLAUDE_CLI_MODELS, 200_000)
    providers[p.name] = p

    tier = tier_for("openrouter", "free")
    p = Provider("openrouter", "openai",
                 config.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
                 "OPENROUTER_API_KEY", tier, "OpenRouter (':free' models cost nothing)",
                 extra_headers={"X-Title": "ai-router"})
    p.models = _env_models("openrouter", "OPENROUTER_MODELS", tier, OPENROUTER_FREE_MODELS)
    # A paid OpenRouter model must never be priced as free.
    for m in p.models:
        if not m.id.endswith(":free") and m.tier == "free":
            m.tier = "cheap"
    providers[p.name] = p

    tier = tier_for("gemini", "free")
    if not config.get("GEMINI_API_KEY") and config.get("GOOGLE_API_KEY"):
        os.environ["GEMINI_API_KEY"] = config.get("GOOGLE_API_KEY")
    p = Provider("gemini", "openai",
                 config.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai"),
                 "GEMINI_API_KEY", tier, "Google Gemini API (free tier, OpenAI-compatible endpoint)")
    p.models = _env_models("gemini", "GEMINI_MODELS", tier, GEMINI_MODELS, 1_000_000)
    providers[p.name] = p

    tier = tier_for("groq", "free")
    p = Provider("groq", "openai", config.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
                 "GROQ_API_KEY", tier, "Groq (free tier, very low latency)")
    p.models = _env_models("groq", "GROQ_MODELS", tier, GROQ_MODELS, 131_072)
    providers[p.name] = p

    tier = tier_for("github", "free")
    p = Provider("github", "openai",
                 config.get("GITHUB_MODELS_BASE_URL", "https://models.github.ai/inference"),
                 "GITHUB_MODELS_TOKEN", tier, "GitHub Models (free, rate-limited prototyping tier)")
    p.models = _env_models("github", "GITHUB_MODELS", tier, GITHUB_MODELS, 8_000)
    providers[p.name] = p

    host = config.get("OLLAMA_HOST", "http://localhost:11434")
    if not host.startswith("http"):
        host = "http://" + host
    p = Provider("ollama", "ollama", host.rstrip("/"), None, "local",
                 "Local models via Ollama (private, no quota)")
    providers[p.name] = p  # models discovered at runtime

    for name in [x.strip() for x in (config.get("AI_CUSTOM_PROVIDERS") or "").split(",") if x.strip()]:
        prefix = "AI_CUSTOM_" + re.sub(r"[^A-Za-z0-9]", "_", name).upper()
        base = config.get(prefix + "_BASE_URL")
        if not base:
            continue
        tier = (config.get(prefix + "_TIER") or "cheap").lower()
        tier = tier if tier in TIERS else "cheap"
        p = Provider(name, "openai", base, config.get(prefix + "_API_KEY_ENV"), tier,
                     f"Custom OpenAI-compatible provider ({prefix}_*)")
        ctx = config.get_int(prefix + "_CONTEXT", 32_768)
        cin = config.get_float(prefix + "_COST_IN", 0.0)
        cout = config.get_float(prefix + "_COST_OUT", 0.0)
        for mid in [x.strip() for x in (config.get(prefix + "_MODELS") or "").split(",") if x.strip()]:
            coding, reasoning = heuristic_scores(mid)
            coding = config.get_int(prefix + "_CODING", coding)
            reasoning = config.get_int(prefix + "_REASONING", reasoning)
            p.models.append(_model(name, tier, (mid, coding, reasoning, ctx, cin, cout, 2)))
        providers[name] = p

    # Merge models found by `ai models --refresh` (OpenRouter free list, etc.).
    for pname, items in load_discovered().items():
        prov = providers.get(pname)
        if not prov or prov.kind == "ollama" or config.get(f"{pname.upper()}_MODELS"):
            continue
        have = {m.id for m in prov.models}
        for item in items:
            if item.get("id") in have or not item.get("routable"):
                continue
            prov.models.append(Model(**{k: item[k] for k in
                                        ("provider", "id", "tier", "coding", "reasoning",
                                         "context", "cost_in", "cost_out", "latency")}))

    for prov in providers.values():
        _apply_pricing_overrides(prov.models)
    return providers
