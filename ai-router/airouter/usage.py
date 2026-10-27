"""Per-provider token/cost tracking, cooldowns and health history (SQLite)."""
from __future__ import annotations

import datetime as dt
import sqlite3
import time
from contextlib import contextmanager

from . import config
from .redact import redact

SCHEMA = """
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts REAL NOT NULL,
    day TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    mode TEXT,
    task TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    ok INTEGER NOT NULL,
    error_kind TEXT,
    estimated INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS requests_day ON requests(day, provider);
CREATE TABLE IF NOT EXISTS cooldowns (
    provider TEXT PRIMARY KEY,
    until REAL NOT NULL,
    reason TEXT
);
CREATE TABLE IF NOT EXISTS health (
    provider TEXT PRIMARY KEY,
    ts REAL NOT NULL,
    ok INTEGER NOT NULL,
    latency_ms INTEGER,
    detail TEXT
);
"""


def today() -> str:
    return dt.date.today().isoformat()


@contextmanager
def connect():
    path = config.data_dir() / "usage.db"
    conn = sqlite3.connect(str(path), timeout=10)
    try:
        path.chmod(0o600)
    except OSError:
        pass
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def record(provider: str, model: str, mode: str, task: str, input_tokens: int,
           output_tokens: int, cost: float, latency_ms: int, ok: bool,
           error_kind: str | None = None, estimated: bool = False) -> None:
    with connect() as c:
        c.execute(
            "INSERT INTO requests (ts, day, provider, model, mode, task, input_tokens, output_tokens,"
            " cost_usd, latency_ms, ok, error_kind, estimated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (time.time(), today(), provider, model, mode, task, input_tokens, output_tokens,
             cost, latency_ms, int(ok), error_kind, int(estimated)))


def set_cooldown(provider: str, seconds: float, reason: str) -> None:
    with connect() as c:
        c.execute("INSERT OR REPLACE INTO cooldowns (provider, until, reason) VALUES (?,?,?)",
                  (provider, time.time() + seconds, redact(reason)[:200]))


def cooldowns() -> dict[str, tuple[float, str]]:
    now = time.time()
    with connect() as c:
        c.execute("DELETE FROM cooldowns WHERE until <= ?", (now,))
        return {r["provider"]: (r["until"], r["reason"]) for r in c.execute("SELECT * FROM cooldowns")}


def clear_cooldown(provider: str | None = None) -> int:
    with connect() as c:
        if provider:
            return c.execute("DELETE FROM cooldowns WHERE provider = ?", (provider,)).rowcount
        return c.execute("DELETE FROM cooldowns").rowcount


def record_health(provider: str, ok: bool, latency_ms: int | None, detail: str) -> None:
    with connect() as c:
        c.execute("INSERT OR REPLACE INTO health (provider, ts, ok, latency_ms, detail) VALUES (?,?,?,?,?)",
                  (provider, time.time(), int(ok), latency_ms, redact(detail)[:200]))


def last_health() -> dict[str, dict]:
    with connect() as c:
        return {r["provider"]: dict(r) for r in c.execute("SELECT * FROM health")}


def spend_today(paid_only: bool = True) -> float:
    with connect() as c:
        row = c.execute("SELECT COALESCE(SUM(cost_usd),0) AS s FROM requests WHERE day = ?",
                        (today(),)).fetchone()
        return float(row["s"])


def daily_stats(days: int = 7) -> list[dict]:
    since = (dt.date.today() - dt.timedelta(days=days - 1)).isoformat()
    with connect() as c:
        rows = c.execute(
            "SELECT day, provider, COUNT(*) AS requests, SUM(ok) AS ok,"
            " SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) AS failed,"
            " SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens,"
            " ROUND(SUM(cost_usd), 6) AS cost_usd, CAST(AVG(CASE WHEN ok = 1 THEN latency_ms END) AS INTEGER)"
            " AS avg_latency_ms FROM requests WHERE day >= ? GROUP BY day, provider"
            " ORDER BY day DESC, provider", (since,)).fetchall()
        return [dict(r) for r in rows]


def model_stats(days: int = 7) -> list[dict]:
    since = (dt.date.today() - dt.timedelta(days=days - 1)).isoformat()
    with connect() as c:
        rows = c.execute(
            "SELECT provider, model, COUNT(*) AS requests, SUM(input_tokens) AS input_tokens,"
            " SUM(output_tokens) AS output_tokens, ROUND(SUM(cost_usd), 6) AS cost_usd"
            " FROM requests WHERE day >= ? AND ok = 1 GROUP BY provider, model"
            " ORDER BY requests DESC", (since,)).fetchall()
        return [dict(r) for r in rows]
