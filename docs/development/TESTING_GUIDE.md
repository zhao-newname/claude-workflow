# Claude Workflow - Testing Guide

**Last Updated:** 2026-02-05

---

## Overview

This guide explains how to test the Claude Workflow (cw) system.

---

## Test Types

### 1. Unit Tests
- **Location:** `tests/`
- **Command:** `npm test`
- **Coverage:** Core modules (SkillManager, ConfigManager, HookManager, ContextManager)

### 2. End-to-End Tests
- **Location:** `tests/e2e/`
- **Command:** `./tests/e2e/claude-code-integration.sh`
- **Coverage:** Full workflow from init to Claude Code integration

---

## Running Tests

### Prerequisites

```bash
# Build the project
npm run build

# Install dependencies
npm install

# For hook tests, install tsx
npm install -g tsx
```

### Run Unit Tests

```bash
npm test
```

Expected: All 71 tests pass with coverage report.

### Run End-to-End Tests

```bash
./tests/e2e/claude-code-integration.sh
```

This script:
1. Creates test project in `/tmp/cw-e2e-test-*`
2. Runs `cw init`
3. Verifies files and directories
4. Tests skills listing and hook execution
5. Validates configuration files
6. Provides summary and cleanup option

Expected: 100% success rate.

---

## Manual Testing in Claude Code

### Test 1: Basic Integration

**Goal:** Verify cw works in a real project

**Steps:**

1. Create test project:
   ```bash
   mkdir ~/test-cw-project && cd ~/test-cw-project
   npm init -y
   ```

2. Initialize cw:
   ```bash
   cw init
   ```

3. Open in Claude Code:
   ```bash
   claude
   ```

4. Test skill activation:
   - Type: "help me review this code"
   - Expected: skill-activation-prompt suggests code-review skill

**Success Criteria:**
- cw init completes without errors
- Claude Code opens successfully
- Hooks trigger on prompts
- Skills suggested correctly

---

### Test 2: Dev Docs Workflow

**Goal:** Verify Dev Docs survives context reset

**Steps:**

1. Create dev docs:
   ```
   /dev-docs implement-user-authentication
   ```

2. Verify files:
   ```bash
   ls -la dev/active/implement-user-authentication/
   ```
   Expected: plan.md, context.md, tasks.md

3. Do work and update:
   - Create `src/auth.ts`
   - Implement basic auth logic
   - Run `/dev-docs-update`

4. Verify context updated:
   ```bash
   cat dev/active/implement-user-authentication/implement-user-authentication-context.md
   ```
   Expected: SESSION PROGRESS updated

5. Simulate context reset:
   - Exit and restart Claude Code

6. Resume work:
   - Say: "Read the dev docs for implement-user-authentication and continue"
   - Expected: Claude understands current state

**Success Criteria:**
- `/dev-docs` creates three files
- Files contain comprehensive information
- `/dev-docs-update` updates correctly
- After reset, Claude resumes work seamlessly

---

### Test 3: Skills Auto-Activation

**Goal:** Verify skills activate based on context

**Steps:**

1. Create files:
   ```bash
   touch src/api/users.ts tests/users.test.ts
   ```

2. Test backend skill:
   - Open `src/api/users.ts`
   - Type: "help me implement a REST endpoint"
   - Expected: backend-dev-guidelines suggested

3. Test code review:
   - Type: "review this code"
   - Expected: code-review skill suggested

**Success Criteria:**
- Skills activate based on keywords
- Skills activate based on file paths
- Suggestions are relevant

---

## Troubleshooting

### Hooks Don't Trigger

**Solutions:**

1. Check hooks registered:
   ```bash
   cat .claude/settings.json | grep -A 5 hooks
   ```

2. Verify hook files exist:
   ```bash
   ls -la .claude/hooks/
   ```

3. Test hook manually:
   ```bash
   echo '{"session_id":"test","cwd":"'$(pwd)'","prompt":"review code"}' | \
     tsx .claude/hooks/skill-activation-prompt.ts
   ```

4. Check Claude Code version:
   ```bash
   claude --version
   ```

---

### Skills Not Found

**Solutions:**

1. Check global skills:
   ```bash
   ls -la ~/.claude-workflow/.claude/skills/
   ```

2. Verify skills installed:
   ```bash
   cw skills list
   ```

3. Check skill-rules.json:
   ```bash
   cat .claude/skills/skill-rules.json
   ```

---

### Dev Docs Commands Not Available

**Solutions:**

1. Verify commands exist:
   ```bash
   ls -la .claude/commands/
   ```

2. Re-run init:
   ```bash
   cw init --force
   ```

---

## Test Checklist

### Installation
- [ ] `npm install -g claude-workflow` succeeds
- [ ] `cw --version` shows version
- [ ] `cw --help` shows commands

### Initialization
- [ ] `cw init` runs without errors
- [ ] `.claude/` directory created
- [ ] All subdirectories present
- [ ] Configuration files valid

### Skills
- [ ] `cw skills list` shows skills
- [ ] At least 1 skill available
- [ ] Skills activate in Claude Code

### Hooks
- [ ] Hooks registered in settings.json
- [ ] Hook files exist and executable
- [ ] Hooks trigger on prompts
- [ ] Skill suggestions appear

### Dev Docs
- [ ] `/dev-docs` command available
- [ ] Creates three-file structure
- [ ] Files contain comprehensive info
- [ ] `/dev-docs-update` updates files
- [ ] Context survives reset

### Claude Code Integration
- [ ] Project opens in Claude Code
- [ ] Hooks work in real sessions
- [ ] Skills auto-activate
- [ ] Dev docs workflow functional
- [ ] Context reset recovery works

---

## Performance Benchmarks

Expected performance:
- **cw init:** < 5 seconds
- **cw skills list:** < 1 second
- **Hook execution:** < 100ms
- **Skill activation:** < 200ms

Measure performance:
```bash
time cw init --yes
time cw skills list
```

---

## Reporting Issues

Include:

1. Test output:
   ```bash
   ./tests/e2e/claude-code-integration.sh > test-output.log 2>&1
   ```

2. Environment info:
   ```bash
   node --version
   npm --version
   cw --version
   claude --version
   ```

3. Configuration files:
   ```bash
   cat .claude/settings.json
   cat .claude/skills/skill-rules.json
   ```

4. Steps to reproduce
5. Expected vs actual behavior

---

**Last Updated:** 2026-02-05
