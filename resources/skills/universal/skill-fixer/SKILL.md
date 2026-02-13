---
name: skill-fixer
description: Fix and validate SKILL.md files to meet CW requirements. Use when a skill's frontmatter is invalid, incomplete, or doesn't match expected format. Ensures skills work correctly with cw skills add command.
type: domain
enforcement: suggest
priority: high
keywords:
  - fix skill
  - repair skill
  - skill format
  - skill frontmatter
  - skill validation
  - invalid skill
intentPatterns:
  - (fix|repair|validate).*?skill
  - skill.*?(format|frontmatter|invalid)
  - skill.*?not.*?(work|valid|correct)
pathPatterns:
  - "**/.claude/skills/*/SKILL.md"
---

# Skill Fixer

## Purpose

Fix and validate SKILL.md files to ensure they meet CW requirements. This skill helps you:
- Validate frontmatter format and completeness
- Fix common formatting issues
- Ensure skills work with `cw skills add` command
- Maintain consistency across skills

## When to Use

Use this skill when:
- A skill's frontmatter is invalid or incomplete
- `cw skills add` fails due to frontmatter issues
- You need to validate a skill before adding it
- A skill doesn't trigger correctly (missing keywords/patterns)

## Core Principle

**First Priority: Only fix SKILL.md itself**
- Do NOT modify skill-rules.json
- Do NOT modify other files
- Only ensure SKILL.md frontmatter is correct and complete

**Bilingual Support (Critical)**
- Always add both English and Chinese keywords
- Include Chinese patterns in intentPatterns
- Support mixed Chinese-English usage (e.g., "代码 review", "code 审查")
- This ensures skills work for bilingual development teams

## Required Frontmatter Fields

### Mandatory Fields
```yaml
name: skill-name              # String, lowercase, hyphens
description: Brief description # String, max 1024 chars
```

### Recommended Fields
```yaml
type: domain                  # domain | guardrail
enforcement: suggest          # suggest | block | warn
priority: medium              # critical | high | medium | low
```

### Trigger Fields (Optional but Recommended)
```yaml
keywords:                     # Array of strings (include both English and Chinese)
  - keyword1
  - keyword2
  - 中文关键词1
  - 中文关键词2

intentPatterns:               # Array of regex patterns (support both languages)
  - "(action).*?pattern"
  - "(动作|操作).*?模式"

pathPatterns:                 # Array of glob patterns
  - "src/**/*.ts"

contentPatterns:              # Array of regex patterns
  - "import.*?something"

pathExclusions:               # Array of glob patterns
  - "**/*.test.ts"
```

**Important:** Always include both English and Chinese keywords/patterns to support bilingual users.

## Common Issues and Fixes

### Issue 1: Missing Required Fields

**Problem:**
```yaml
---
name: my-skill
# Missing description
---
```

**Fix:**
```yaml
---
name: my-skill
description: Add a clear, concise description here
---
```

### Issue 2: Wrong Field Types

**Problem:**
```yaml
---
keywords: "single-string"  # Should be array
---
```

**Fix:**
```yaml
---
keywords:
  - keyword1
  - keyword2
---
```

### Issue 3: Invalid Enum Values

**Problem:**
```yaml
---
type: custom              # Invalid value
enforcement: required     # Invalid value
---
```

**Fix:**
```yaml
---
type: domain              # Valid: domain | guardrail
enforcement: suggest      # Valid: suggest | block | warn
---
```

### Issue 4: Missing Trigger Configuration

**Problem:**
```yaml
---
name: my-skill
description: My skill
# No triggers - skill won't auto-activate
---
```

**Fix (with bilingual support):**
```yaml
---
name: my-skill
description: My skill
keywords:
  - relevant-keyword
  - 相关关键词
intentPatterns:
  - "(action).*?pattern"
  - "(动作|操作).*?模式"
---
```

**Note:** Always add both English and Chinese keywords to ensure the skill works for bilingual users.

## Validation Checklist

Before considering a SKILL.md fixed, verify:

- [ ] Frontmatter uses valid YAML syntax
- [ ] `name` field exists and is lowercase with hyphens
- [ ] `description` field exists and is clear
- [ ] `type` is either "domain" or "guardrail"
- [ ] `enforcement` is "suggest", "block", or "warn"
- [ ] `priority` is "critical", "high", "medium", or "low"
- [ ] If triggers exist, they are properly formatted arrays
- [ ] `keywords` are relevant and specific
- [ ] **`keywords` include both English and Chinese terms**
- [ ] **`intentPatterns` support both English and Chinese patterns**
- [ ] `intentPatterns` use valid regex
- [ ] `pathPatterns` use valid glob syntax
- [ ] No extra/unknown fields in frontmatter

## Step-by-Step Fix Process

### 1. Read the SKILL.md
```bash
# Read the file to understand current state
cat .claude/skills/skill-name/SKILL.md
```

### 2. Identify Issues
- Check frontmatter syntax
- Verify required fields
- Validate field types
- Check for missing triggers

### 3. Fix Frontmatter
- Add missing required fields
- Correct field types
- Fix enum values
- Add/improve triggers

### 4. Preserve Body Content
**IMPORTANT:** Never modify the content below the frontmatter separator (`---`)

### 5. Validate the Fix
- Ensure YAML is valid
- Check all fields are correct
- Verify triggers are meaningful

## Examples

### Example 1: Complete Fix (with Bilingual Keywords)

**Before:**
```yaml
---
name: backend-guidelines
# Missing description, type, enforcement
keywords: backend
---
```

**After:**
```yaml
---
name: backend-guidelines
description: Backend development guidelines for Node.js/Express
type: domain
enforcement: suggest
priority: medium
keywords:
  - backend
  - api
  - express
  - 后端
  - 接口
  - API
intentPatterns:
  - "(create|add).*?(route|api|endpoint)"
  - "(创建|添加|新增).*(路由|接口|端点|API)"
---
```

### Example 2: Add Missing Triggers (Bilingual)

**Before:**
```yaml
---
name: code-review
description: Code review best practices
type: domain
enforcement: suggest
priority: high
# No triggers
---
```

**After:**
```yaml
---
name: code-review
description: Code review best practices
type: domain
enforcement: suggest
priority: high
keywords:
  - review
  - code review
  - pr review
  - 审查
  - 代码审查
  - code 审查
  - 代码 review
intentPatterns:
  - "(review|check).*?code"
  - "code.*?review"
  - "(审查|检查|review).*(代码|code)"
  - "(代码|code).*(审查|review)"
---
```

## Testing the Fix

After fixing a SKILL.md, test it:

1. **Syntax validation:**
   ```bash
   # Check YAML syntax
   head -20 .claude/skills/skill-name/SKILL.md | yq eval
   ```

2. **Add to project:**
   ```bash
   # Try adding the skill
   cw skills add skill-name
   ```

3. **Verify triggers:**
   - Test if keywords trigger the skill
   - Check if file patterns match correctly

## Common Mistakes to Avoid

❌ **Don't modify skill-rules.json** - This skill only fixes SKILL.md
❌ **Don't change body content** - Only fix frontmatter
❌ **Don't add unnecessary fields** - Keep it minimal
❌ **Don't use invalid enum values** - Check allowed values
❌ **Don't forget to test** - Always validate after fixing
❌ **Don't skip Chinese keywords** - Always add bilingual support for better user experience

## Related Commands

- `cw skills add <name>` - Add skill to project (will validate frontmatter)
- `cw skills show <name>` - View skill details
- `cw skills lint` - Check 500-line rule compliance

## Quick Reference

### Common Bilingual Keywords

When adding keywords, include both English and Chinese equivalents:

| English | Chinese | Mixed Usage |
|---------|---------|-------------|
| review | 审查 | code review, 代码审查 |
| test | 测试 | unit test, 单元测试 |
| fix | 修复 | bug fix, 修复 bug |
| refactor | 重构 | code refactor, 代码重构 |
| debug | 调试 | debug code, 调试代码 |
| optimize | 优化 | optimize performance, 性能优化 |
| deploy | 部署 | deploy app, 部署应用 |
| api | 接口/API | create api, 创建接口 |
| backend | 后端 | backend dev, 后端开发 |
| frontend | 前端 | frontend dev, 前端开发 |
| database | 数据库 | database query, 数据库查询 |
| security | 安全 | security check, 安全检查 |

### Valid Type Values
- `domain` - Domain-specific knowledge/guidance
- `guardrail` - Critical best practices enforcement

### Valid Enforcement Values
- `suggest` - Advisory, not mandatory
- `block` - Prevents tool execution until used
- `warn` - Low priority suggestion

### Valid Priority Values
- `critical` - Must-have, critical issues
- `high` - Important, recommended
- `medium` - Useful, nice-to-have
- `low` - Optional, informational
