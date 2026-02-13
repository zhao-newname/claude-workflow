#!/bin/bash
set -e

# comprehensive-status Stop Hook
# Generates a comprehensive session summary at session end

# Get session ID from environment or use default
session_id="${CLAUDE_SESSION_ID:-default}"
cache_dir="$CLAUDE_PROJECT_DIR/.claude/tsc-cache/$session_id"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Session Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if cache directory exists
if [[ ! -d "$cache_dir" ]]; then
    echo "No session data found."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
fi

# Count edited files
if [[ -f "$cache_dir/edited-files.log" ]]; then
    file_count=$(wc -l < "$cache_dir/edited-files.log")
    echo "📝 Files Modified: $file_count"
    echo ""

    # Show edited files
    echo "Modified files:"
    while IFS=: read -r timestamp filepath repo; do
        echo "  • $filepath"
    done < "$cache_dir/edited-files.log"
    echo ""
fi

# Show affected repos
if [[ -f "$cache_dir/affected-repos.txt" ]]; then
    repo_count=$(wc -l < "$cache_dir/affected-repos.txt")
    echo "📦 Affected Repositories: $repo_count"
    echo ""

    mapfile -t repos < "$cache_dir/affected-repos.txt"
    for repo in "${repos[@]}"; do
        echo "  • $repo"
    done
    echo ""
fi

# Show recommended commands
if [[ -f "$cache_dir/commands.txt" ]]; then
    echo "🔧 Recommended Commands:"
    echo ""

    while IFS=: read -r repo type command; do
        case "$type" in
            tsc)
                echo "  TypeScript check ($repo):"
                echo "    $command"
                echo ""
                ;;
            build)
                echo "  Build ($repo):"
                echo "    $command"
                echo ""
                ;;
        esac
    done < "$cache_dir/commands.txt"
fi

# Git status
echo "📋 Git Status:"
echo ""
cd "$CLAUDE_PROJECT_DIR"
if git rev-parse --git-dir > /dev/null 2>&1; then
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo "  ⚠️  You have uncommitted changes"
        echo ""
        echo "  Modified files:"
        git diff --name-only HEAD | while read -r file; do
            echo "    • $file"
        done
        echo ""
        echo "  To commit:"
        echo "    git add ."
        echo "    git commit -m \"Your commit message\""
        echo ""
    else
        echo "  ✅ No uncommitted changes"
        echo ""
    fi

    # Check for unpushed commits
    current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [[ -n "$current_branch" ]] && [[ "$current_branch" != "HEAD" ]]; then
        upstream=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "")
        if [[ -n "$upstream" ]]; then
            unpushed=$(git log "$upstream..HEAD" --oneline 2>/dev/null | wc -l)
            if [[ $unpushed -gt 0 ]]; then
                echo "  ⚠️  You have $unpushed unpushed commit(s) on branch '$current_branch'"
                echo ""
                echo "  To push:"
                echo "    git push"
                echo ""
            fi
        fi
    fi
else
    echo "  Not a git repository"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Session complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
