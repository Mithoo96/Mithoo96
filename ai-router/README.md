# ai-router

A dependency-free command-line tool for macOS (Python 3.9+, standard library
only). It sends each prompt to the cheapest provider you have configured that
can handle it, and falls back to the next one when a provider is limited or
down.

It uses only official APIs, your own keys, legitimate free tiers and local
models. A provider that returns a rate limit or quota error is **paused**, and
the request moves to another provider you configured. The router never retries
around a limit, rotates keys or accounts, or re-routes a safety refusal.

## Install (macOS)

```bash
cd ai-router
./install.sh                  # links ~/.local/bin/ai, creates ~/.config/ai-router/.env (chmod 600)
./install.sh --update-shell   # also adds ~/.local/bin to PATH in ~/.zshrc (backs it up first)
$EDITOR ~/.config/ai-router/.env
ai status && ai health
```

If Ollama is missing, the installer explains how to get it
(`brew install ollama`) and asks before installing anything. It never touches
`~/.claude`, `~/.claude.json` or the project's `.claude/settings.json` /
`.mcp.json`. To remove it, run `./install.sh --uninstall`.

## Commands

| Command | What it does |
|---|---|
| `ai status` | Providers, cooldowns, last health check, today's usage |
| `ai providers` | Which providers are configured (shows only *whether* a key is set) |
| `ai models [--free] [--refresh]` | Routable models; `--refresh` asks each provider what it serves now |
| `ai usage [--days N]` | Daily requests, tokens, cost and latency per provider and model |
| `ai health` | Checks reachability using listing endpoints, which spend no tokens |
| `ai free "…"` | Best zero-cost model available right now (local or free tier) |
| `ai auto "…"` | Picks by task, context size, availability, cost, capability and latency |
| `ai claude "…"` | Claude first; if unavailable, free providers, then local |
| `ai local "…"` | Ollama only (private) |
| `ai route "…"` | Shows the ranked plan without calling any model |
| `ai reset-cooldown [provider]` | Clears a pause, e.g. after you fix a key |
| `ai doctor` | Checks `.env` permissions, `.gitignore`, and tracked files for keys |

Prompt options: `-f FILE` (repeatable), stdin (`git diff | ai free -t summarize`),
`-t TASK`, `-s SYSTEM`, `-m MAX_TOKENS`, `--json`, `--dry-run`, `--no-fallback`, `-q`.
The answer goes to stdout and routing info to stderr, so piping works.
Exit codes: `0` ok, `1` error, `2` no provider available, `3` request refused.

## Routing

| Task (auto-detected, or `-t`) | Minimum coding/reasoning | Tier preference |
|---|---|---|
| `transform` (rewrite, translate, reformat) | 1 / 1 | local → free → cheap → premium |
| `summarize` | 1 / 2 | local → free → cheap → premium |
| `general` | 1 / 2 | local → free → cheap → premium |
| `docs` | 2 / 2 | free → local → cheap → premium |
| `simple_code` | 3 / 2 | local → free → cheap → premium |
| `repo_analysis` | 4 / 3 | free → local → cheap → premium (largest-context models win) |
| `complex` (architecture, debugging) | 4 / 4 | premium → cheap → free → local (strongest first) |

The router removes models that:

- belong to a provider on cooldown,
- can't fit the estimated prompt plus `max_tokens`,
- would break `AI_DAILY_BUDGET_USD` or `AI_MAX_COST_PER_REQUEST_USD`.

It then ranks the rest:

- models meeting the task's minimum come first, then tier preference;
- for light tasks, lower cost and latency win;
- for heavy tasks, higher capability wins.

If no model meets the minimum, it uses the best one available and says so.
The ranked list is also the fallback chain.

## Failure handling

| Detected | Reaction |
|---|---|
| 5xx, 529 overloaded, timeouts, connection refused | Retries on the same model with exponential backoff and jitter (`AI_MAX_RETRIES`, default 2), then pauses the provider briefly and moves on |
| HTTP 429 rate limit | Pauses the provider for `Retry-After` (or 60s) and moves on; no retry |
| Quota, credits, billing (429/402 with quota text) | Pauses the provider for at least 1h and moves on |
| 401/403 auth | Pauses the provider for 30 min and moves on |
| Context-window errors (400/413) | Skips every model whose window is not larger |
| Unknown model / bad request | Tries the next model |
| Safety refusal / content filter | Stops: such a request is never re-routed |

## Providers

| Provider | Credential | Default tier | Notes |
|---|---|---|---|
| Anthropic | `ANTHROPIC_API_KEY` | premium (Haiku: cheap) | Messages API, `anthropic-version: 2026-10-21` |
| Claude CLI | `AI_ENABLE_CLAUDE_CLI=1` | premium | Runs `claude -p` on your Claude subscription, within its normal limits |
| OpenRouter | `OPENROUTER_API_KEY` | free | Only `:free` models are zero-cost; `ai models --refresh` finds the current ones |
| Gemini | `GEMINI_API_KEY` | free | Free tier; Google may use free-tier prompts, so don't send confidential code |
| Groq | `GROQ_API_KEY` | free | Free tier, fastest |
| GitHub Models | `GITHUB_MODELS_TOKEN` | free | PAT with `models:read`; requests are capped at about 8k tokens |
| Ollama | none | local | Models auto-detected from `/api/tags`; embedding models ignored |
| Custom | `AI_CUSTOM_PROVIDERS` | you set it | Any OpenAI-compatible endpoint you configure |

Model IDs and prices change, so every list and price can be overridden in
`.env` (see `../.env.example`). A provider you upgraded to paid can be moved
out of the free tier with `<PROVIDER>_TIER=cheap`.

## Data and secrets

- Keys live only in the environment or in `~/.config/ai-router/.env` (mode 600),
  outside the repository. `.env` is git-ignored.
- All printed, logged and stored text goes through a redactor. It masks the
  value of every `*KEY*`, `*TOKEN*` or `*SECRET*` variable, plus common key
  formats.
- Usage history: `~/.local/share/ai-router/usage.db` (SQLite, mode 600). It
  stores token counts, cost, latency and error kind, but never prompts or
  responses.

## Use from Claude Code

`.claude/skills/ai-router/SKILL.md` tells Claude Code when to hand
self-contained chores (summaries, rewrites, docstrings) to `ai free`, so they
don't use Claude tokens. To let it run `ai` without asking each time, add
`Bash(ai:*)` to your permissions allowlist yourself. This setup does not edit
your settings.

## Tests

```bash
python3 -m unittest discover -s tests -v
```

The tests run against a local fake API server, so they need no real keys and
spend no tokens. They cover:

- task classification and provider switching;
- every fallback path, including the full Claude → free → free → Ollama chain;
- retry and backoff, cooldowns, local routing;
- token and cost tracking, health checks;
- keys never reaching output or storage;
- Claude Code's config files staying unchanged.
