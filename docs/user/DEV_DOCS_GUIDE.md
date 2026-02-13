# Dev Docs Usage Guide

**Master the Dev Docs pattern for persistent AI context.**

---

## Table of Contents

- [What is Dev Docs?](#what-is-dev-docs)
- [When to Use](#when-to-use)
- [The Three-File Pattern](#the-three-file-pattern)
- [Workflow](#workflow)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## What is Dev Docs?

**Dev Docs** maintains project context across Claude Code sessions and context resets.

### The Problem

When Claude Code hits context limits, everything is lost:
- Implementation decisions
- Key files and purposes
- Task progress
- Technical constraints
- Why certain approaches were chosen

After reset, Claude rediscovers everything, wasting 10-30 minutes.

### The Solution

A **three-file structure** captures everything needed to resume:

```
dev/active/your-task/
├── your-task-plan.md      # Strategic plan
├── your-task-context.md   # Key decisions & files
└── your-task-tasks.md     # Checklist format
```

These files survive context resets—Claude reads them to resume instantly.

---

## When to Use

### Use Dev Docs For:

- Complex multi-day tasks
- Features with many moving parts
- Tasks spanning multiple sessions
- Work requiring careful planning
- Refactoring large systems
- Anything taking > 2 hours

### Skip Dev Docs For:

- Simple bug fixes (< 30 min)
- Single-file changes
- Quick updates
- Trivial modifications

**Rule of thumb:** If it takes > 2 hours or spans multiple sessions, use Dev Docs.

---

## The Three-File Pattern

### 1. plan.md - Strategic Overview

**Purpose:** High-level implementation strategy

**Contains:**
- Executive summary
- Current state analysis
- Proposed future state
- Implementation phases
- Detailed tasks with acceptance criteria
- Risk assessment
- Success metrics

**When to update:** At start or when scope changes

**Example:**
```markdown
# Feature Name - Implementation Plan

## Executive Summary
What we're building and why

## Implementation Phases

### Phase 1: Infrastructure (2 hours)
- Task 1.1: Set up database schema
  - Acceptance: Schema compiles, relationships correct
- Task 1.2: Create service structure
  - Acceptance: All directories created
```

---

### 2. context.md - Current State

**Purpose:** Key information for resuming work

**Contains:**
- **SESSION PROGRESS** (most important!)
  - ✅ COMPLETED
  - 🟡 IN PROGRESS
  - ⏳ NOT STARTED
  - ⚠️ BLOCKERS
- Key files and purposes
- Important decisions
- Technical constraints
- Quick resume instructions

**When to update:** FREQUENTLY - after major decisions, completions, or discoveries

**Example:**
```markdown
# Feature Name - Context

## SESSION PROGRESS (2026-02-05)

### ✅ COMPLETED
- Database schema created (User, Post, Comment models)
- PostController implemented with BaseController pattern

### 🟡 IN PROGRESS
- Creating PostService with business logic
- File: src/services/postService.ts

### ⚠️ BLOCKERS
- Need to decide on caching strategy

## Key Files

**src/controllers/PostController.ts**
- Extends BaseController
- Handles HTTP requests for posts

**src/services/postService.ts** (IN PROGRESS)
- Business logic for post operations
- Next: Add caching

## Quick Resume
To continue:
1. Read this file
2. Continue implementing PostService.createPost()
```

**CRITICAL:** Update SESSION PROGRESS every time significant work is done!

---

### 3. tasks.md - Actionable Checklist

**Purpose:** Track progress with checkboxes

**Contains:**
- Phases broken down by sections
- Tasks in checkbox format
- Status indicators (✅/🟡/⏳)
- Acceptance criteria
- Effort estimates (S/M/L/XL)

**When to update:** After completing tasks or discovering new ones

**Example:**
```markdown
# Feature Name - Task Checklist

## Phase 1: Setup ✅ COMPLETE
- [x] Create database schema
- [x] Set up controllers
- [x] Configure Sentry

## Phase 2: Implementation 🟡 IN PROGRESS
- [x] Create PostController
- [ ] Create PostService (IN PROGRESS)
- [ ] Create PostRepository
- [ ] Add validation with Zod

## Phase 3: Testing ⏳ NOT STARTED
- [ ] Unit tests for service
- [ ] Integration tests
```

---

## Workflow

### Starting a New Task

1. Create Dev Docs:
   ```
   /dev-docs refactor-authentication-system
   ```

2. Review the plan and adjust if needed

3. Begin work:
   - Follow the plan
   - Update context.md frequently
   - Check off tasks in tasks.md

### During Implementation

1. Refer to plan.md for overall strategy
2. Update context.md frequently:
   - Mark completed work
   - Note decisions
   - Add blockers
   - Update SESSION PROGRESS
3. Check off tasks in tasks.md
4. Add new tasks as discovered

### Before Context Limit

```
/dev-docs-update
```

Updates context.md and tasks.md with current state.

### After Context Reset

1. Claude reads all three files
2. Understands complete state in seconds
3. Resumes exactly where you left off

No need to explain what you were doing—it's all documented!

---

## Best Practices

### 1. Update Context Frequently

**Bad:** Update only at end of session
**Good:** Update after each major milestone

SESSION PROGRESS should always reflect reality:
```markdown
## SESSION PROGRESS (YYYY-MM-DD)

### ✅ COMPLETED (list everything done)
### 🟡 IN PROGRESS (what you're working on RIGHT NOW)
### ⚠️ BLOCKERS (what's preventing progress)
```

### 2. Make Tasks Actionable

**Bad:** "Fix the authentication"
**Good:** "Implement JWT token validation in AuthMiddleware.ts (Acceptance: Tokens validated, errors to Sentry)"

Include:
- Specific file names
- Clear acceptance criteria
- Dependencies on other tasks

### 3. Keep Plan Current

If scope changes:
- Update the plan
- Add new phases
- Adjust timeline estimates
- Note why scope changed

### 4. Use Clear Status Indicators

- ✅ **COMPLETE** - Done and verified
- 🟡 **IN PROGRESS** - Currently working on
- ⏳ **NOT STARTED** - Planned but not begun
- ⚠️ **BLOCKED** - Cannot proceed

### 5. Document Decisions

Every important decision in context.md:
```markdown
## Important Decisions

### Decision 1: Use JWT for Authentication
**Date:** 2026-02-05
**Rationale:** Better scalability than sessions
**Impact:** Need to implement token refresh logic
```

---

## Troubleshooting

### Context Reset Doesn't Work

**Solutions:**

1. Verify files complete:
   ```bash
   cat dev/active/*/\*-context.md
   ```

2. Check SESSION PROGRESS current:
   - Should reflect latest work
   - Should have clear next steps

3. Explicitly tell Claude:
   ```
   Read all files in dev/active/[task-name]/ and tell me the current status
   ```

4. Update before reset:
   ```
   /dev-docs-update
   ```

### Files Are Too Large

**Solutions:**

1. Break into smaller tasks:
   - One dev docs per feature/phase
   - Archive completed tasks

2. Use resources/ directory:
   ```
   your-task/
   ├── your-task-plan.md (< 500 lines)
   ├── your-task-context.md (< 300 lines)
   ├── your-task-tasks.md (< 300 lines)
   └── resources/
       ├── detailed-design.md
       └── api-spec.md
   ```

3. Keep main files concise:
   - Summary in main file
   - Details in resources/

### Forgetting to Update

**Solutions:**

1. Set reminders:
   - Update after each major milestone
   - Update before breaks
   - Update before context limit

2. Use /dev-docs-update:
   - Quick command to update
   - Prompts for current state

3. Make it a habit:
   - Update = save your work
   - Like committing code

---

## Summary

**Dev Docs is simple but powerful:**

1. **Three files:** plan, context, tasks
2. **Update frequently:** Especially context.md
3. **Use for complex tasks:** > 2 hours or multi-session
4. **Trust the process:** It works!

**Time saved:** 8-28 minutes per context reset

**Result:** Seamless continuation of work, no re-explanation needed

---

## Next Steps

1. **Try it:** Create dev docs for your next complex task
2. **Update frequently:** Make it a habit
3. **See it work:** Experience context reset recovery

---

**For more information:**
- [README](../../README.md) - Project overview
- [Claude Code Integration](../integration/CLAUDE_CODE_INTEGRATION.md) - Setup guide
- [Testing Guide](../development/TESTING_GUIDE.md) - Validation

---

**Last Updated:** 2026-02-05
