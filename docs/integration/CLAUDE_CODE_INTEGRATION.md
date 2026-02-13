# Claude Code Integration Guide

**Complete guide to using Claude Workflow with Claude Code.**

---

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Initial Setup](#initial-setup)
- [Using Dev Docs](#using-dev-docs)
- [Skills System](#skills-system)
- [Troubleshooting](#troubleshooting)

---

## Overview

**Claude Workflow (cw)** integrates with Claude Code to provide:
- **Dev Docs**: Persistent context across resets
- **Skills**: Auto-activated knowledge based on context
- **Hooks**: Automated suggestions and tracking

---

## Installation

### Prerequisites

- Node.js >= 18.0.0
- Claude Code CLI installed
- npm/yarn/pnpm

### Install cw

```bash
npm install -g claude-workflow
```

Verify:
```bash
cw --version
```

---

## Initial Setup

### 1. Initialize Your Project

```bash
cd your-project
cw init
```

Interactive mode guides you through setup. For non-interactive:
```bash
cw init --yes
```

### 2. Verify Setup

```bash
# Check files created
ls -la .claude/

# Check status
cw status
```

### 3. Open in Claude Code

```bash
claude
```

---

## Using Dev Docs

### Creating Dev Docs

In Claude Code:
```
/dev-docs implement-user-authentication
```

Claude creates three files:
- `implement-user-authentication-plan.md`
- `implement-user-authentication-context.md`
- `implement-user-authentication-tasks.md`

### Working with Dev Docs

```
# Start task
/dev-docs add-payment-integration

# Work on implementation...

# Update progress
/dev-docs-update

# Context resets...

# Resume work
"Read the dev docs for add-payment-integration and continue"
```

### Updating Dev Docs

Use `/dev-docs-update` to capture current state:
- Updates context.md with SESSION PROGRESS
- Marks completed tasks in tasks.md
- Captures current state

Update after major milestones, before breaks, or before context limits.

### Resuming After Context Reset

Method 1:
```
Read all files in dev/active/your-task/ and tell me the current status
```

Method 2:
```
Continue with the authentication implementation
```

Claude automatically reads dev docs and resumes.

---

## Skills System

### What Are Skills?

Skills are knowledge modules automatically activated based on:
- Keywords in prompts
- File paths being worked on
- Content patterns in files

### Viewing Skills

```bash
# List all skills
cw skills list

# View skill details
cw skills show skill-developer
```

### How Skills Activate

**Keyword-based:**
```
Help me review this code
```
→ Suggests `code-review` skill

**File-based:**
Editing `src/api/users.ts`:
```
Help me implement this endpoint
```
→ Suggests `backend-dev-guidelines` skill

### Adding Skills

```bash
# From global repository
cw skills add testing

# From local directory
cw skills add /path/to/my-skill

# From GitHub
cw skills add https://github.com/user/repo/skill-name
```

---

## Troubleshooting

### Hooks Don't Trigger

**Solutions:**

1. Check hooks registered:
   ```bash
   cat .claude/settings.json | grep -A 5 hooks
   ```

2. Verify hook files:
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

5. Reinstall hooks:
   ```bash
   cw init --force
   ```

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

3. Install missing skills:
   ```bash
   cw skills add skill-developer
   ```

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

3. Check Claude Code recognizes commands:
   ```
   /help
   ```

### Context Reset Doesn't Work

**Solutions:**

1. Verify files complete:
   ```bash
   cat dev/active/*/\*-context.md
   ```

2. Check SESSION PROGRESS current:
   ```bash
   grep -A 10 "SESSION PROGRESS" dev/active/*/\*-context.md
   ```

3. Explicitly tell Claude:
   ```
   Read all files in dev/active/[task-name]/ and tell me the current status
   ```

4. Update before reset:
   ```
   /dev-docs-update
   ```

---

## Best Practices

### 1. Keep Dev Docs Updated

Update frequently, especially context.md:
```
/dev-docs-update
```

### 2. Use Descriptive Task Names

Good: `/dev-docs fix-authentication-token-expiry`
Bad: `/dev-docs fix-bug`

### 3. Review Skill Suggestions

When skills suggested, review them:
```
Show me the code-review skill
```

### 4. Customize for Your Team

Add project-specific skills:
```bash
mkdir -p .claude/skills/team-conventions
# Create SKILL.md with team conventions
```

### 5. Test After Setup

```
# In Claude Code
Help me review this code
# Should see skill suggestions
```

---

## Quick Reference

### Commands

```bash
# Initialize
cw init

# Status
cw status

# Skills
cw skills list
cw skills show <skill-name>
cw skills add <skill-name>

# Update
cw update
```

### Slash Commands (in Claude Code)

```
# Dev Docs
/dev-docs <task-description>
/dev-docs-update

# Help
/help
```

### File Locations

```
.claude/
├── commands/           # Slash commands
├── hooks/              # Automation hooks
├── skills/             # Project skills
└── settings.json       # Configuration

dev/
├── README.md           # Dev Docs guide
└── active/             # Active tasks
    └── your-task/
        ├── your-task-plan.md
        ├── your-task-context.md
        └── your-task-tasks.md
```

---

## Next Steps

1. Initialize: `cw init`
2. Open Claude Code: `claude`
3. Create dev docs: `/dev-docs your-task`
4. Experience the workflow

---

## Support

- [Documentation](../user/)
- [GitHub Issues](https://github.com/zhao-newname/claude-workflow/issues)
- [Testing Guide](../development/TESTING_GUIDE.md)
- [Dev Docs Guide](../user/DEV_DOCS_GUIDE.md)

---

**Last Updated:** 2026-02-05
