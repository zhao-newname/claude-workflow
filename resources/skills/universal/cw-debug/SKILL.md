---
name: cw-debug
description: Debug and test Claude Workflow (cw) features during development. Use when testing hooks, skills, dev docs, CLI commands, or troubleshooting cw issues. Provides systematic testing procedures, debugging commands, and common issue solutions.
version: 1.0.0
type: domain
enforcement: suggest
priority: medium
keywords:
  - cw debug
  - test cw
  - cw hooks
  - cw skills
  - dev docs
  - cw commands
  - troubleshoot cw
  - cw testing
intentPatterns:
  - (test|debug|troubleshoot).*?cw
  - cw.*?(test|debug|issue|problem)
  - (dev docs|hook|skill).*?(test|debug)
---


# CW Debug Skill

**Debug and test Claude Workflow features systematically.**

---

## Purpose

This skill helps developers test, debug, and validate Claude Workflow (cw) features while developing cw itself. It's "dogfooding" - using cw to develop cw.

**Use this skill to:**
- Test cw features in Claude Code
- Debug hooks and skills
- Validate dev docs workflow
- Troubleshoot cw issues
- Develop new cw features

---

## When to Use This Skill

**Automatically activates when you mention:**
- "debug cw"
- "test cw"
- "validate cw features"
- "troubleshoot cw"
- "cw not working"
- "hooks not triggering"
- "skills not activating"

**Use manually when:**
- Developing new cw features
- Testing changes to cw
- Investigating bug reports
- Onboarding new contributors

---

## Quick Testing Checklist

### Essential Tests
- [ ] **Hooks trigger correctly**
- [ ] **Skills activate as expected**
- [ ] **Dev docs workflow works**
- [ ] **CLI commands function**
- [ ] **Configuration is valid**

### After Making Changes
- [ ] Run unit tests: `npm test`
- [ ] Run e2e tests: `./tests/e2e/claude-code-integration.sh`
- [ ] Test in real Claude Code session
- [ ] Verify no regressions

---

## Core Debugging Techniques

### 1. Test Hooks Manually

**skill-activation-prompt hook:**
```bash
# Test with sample input
echo '{"session_id":"test","cwd":"'$(pwd)'","prompt":"review code"}' | \
  tsx .claude/hooks/skill-activation-prompt.ts

# Expected: Skill suggestions appear
# If not: Check hook file exists, tsx is installed
```

**post-tool-use-tracker hook:**
```bash
# Test with sample input
echo '{"tool":"Edit","file":"src/test.ts"}' | \
  .claude/hooks/post-tool-use-tracker.sh

# Expected: File tracking output
# If not: Check hook file exists, is executable
```

### 2. Verify Skills Are Loaded

```bash
# List all available skills
cw skills list

# Show specific skill
cw skills show cw-debug

# Check skill rules
cat .claude/skills/skill-rules.json | jq .
```

### 3. Test Dev Docs Workflow

```bash
# In Claude Code, create test dev docs
/dev-docs test-feature-name

# Verify files created
ls -la dev/active/test-feature-name/

# Check file content
cat dev/active/test-feature-name/test-feature-name-plan.md

# Test update command
/dev-docs-update

# Verify context updated
grep "SESSION PROGRESS" dev/active/test-feature-name/test-feature-name-context.md
```

### 4. Validate CLI Commands

```bash
# Test init
cd /tmp/test-project && npm init -y
cw init --yes
ls -la .claude/

# Test status
cw status

# Test skills
cw skills list
cw skills show skill-developer

# Clean up
cd ~ && rm -rf /tmp/test-project
```

### 5. Check Configuration Files

```bash
# Validate settings.json
cat .claude/settings.json | jq .
# Should parse without errors

# Validate skill-rules.json
cat .claude/skills/skill-rules.json | jq .
# Should parse without errors

# Check hooks are registered
cat .claude/settings.json | jq '.hooks'
```

---

## Common Commands Reference

### Testing
```bash
npm test                    # Run all tests
npm run build               # Build project
./tests/e2e/claude-code-integration.sh  # E2E tests
```

### Debugging
```bash
cw --version                # Check version
cw skills list              # List skills
cat .claude/settings.json   # Check config
```

**See [Testing Checklist](resources/testing-checklist.md) for complete command reference.**

---

## Resource Files

Detailed guides for specific debugging areas:

- **[Testing Checklist](resources/testing-checklist.md)** - Complete testing procedures
- **[Debugging Hooks](resources/debugging-hooks.md)** - Hook troubleshooting
- **[Validating Skills](resources/validating-skills.md)** - Skill verification
- **[Dev Docs Testing](resources/dev-docs-testing.md)** - Dev docs validation
- **[Common Issues](resources/common-issues.md)** - Known problems and solutions

---

## Typical Debugging Workflow

### 1. Identify the Issue

**Ask:**
- What's not working?
- What did you expect to happen?
- What actually happened?
- Can you reproduce it?

### 2. Gather Information

```bash
# Check versions
cw --version
node --version
claude --version

# Check configuration
cat .claude/settings.json
cat .claude/skills/skill-rules.json

# Check logs (if available)
cat .claude/logs/*.log
```

### 3. Test Components

**Test hooks:**
```bash
# Manual hook test
echo '{"session_id":"test","cwd":"'$(pwd)'","prompt":"test"}' | \
  tsx .claude/hooks/skill-activation-prompt.ts
```

**Test skills:**
```bash
# List skills
cw skills list

# Verify skill content
cw skills show cw-debug
```

**Test CLI:**
```bash
# Test in clean environment
cd /tmp && mkdir test && cd test
npm init -y
cw init --yes
```

### 4. Fix and Verify

- Make the fix
- Run tests: `npm test`
- Test manually in Claude Code
- Verify no regressions

### 5. Document

- Update code comments
- Update documentation
- Add test case if needed
- Update CHANGELOG

---

## Testing in Claude Code

### Quick Test

```bash
# Create test project
mkdir ~/cw-test-project && cd ~/cw-test-project
npm init -y && cw init --yes

# Open in Claude Code
claude
```

**Test scenarios:**
1. Type "review code" → Verify skill suggestions
2. Run `/dev-docs test` → Verify files created
3. Exit and restart → Verify context recovery

**See [Dev Docs Testing](resources/dev-docs-testing.md) for detailed test scenarios.**

---

## Common Issues and Quick Fixes

### Issue: Hooks Don't Trigger

**Quick check:**
```bash
# 1. Verify hooks exist
ls -la .claude/hooks/

# 2. Check permissions
chmod +x .claude/hooks/*.sh

# 3. Test manually
echo '{"session_id":"test","cwd":"'$(pwd)'","prompt":"test"}' | \
  tsx .claude/hooks/skill-activation-prompt.ts
```

**Solution:** See [Debugging Hooks](resources/debugging-hooks.md)

### Issue: Skills Not Found

**Quick check:**
```bash
# 1. List skills
cw skills list

# 2. Check global skills
ls -la ~/.claude-workflow/.claude/skills/

# 3. Verify skill-rules.json
cat .claude/skills/skill-rules.json
```

**Solution:** See [Validating Skills](resources/validating-skills.md)

### Issue: Dev Docs Commands Not Available

**Quick check:**
```bash
# 1. Verify commands exist
ls -la .claude/commands/

# 2. Check command files
cat .claude/commands/dev-docs.md
```

**Solution:** Run `cw init --force` to reinstall

### Issue: Tests Failing

**Quick check:**
```bash
# 1. Run tests with verbose output
npm test -- --reporter=verbose

# 2. Run specific failing test
npm test -- path/to/failing/test.ts

# 3. Check for build issues
npm run build
```

**Solution:** See test output for specific errors

---

## Best Practices

### 1. Test After Every Change

```bash
# Quick validation
npm test && npm run build && ./tests/e2e/claude-code-integration.sh
```

### 2. Use Dev Docs for Planning

```
# Before implementing a feature
/dev-docs implement-new-feature

# Creates plan, context, tasks
# Helps organize work
```

### 3. Test in Real Claude Code

- Don't just test CLI
- Open Claude Code and test interactively
- Verify hooks and skills work
- Test context reset recovery

### 4. Document Issues

- Add to common-issues.md
- Create test case
- Update troubleshooting guide

### 5. Keep Skills Updated

- Update cw-debug as you learn
- Add new debugging techniques
- Document new issues

---

## For Contributors

### Quick Start

```bash
git clone <repo-url> && cd claude-workflow
npm install && npm run build && npm test
```

### Development Workflow

1. Create dev docs: `/dev-docs your-feature`
2. Make changes
3. Test: `npm test && ./tests/e2e/claude-code-integration.sh`
4. Test in Claude Code
5. Commit

**See [Testing Checklist](resources/testing-checklist.md) for complete contributor guide.**

---

## Next Steps

1. **Read the resource files** for detailed debugging guides
2. **Test cw features** using this skill
3. **Report issues** you find
4. **Contribute improvements** to this skill

---

**Remember:** This skill is for debugging cw itself. For general development, use other skills like skill-developer, code-review, etc.

---

**Last Updated:** 2026-02-05
**Version:** 1.0.0
