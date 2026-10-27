"""Classify provider failures so the router can react to them legitimately."""
from __future__ import annotations

import re

# Kinds the router understands.
RATE_LIMIT = "rate_limit"      # 429: too many requests right now
QUOTA = "quota"                # daily/monthly quota, credits or billing exhausted
AUTH = "auth"                  # missing/invalid key, permission denied
CONTEXT = "context"            # prompt does not fit the model's context window
UNAVAILABLE = "unavailable"    # 5xx, overloaded, connection refused
TIMEOUT = "timeout"
NOT_FOUND = "not_found"        # unknown model / endpoint
BAD_REQUEST = "bad_request"
REFUSAL = "refusal"            # safety refusal / content filter: never re-routed
UNKNOWN = "unknown"

RETRYABLE = {UNAVAILABLE, TIMEOUT}

QUOTA_RE = re.compile(
    r"quota|insufficient[_ ]credits?|insufficient_quota|billing|credit balance|"
    r"per[ _-]?day|daily limit|requests per day|tokens per day|usage limit|"
    r"limit reached|payment required|spend limit|out of credits",
    re.I,
)
CONTEXT_RE = re.compile(
    r"context[_ ]length|context window|maximum context|too many tokens|"
    r"prompt is too long|input is too long|reduce the length|request too large|"
    r"tokens_limit_reached|max_tokens.*exceed|exceeds the (model'?s )?(context|maximum)",
    re.I,
)
RATE_RE = re.compile(r"rate[_ ]?limit|too many requests|resource_exhausted|throttl", re.I)
AUTH_RE = re.compile(r"invalid (api )?key|unauthori[sz]ed|authentication|permission denied|forbidden|not logged in|please run /login", re.I)
OVERLOAD_RE = re.compile(r"overloaded|temporarily unavailable|service unavailable|try again later", re.I)


class ProviderError(Exception):
    def __init__(self, kind: str, message: str, status: int | None = None,
                 retry_after: float | None = None, provider: str = "", model: str = ""):
        super().__init__(message)
        self.kind = kind
        self.status = status
        self.retry_after = retry_after
        self.provider = provider
        self.model = model

    @property
    def retryable(self) -> bool:
        return self.kind in RETRYABLE

    def __str__(self) -> str:
        where = f"{self.provider}/{self.model}" if self.model else self.provider
        code = f" HTTP {self.status}" if self.status else ""
        return f"[{self.kind}{code}] {where}: {self.args[0]}"


class NoProviderAvailable(Exception):
    def __init__(self, message: str, attempts: list[str] | None = None):
        super().__init__(message)
        self.attempts = attempts or []


def parse_retry_after(headers: dict | None) -> float | None:
    if not headers:
        return None
    lower = {k.lower(): v for k, v in headers.items()}
    for name in ("retry-after", "x-ratelimit-reset-requests", "x-ratelimit-reset-tokens"):
        value = lower.get(name)
        if not value:
            continue
        value = str(value).strip()
        try:
            return max(0.0, float(value))
        except ValueError:
            pass
        # Groq/OpenAI style durations such as "1m30s", "2.5s", "250ms".
        total, matched = 0.0, False
        for amount, unit in re.findall(r"([\d.]+)(ms|s|m|h)", value):
            matched = True
            total += float(amount) * {"ms": 0.001, "s": 1, "m": 60, "h": 3600}[unit]
        if matched:
            return total
    return None


def classify(status: int | None, body: str = "") -> str:
    body = body or ""
    if status == 429:
        return QUOTA if QUOTA_RE.search(body) else RATE_LIMIT
    if status == 402:
        return QUOTA
    if status in (401, 403):
        if QUOTA_RE.search(body):
            return QUOTA
        return AUTH
    if status == 413:
        return CONTEXT
    if status in (400, 422):
        if CONTEXT_RE.search(body):
            return CONTEXT
        if QUOTA_RE.search(body):
            return QUOTA
        return BAD_REQUEST
    if status == 404:
        return NOT_FOUND
    if status == 408:
        return TIMEOUT
    if status is not None and (status >= 500 or status == 529):
        return UNAVAILABLE
    # No HTTP status (CLI providers, in-body errors): fall back to text.
    if status is None:
        if CONTEXT_RE.search(body):
            return CONTEXT
        if QUOTA_RE.search(body):
            return QUOTA
        if RATE_RE.search(body):
            return RATE_LIMIT
        if AUTH_RE.search(body):
            return AUTH
        if OVERLOAD_RE.search(body):
            return UNAVAILABLE
    return UNKNOWN
