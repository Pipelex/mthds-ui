#!/usr/bin/env bash
# PreToolUse hook: prevent edits to dependency lockfiles

set -euo pipefail

# Read the tool input JSON from stdin
input=$(cat)

# Extract file_path from the JSON
file_path=$(echo "$input" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')

# Exit silently if no file_path found
if [ -z "$file_path" ]; then
  exit 0
fi

# Get just the filename
filename=$(basename "$file_path")

# Block lockfile modifications
case "$filename" in
  package-lock.json|yarn.lock|pnpm-lock.yaml)
    cat <<'EOF'
{"decision":"block","reason":"Lockfiles are auto-generated. Run `npm install` (or equivalent) instead of editing them directly."}
EOF
    exit 0
    ;;
esac
