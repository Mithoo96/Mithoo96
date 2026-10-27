"""Environment loading. Secrets come only from the environment or .env files."""
from __future__ import annotations

import os
from pathlib import Path

PACKAGE_DIR = Path(__file__).resolve().parent
REPO_DIR = PACKAGE_DIR.parent


def env_files() -> list[Path]:
    """.env files in precedence order (first wins; real env beats all of them)."""
    files = []
    explicit = os.environ.get("AI_ROUTER_ENV_FILE")
    if explicit:
        files.append(Path(explicit).expanduser())
    files.append(Path.home() / ".config" / "ai-router" / ".env")
    files.append(REPO_DIR / ".env")
    return files


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return values
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        if line.startswith("export "):
            line = line[len("export "):]
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "'\"":
            value = value[1:-1]
        elif " #" in value:
            value = value.split(" #", 1)[0].rstrip()
        if key:
            values[key] = value
    return values


def load_env() -> None:
    """Populate os.environ from .env files without overriding existing values."""
    if os.environ.get("AI_ROUTER_NO_DOTENV") == "1":
        return
    for path in env_files():
        for key, value in parse_env_file(path).items():
            if key not in os.environ and value != "":
                os.environ[key] = value


def get(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def get_float(name: str, default: float) -> float:
    try:
        return float(get(name, str(default)))
    except ValueError:
        return default


def get_int(name: str, default: int) -> int:
    try:
        return int(get(name, str(default)))
    except ValueError:
        return default


def get_bool(name: str, default: bool = False) -> bool:
    value = get(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def data_dir() -> Path:
    path = Path(get("AI_ROUTER_HOME") or Path.home() / ".local" / "share" / "ai-router").expanduser()
    path.mkdir(parents=True, exist_ok=True)
    try:
        path.chmod(0o700)
    except OSError:
        pass
    return path
