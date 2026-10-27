"""Provider adapters: one chat() call per provider kind, all stdlib."""
from __future__ import annotations

import json
import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request
from dataclasses import dataclass

from . import config, errors
from .catalog import Model, Provider, heuristic_scores
from .redact import redact

USER_AGENT = "ai-router/1.0"


@dataclass
class ChatResult:
    text: str
    input_tokens: int
    output_tokens: int
    estimated_tokens: bool = False
    reported_cost: float | None = None


def estimate_tokens(text: str) -> int:
    return max(1, (len(text) + 3) // 4)


def http_json(method: str, url: str, headers: dict | None = None, body: dict | None = None,
              timeout: float = 60.0, provider: str = "", model: str = "") -> dict:
    data = json.dumps(body).encode() if body is not None else None
    hdrs = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if data is not None:
        hdrs["Content-Type"] = "application/json"
    hdrs.update(headers or {})
    req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace") if e.fp else ""
        kind = errors.classify(e.code, raw)
        raise errors.ProviderError(kind, redact(_error_message(raw) or e.reason), e.code,
                                   errors.parse_retry_after(dict(e.headers or {})), provider, model)
    except (socket.timeout, TimeoutError):
        raise errors.ProviderError(errors.TIMEOUT, f"no response within {timeout:.0f}s",
                                   provider=provider, model=model)
    except urllib.error.URLError as e:
        reason = e.reason
        if isinstance(reason, (socket.timeout, TimeoutError)):
            raise errors.ProviderError(errors.TIMEOUT, f"no response within {timeout:.0f}s",
                                       provider=provider, model=model)
        raise errors.ProviderError(errors.UNAVAILABLE, redact(f"cannot connect: {reason}"),
                                   provider=provider, model=model)
    except (ConnectionError, OSError) as e:
        raise errors.ProviderError(errors.UNAVAILABLE, redact(f"connection error: {e}"),
                                   provider=provider, model=model)
    try:
        return json.loads(raw) if raw else {}
    except ValueError:
        raise errors.ProviderError(errors.UNAVAILABLE, "provider returned non-JSON response",
                                   provider=provider, model=model)


def _error_message(raw: str) -> str:
    try:
        obj = json.loads(raw)
    except ValueError:
        return raw[:300]
    if isinstance(obj, list) and obj:
        obj = obj[0]
    if isinstance(obj, dict):
        err = obj.get("error", obj)
        if isinstance(err, dict):
            parts = [str(err.get(k)) for k in ("type", "code", "status", "message") if err.get(k)]
            return " ".join(parts)[:300]
        return str(err)[:300]
    return raw[:300]


def _messages(prompt: str, system: str | None) -> list[dict]:
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.append({"role": "user", "content": prompt})
    return msgs


def chat(provider: Provider, model: Model, prompt: str, system: str | None,
         max_tokens: int, timeout: float) -> ChatResult:
    if provider.kind == "anthropic":
        return _chat_anthropic(provider, model, prompt, system, max_tokens, timeout)
    if provider.kind == "claude_cli":
        return _chat_claude_cli(provider, model, prompt, system, timeout)
    return _chat_openai(provider, model, prompt, system, max_tokens, timeout)


def _chat_anthropic(p: Provider, m: Model, prompt, system, max_tokens, timeout) -> ChatResult:
    body = {"model": m.id, "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}]}
    if system:
        body["system"] = system
    headers = {"x-api-key": p.api_key or "",
               "anthropic-version": config.get("ANTHROPIC_VERSION", "2026-10-21")}
    data = http_json("POST", p.base_url.rstrip("/") + "/v1/messages", headers, body,
                     timeout, p.name, m.id)
    if data.get("type") == "error":
        err = data.get("error", {})
        raise errors.ProviderError(errors.classify(None, json.dumps(err)),
                                   redact(err.get("message", "error")), provider=p.name, model=m.id)
    if data.get("stop_reason") == "refusal":
        raise errors.ProviderError(errors.REFUSAL, "model declined the request",
                                   provider=p.name, model=m.id)
    text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    usage = data.get("usage") or {}
    if "input_tokens" in usage:
        tin = (usage.get("input_tokens") or 0) + (usage.get("cache_read_input_tokens") or 0) \
              + (usage.get("cache_creation_input_tokens") or 0)
        return ChatResult(text, tin, usage.get("output_tokens") or 0)
    return ChatResult(text, estimate_tokens((system or "") + prompt), estimate_tokens(text), True)


def _chat_openai(p: Provider, m: Model, prompt, system, max_tokens, timeout) -> ChatResult:
    base = p.base_url.rstrip("/")
    if p.kind == "ollama":
        base += "/v1"
    headers = dict(p.extra_headers)
    if p.api_key:
        headers["Authorization"] = f"Bearer {p.api_key}"
    body = {"model": m.id, "messages": _messages(prompt, system), "max_tokens": max_tokens,
            "stream": False}
    data = http_json("POST", base + "/chat/completions", headers, body, timeout, p.name, m.id)
    if data.get("error"):  # some gateways report errors with HTTP 200
        err = data["error"]
        msg = _error_message(json.dumps({"error": err}))
        status = err.get("code") if isinstance(err, dict) and isinstance(err.get("code"), int) else None
        raise errors.ProviderError(errors.classify(status, msg), redact(msg), status,
                                   provider=p.name, model=m.id)
    choices = data.get("choices") or []
    if not choices:
        raise errors.ProviderError(errors.UNAVAILABLE, "empty response", provider=p.name, model=m.id)
    choice = choices[0]
    if choice.get("finish_reason") == "content_filter":
        raise errors.ProviderError(errors.REFUSAL, "provider content filter declined the request",
                                   provider=p.name, model=m.id)
    text = (choice.get("message") or {}).get("content") or ""
    usage = data.get("usage") or {}
    if usage.get("prompt_tokens") is not None:
        return ChatResult(text, usage.get("prompt_tokens") or 0, usage.get("completion_tokens") or 0,
                          reported_cost=usage.get("cost") if isinstance(usage.get("cost"), (int, float)) else None)
    return ChatResult(text, estimate_tokens((system or "") + prompt), estimate_tokens(text), True)


def _chat_claude_cli(p: Provider, m: Model, prompt, system, timeout) -> ChatResult:
    exe = shutil.which(config.get("CLAUDE_CLI_PATH", "claude"))
    if not exe:
        raise errors.ProviderError(errors.UNAVAILABLE, "claude CLI not found", provider=p.name, model=m.id)
    cmd = [exe, "-p", "--output-format", "json", "--model", m.id]
    if system:
        cmd += ["--append-system-prompt", system]
    try:
        proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        raise errors.ProviderError(errors.TIMEOUT, f"no response within {timeout:.0f}s",
                                   provider=p.name, model=m.id)
    out = proc.stdout.strip()
    try:
        data = json.loads(out.splitlines()[-1]) if out else {}
    except ValueError:
        data = {}
    if proc.returncode != 0 or data.get("is_error") or not data:
        msg = redact((data.get("result") if data else "") or proc.stderr or out or "claude CLI failed")[:300]
        kind = errors.classify(None, msg)
        raise errors.ProviderError(kind if kind != errors.UNKNOWN else errors.UNAVAILABLE, msg,
                                   provider=p.name, model=m.id)
    usage = data.get("usage") or {}
    text = data.get("result") or ""
    if "input_tokens" in usage:
        tin = (usage.get("input_tokens") or 0) + (usage.get("cache_read_input_tokens") or 0) \
              + (usage.get("cache_creation_input_tokens") or 0)
        return ChatResult(text, tin, usage.get("output_tokens") or 0,
                          reported_cost=data.get("total_cost_usd"))
    return ChatResult(text, estimate_tokens(prompt), estimate_tokens(text), True)


# --- discovery ----------------------------------------------------------------

_OLLAMA_CACHE: dict[str, tuple[float, list[Model]]] = {}


def ollama_models(p: Provider, timeout: float = 2.0, use_cache: bool = True) -> list[Model]:
    """Installed Ollama models, or [] when Ollama is not running."""
    cached = _OLLAMA_CACHE.get(p.base_url)
    if use_cache and cached and time.time() - cached[0] < 30:
        return cached[1]
    try:
        data = http_json("GET", p.base_url + "/api/tags", timeout=timeout, provider="ollama")
    except errors.ProviderError:
        _OLLAMA_CACHE[p.base_url] = (time.time(), [])
        return []
    ctx = config.get_int("AI_OLLAMA_CONTEXT", 8192)
    allow = {x.strip() for x in (config.get("OLLAMA_MODELS") or "").split(",") if x.strip()}
    models = []
    for item in data.get("models", []):
        name = item.get("name") or item.get("model")
        if not name or (allow and name not in allow):
            continue
        if "embed" in name.lower():
            continue  # embedding models cannot chat
        size = None
        param = (item.get("details") or {}).get("parameter_size", "")
        try:
            size = float(str(param).upper().rstrip("B")) if param else None
        except ValueError:
            size = None
        coding, reasoning = heuristic_scores(name, size)
        latency = 3 if (size or 0) >= 30 else 2
        models.append(Model("ollama", name, "local", coding, reasoning, ctx, 0.0, 0.0, latency))
    _OLLAMA_CACHE[p.base_url] = (time.time(), models)
    return models


def list_remote_models(p: Provider, timeout: float = 15.0) -> list[dict]:
    """Query a provider's model listing endpoint. Uses no tokens."""
    if p.kind == "ollama":
        return [m.to_dict() for m in ollama_models(p, timeout, use_cache=False)]
    if p.kind == "claude_cli":
        return []
    if p.kind == "anthropic":
        data = http_json("GET", p.base_url.rstrip("/") + "/v1/models?limit=100",
                         {"x-api-key": p.api_key or "",
                          "anthropic-version": config.get("ANTHROPIC_VERSION", "2026-10-21")},
                         timeout=timeout, provider=p.name)
        return [{"id": d.get("id"), "context": d.get("max_input_tokens")} for d in data.get("data", [])]
    headers = dict(p.extra_headers)
    if p.api_key:
        headers["Authorization"] = f"Bearer {p.api_key}"
    if p.name == "github":
        url = "https://models.github.ai/catalog/models" if "models.github.ai" in p.base_url \
            else p.base_url.rstrip("/") + "/models"
        data = http_json("GET", url, headers, timeout=timeout, provider=p.name)
        items = data if isinstance(data, list) else data.get("data", [])
        return [{"id": d.get("id"), "context": (d.get("limits") or {}).get("max_input_tokens")} for d in items]
    data = http_json("GET", p.base_url.rstrip("/") + "/models", headers, timeout=timeout, provider=p.name)
    items = data.get("data", data.get("models", [])) if isinstance(data, dict) else data
    out = []
    for d in items or []:
        mid = d.get("id") or d.get("name", "")
        if mid.startswith("models/"):
            mid = mid[len("models/"):]
        entry = {"id": mid, "context": d.get("context_length") or d.get("context_window")
                 or d.get("inputTokenLimit")}
        pricing = d.get("pricing")
        if isinstance(pricing, dict):
            try:
                entry["cost_in"] = float(pricing.get("prompt", 0)) * 1e6
                entry["cost_out"] = float(pricing.get("completion", 0)) * 1e6
            except (TypeError, ValueError):
                pass
        out.append(entry)
    return out
