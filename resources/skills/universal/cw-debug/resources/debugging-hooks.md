# Debugging Hooks

How to debug cw hooks when they don't work as expected.

## Manual Hook Testing

### skill-activation-prompt

```bash
# Basic test
echo '{"session_id":"test","cwd":"'$(pwd)'","prompt":"review code"}' | \
  tsx .claude/hooks/skill-activation-prompt.ts

# Test with different prompts
echo '{"session_id":"test","cwd":"'$(pwd)'","prompt":"debug cw"}' | \
  tsx .claude/hooks/skill-activation-prompt.ts
```

### post-tool-use-tracker

```bash
# Test file tracking
echo '{"tool":"Edit","file":"src/test.ts"}' | \
  .claude/hooks/post-tool-use-tracker.sh
```

## Common Issues

### Hook Not Executing

**Check:**
1. File exists: `ls -la .claude/hooks/`
2. Permissions: `chmod +x .claude/hooks/*.sh`
3. tsx installed: `which tsx`

### Hook Errors

**Debug:**
```bash
# Run with error output
tsx .claude/hooks/skill-activation-prompt.ts 2>&1
```

### No Skill Suggestions

**Check:**
1. skill-rules.json exists
2. Keywords match
3. Hook output format correct

---

**Last Updated:** 2026-02-05
