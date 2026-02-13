#!/bin/bash
set -e

# Read input
input=$(cat)

# Extract cwd using node (since jq might not be available)
project_dir=$(echo "$input" | node -e "
const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
console.log(data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
")

# Change to hooks directory
cd "$project_dir/.claude/hooks"

# Pass input to TypeScript hook
echo "$input" | npx tsx skill-activation-prompt.ts
