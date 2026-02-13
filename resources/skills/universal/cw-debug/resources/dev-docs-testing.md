# Dev Docs Testing

How to test the Dev Docs workflow.

## Test /dev-docs Command

**In Claude Code:**
```
/dev-docs test-feature
```

**Verify:**
1. Three files created
2. Files in dev/active/test-feature/
3. plan.md has comprehensive content
4. context.md has SESSION PROGRESS
5. tasks.md has checklist

## Test /dev-docs-update Command

**In Claude Code:**
```
/dev-docs-update
```

**Verify:**
1. context.md updated
2. tasks.md updated
3. Current state captured

## Test Context Reset Recovery

**Steps:**
1. Create dev docs: `/dev-docs test-task`
2. Do some work
3. Update: `/dev-docs-update`
4. Exit Claude Code
5. Restart Claude Code
6. Resume: "Read dev docs for test-task and continue"

**Verify:**
- Claude understands task
- No re-explanation needed
- Can continue immediately
- Recovery < 2 minutes

## Common Issues

### Commands Not Found

**Fix:** Run `cw init --force`

### Files Not Created

**Check:**
1. Commands directory exists
2. Command files have correct format
3. Claude Code recognizes commands

---

**Last Updated:** 2026-02-05
