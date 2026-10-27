---
name: ai-router
description: Offload cheap, self-contained text work (summaries, rewrites, translations, docstrings, boilerplate, simple snippets) to free or local models through the `ai` CLI, to save Claude usage. Use when a subtask needs no repository context or tool use and its result can be checked quickly.
---

# Delegating cheap work with `ai`

The `ai` command (from `ai-router/` in this repo) sends a prompt to the best
available zero-cost model: Ollama locally, or the free tiers the user has keys
for. It respects provider rate limits and falls back automatically.

Use it for self-contained work where a weaker model is good enough:

```bash
ai free -t summarize -q -f path/to/long.log "Summarize the errors in this log"
ai free -t transform -q "Rewrite as a concise commit message: ..."
ai free -t docs -q -f src/module.py "Write docstrings for the public functions"
ai local -t simple_code -q "Write a bash one-liner that ..."
```

Rules:
- Do not send secrets, credentials, `.env` contents or private customer data.
  Free cloud tiers may keep prompts.
- Keep architecture, debugging, multi-file changes and anything that needs
  tools in this Claude session.
- Review the output before you use it. If `ai` exits 2 (no free provider
  available), do the work yourself.
- `ai route "<prompt>"` shows the routing choice without spending tokens.
