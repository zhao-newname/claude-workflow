#!/bin/bash
set -e

# tsc-check Stop Hook
# Runs TypeScript type checking on affected repos at session end

# Get session ID from environment or use default
session_id="${CLAUDE_SESSION_ID:-default}"
cache_dir="$CLAUDE_PROJECT_DIR/.claude/tsc-cache/$session_id"

# Check if cache directory exists
if [[ ! -d "$cache_dir" ]]; then
    # No cache, nothing to check
    exit 0
fi

# Check if there are any affected repos
if [[ ! -f "$cache_dir/affected-repos.txt" ]]; then
    # No affected repos
    exit 0
fi

# Read affected repos
mapfile -t repos < "$cache_dir/affected-repos.txt"

if [[ ${#repos[@]} -eq 0 ]]; then
    exit 0
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 TypeScript Type Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Checking ${#repos[@]} affected repo(s)..."
echo ""

has_errors=false

# Check each affected repo
for repo in "${repos[@]}"; do
    repo_path="$CLAUDE_PROJECT_DIR/$repo"

    # Check if tsconfig.json exists
    if [[ ! -f "$repo_path/tsconfig.json" ]]; then
        continue
    fi

    echo "📦 $repo"

    # Determine tsc command
    tsc_cmd="npx tsc --noEmit"
    if [[ -f "$repo_path/tsconfig.app.json" ]]; then
        tsc_cmd="npx tsc --project tsconfig.app.json --noEmit"
    fi

    # Run tsc
    if (cd "$repo_path" && eval "$tsc_cmd" 2>&1); then
        echo "   ✅ No type errors"
    else
        echo "   ❌ Type errors found"
        has_errors=true
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [[ "$has_errors" == "true" ]]; then
    echo "⚠️  Type errors detected. Run tsc manually to see details."
    exit 1
else
    echo "✅ All type checks passed!"
    exit 0
fi
