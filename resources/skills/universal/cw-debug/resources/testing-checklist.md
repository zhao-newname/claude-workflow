# Testing Checklist

Complete testing procedures for Claude Workflow features.

---

## Hooks Testing

### skill-activation-prompt

```bash
# Test with various prompts
echo '{"session_id":"test","cwd":"'$(pwd)'","prompt":"review code"}' | \
  tsx .claude/hooks/skill-activation-prompt.ts

# Expected: Suggests code-review skill

echo '{"session_id":"test","cwd":"'$(pwd)'","prompt":"debug cw"}' | \
  tsx .claude/hooks/skill-activation-prompt.ts

# Expected: Suggests cw-debug skill
```

**Checklist:**
- [ ] Hook executes without errors
- [ ] Correct skills suggested for keywords
- [ ] Output format is correct
- [ ] Performance < 100ms

### post-tool-use-tracker

```bash
# Test file tracking
echo '{"tool":"Edit","file":"src/test.ts"}' | \
  .claude/hooks/post-tool-use-tracker.sh

# Expected: File tracking output
```

**Checklist:**
- [ ] Hook executes without errors
- [ ] Files tracked correctly
- [ ] Output format is correct

---

## Skills Testing

### List Skills

```bash
cw skills list
```

**Checklist:**
- [ ] All skills listed
- [ ] Correct categories (universal, tech-stack)
- [ ] No errors

### Show Skill

```bash
cw skills show cw-debug
```

**Checklist:**
- [ ] Skill content displayed
- [ ] Frontmatter parsed correctly
- [ ] No errors

### Skill Activation

**In Claude Code:**
```
debug cw
```

**Checklist:**
- [ ] cw-debug skill suggested
- [ ] Skill content available
- [ ] Activation is fast

---

## Dev Docs Testing

### Create Dev Docs

**In Claude Code:**
```
/dev-docs test-feature
```

**Checklist:**
- [ ] Three files created
- [ ] Files in dev/active/test-feature/
- [ ] plan.md has comprehensive plan
- [ ] context.md has SESSION PROGRESS
- [ ] tasks.md has checklist

### Update Dev Docs

**In Claude Code:**
```
/dev-docs-update
```

**Checklist:**
- [ ] context.md updated
- [ ] tasks.md updated
- [ ] Current state captured

### Context Reset Recovery

1. Create dev docs
2. Do some work
3. Update: `/dev-docs-update`
4. Exit Claude Code
5. Restart Claude Code
6. Tell Claude: "Read dev docs for test-feature and continue"

**Checklist:**
- [ ] Claude understands task
- [ ] No re-explanation needed
- [ ] Can continue immediately
- [ ] Recovery time < 2 min

---

## CLI Testing

### Init Command

```bash
cd /tmp && mkdir test-project && cd test-project
npm init -y
cw init --yes
```

**Checklist:**
- [ ] .claude/ directory created
- [ ] hooks/ directory exists
- [ ] skills/ directory exists
- [ ] commands/ directory exists
- [ ] settings.json valid
- [ ] skill-rules.json valid
- [ ] dev/ directory created
- [ ] dev/README.md exists

### Status Command

```bash
cw status
```

**Checklist:**
- [ ] Shows mode (single-agent)
- [ ] Lists active skills
- [ ] No errors

### Skills Command

```bash
cw skills list
cw skills show skill-developer
```

**Checklist:**
- [ ] Lists all skills
- [ ] Shows skill content
- [ ] No errors

---

## Configuration Testing

### Validate JSON

```bash
# Check settings.json
cat .claude/settings.json | jq .

# Check skill-rules.json
cat .claude/skills/skill-rules.json | jq .
```

**Checklist:**
- [ ] Both files parse without errors
- [ ] Hooks registered correctly
- [ ] Skills configured correctly

### Verify File Structure

```bash
tree .claude/
```

**Expected structure:**
```
.claude/
├── commands/
│   ├── dev-docs.md
│   └── dev-docs-update.md
├── hooks/
│   ├── skill-activation-prompt.ts
│   ├── post-tool-use-tracker.sh
│   └── package.json
├── skills/
│   └── skill-rules.json
└── settings.json
```

**Checklist:**
- [ ] All directories exist
- [ ] All files exist
- [ ] Permissions correct

---

## Automated Tests

### Unit Tests

```bash
npm test
```

**Checklist:**
- [ ] All 71 tests pass
- [ ] No errors or warnings
- [ ] Coverage > 80%

### End-to-End Tests

```bash
npm run build
./tests/e2e/claude-code-integration.sh
```

**Checklist:**
- [ ] All 21 tests pass
- [ ] 100% success rate
- [ ] No errors

---

## Performance Testing

### Timing

```bash
# Time init
time cw init --yes

# Time skills list
time cw skills list

# Time hook execution
time echo '{"session_id":"test","cwd":"'$(pwd)'","prompt":"test"}' | \
  tsx .claude/hooks/skill-activation-prompt.ts
```

**Expected:**
- cw init: < 5 seconds
- cw skills list: < 1 second
- Hook execution: < 100ms

---

## Regression Testing

After making changes, verify:

- [ ] All unit tests pass
- [ ] All e2e tests pass
- [ ] Hooks still trigger
- [ ] Skills still activate
- [ ] Dev docs still work
- [ ] CLI commands still function
- [ ] No new errors in logs

---

**Last Updated:** 2026-02-05
