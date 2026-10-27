#!/usr/bin/env bash
# Install the `ai` command on macOS (also works on Linux).
#
#   ./install.sh                 link ~/.local/bin/ai, create ~/.config/ai-router/.env
#   ./install.sh --update-shell  also add ~/.local/bin to PATH in ~/.zshrc (backed up first)
#   ./install.sh --uninstall     remove the link and the ~/.zshrc block (backed up first)
#
# It never touches ~/.claude, ~/.claude.json or any Claude Code setting, and it
# never installs software without asking.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
BIN_DIR="$HOME/.local/bin"
CONF_DIR="$HOME/.config/ai-router"
RC="${AI_ROUTER_SHELL_RC:-$HOME/.zshrc}"
MARK_BEGIN="# >>> ai-router >>>"
MARK_END="# <<< ai-router <<<"
UPDATE_SHELL=0
UNINSTALL=0
ASSUME_NO=0

for arg in "$@"; do
  case "$arg" in
    --update-shell) UPDATE_SHELL=1 ;;
    --uninstall) UNINSTALL=1 ;;
    --no-prompt) ASSUME_NO=1 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 1 ;;
  esac
done

backup() {
  local file="$1"
  if [ -f "$file" ]; then
    local dest="$file.backup-$(date +%Y%m%d-%H%M%S)"
    cp -p "$file" "$dest"
    echo "backed up $file -> $dest"
  fi
}

remove_block() {
  [ -f "$RC" ] || return 0
  grep -qF "$MARK_BEGIN" "$RC" || return 0
  backup "$RC"
  awk -v b="$MARK_BEGIN" -v e="$MARK_END" '$0==b{skip=1;next} $0==e{skip=0;next} !skip' "$RC" > "$RC.tmp.$$"
  mv "$RC.tmp.$$" "$RC"
  echo "removed ai-router block from $RC"
}

if [ "$UNINSTALL" = 1 ]; then
  if [ -L "$BIN_DIR/ai" ]; then rm "$BIN_DIR/ai" && echo "removed $BIN_DIR/ai"; fi
  remove_block
  echo "Left $CONF_DIR (your keys) and ~/.local/share/ai-router (usage history) in place."
  exit 0
fi

# 1. Python
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 not found. Install it with: xcode-select --install   (or: brew install python)" >&2
  exit 1
fi
if ! python3 -c 'import sys; sys.exit(sys.version_info < (3, 9))'; then
  echo "python3 >= 3.9 required (found $(python3 --version 2>&1))." >&2
  exit 1
fi

# 2. Command
mkdir -p "$BIN_DIR"
chmod +x "$ROOT/bin/ai"
if [ -e "$BIN_DIR/ai" ] && [ ! -L "$BIN_DIR/ai" ]; then
  echo "$BIN_DIR/ai exists and is not a symlink; not overwriting it." >&2
  exit 1
fi
ln -sfn "$ROOT/bin/ai" "$BIN_DIR/ai"
echo "linked $BIN_DIR/ai -> $ROOT/bin/ai"

# 3. Config with secrets: private, outside the repo.
mkdir -p "$CONF_DIR"
chmod 700 "$CONF_DIR"
if [ ! -f "$CONF_DIR/.env" ]; then
  cp "$REPO/.env.example" "$CONF_DIR/.env"
  echo "created $CONF_DIR/.env from .env.example - add your own API keys there"
else
  echo "kept existing $CONF_DIR/.env"
fi
chmod 600 "$CONF_DIR/.env"

# 4. PATH
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    if [ "$UPDATE_SHELL" = 1 ]; then
      if ! grep -qF "$MARK_BEGIN" "$RC" 2>/dev/null; then
        backup "$RC"
        printf '\n%s\nexport PATH="$HOME/.local/bin:$PATH"\n%s\n' "$MARK_BEGIN" "$MARK_END" >> "$RC"
        echo "added ~/.local/bin to PATH in $RC (open a new terminal)"
      fi
    else
      echo "~/.local/bin is not on your PATH. Either re-run with --update-shell or add:"
      echo '    export PATH="$HOME/.local/bin:$PATH"'
    fi
    ;;
esac

# 5. Ollama (optional, local models)
if command -v ollama >/dev/null 2>&1; then
  echo "Ollama found: $(ollama --version 2>/dev/null | head -1)"
  ollama list 2>/dev/null || echo "Ollama is installed but not running: start it with 'ollama serve' (or open the Ollama app)."
else
  echo "Ollama is not installed. It provides free, private local models."
  echo "    install:  brew install ollama"
  echo "    then:     ollama serve   and   ollama pull qwen2.5-coder:7b"
  if [ "$ASSUME_NO" = 0 ] && [ -t 0 ] && command -v brew >/dev/null 2>&1; then
    read -r -p "Install Ollama with Homebrew now? [y/N] " answer
    case "$answer" in
      [yY]|[yY][eE][sS]) brew install ollama ;;
      *) echo "Skipped. Nothing was installed." ;;
    esac
  fi
fi

echo
echo "Done. Next: edit $CONF_DIR/.env, then run: ai status && ai health"
