"""Keep secrets out of every string the router prints, logs or stores."""
from __future__ import annotations

import os
import re

SECRET_NAME = re.compile(r"(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL)", re.I)

SECRET_PATTERNS = [
    re.compile(r"sk-ant-[A-Za-z0-9_\-]{8,}"),
    re.compile(r"sk-or-[A-Za-z0-9_\-]{8,}"),
    re.compile(r"sk-[A-Za-z0-9_\-]{20,}"),
    re.compile(r"gsk_[A-Za-z0-9]{16,}"),
    re.compile(r"AIza[0-9A-Za-z_\-]{30,}"),
    re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._\-]{12,}"),
    re.compile(r"(?i)(x-api-key[\"']?\s*[:=]\s*[\"']?)[A-Za-z0-9._\-]{12,}"),
    re.compile(r"(?i)([?&]key=)[A-Za-z0-9._\-]{12,}"),
]

REDACTED = "[REDACTED]"


def secret_values() -> list[str]:
    values = []
    for name, value in os.environ.items():
        if SECRET_NAME.search(name) and value and len(value) >= 8:
            values.append(value)
    return sorted(set(values), key=len, reverse=True)


def redact(text: object) -> str:
    s = "" if text is None else str(text)
    for value in secret_values():
        if value in s:
            s = s.replace(value, REDACTED)
    for pattern in SECRET_PATTERNS:
        if pattern.groups:
            s = pattern.sub(lambda m: m.group(1) + REDACTED, s)
        else:
            s = pattern.sub(REDACTED, s)
    return s


def describe_key(env_name: str | None) -> str:
    """Say whether a key is set without revealing any of it."""
    if not env_name:
        return "not required"
    return f"{env_name} set" if os.environ.get(env_name) else f"{env_name} missing"
