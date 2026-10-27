"""Provider health checks. They hit listing endpoints only, so they spend no tokens."""
from __future__ import annotations

import shutil
import subprocess
import time

from . import config, errors, usage
from .catalog import Provider
from .providers import list_remote_models, ollama_models
from .redact import redact


def check(p: Provider, timeout: float = 10.0) -> dict:
    result = {"provider": p.name, "configured": p.configured, "ok": False, "latency_ms": None, "detail": ""}
    if not p.configured:
        result["detail"] = "not configured"
        return result
    t0 = time.monotonic()
    try:
        if p.kind == "claude_cli":
            exe = shutil.which(config.get("CLAUDE_CLI_PATH", "claude"))
            out = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=timeout)
            result["ok"] = out.returncode == 0
            result["detail"] = out.stdout.strip() or out.stderr.strip()
        elif p.kind == "ollama":
            models = ollama_models(p, timeout=min(timeout, 3.0), use_cache=False)
            if models:
                result["ok"] = True
                result["detail"] = f"{len(models)} local model(s)"
            else:
                # Distinguish "not running" from "running with no models".
                try:
                    from .providers import http_json
                    http_json("GET", p.base_url + "/api/version", timeout=2.0, provider="ollama")
                    result["detail"] = "running, but no chat models pulled (try `ollama pull qwen2.5-coder:7b`)"
                except errors.ProviderError:
                    result["detail"] = "not running / not installed"
        else:
            models = list_remote_models(p, timeout=timeout)
            result["ok"] = True
            result["detail"] = f"reachable, {len(models)} model(s) listed"
    except errors.ProviderError as e:
        result["detail"] = f"{e.kind}: {e.args[0]}"
        result["error_kind"] = e.kind
    except Exception as e:  # noqa: BLE001 - health checks must never crash the CLI
        result["detail"] = f"error: {e}"
    result["latency_ms"] = int((time.monotonic() - t0) * 1000)
    result["detail"] = redact(result["detail"])
    usage.record_health(p.name, result["ok"], result["latency_ms"], result["detail"])
    return result
