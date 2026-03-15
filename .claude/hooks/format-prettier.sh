#!/usr/bin/env bash
# PostToolUse hook: auto-format files with Prettier after Edit/Write

set -euo pipefail

# Read the tool input JSON from stdin
input=$(cat)

# Extract file_path from the JSON
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

# Exit silently if no file_path found
if [ -z "$file_path" ]; then
  exit 0
fi

# Only format files Prettier can handle
case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.css|*.json|*.md|*.html|*.yaml|*.yml)
    npx prettier --write "$file_path" 2>/dev/null || true
    ;;
esac
