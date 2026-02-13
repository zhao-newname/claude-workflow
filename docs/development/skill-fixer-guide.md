# Skill-Fixer 使用指南

## 概述

skill-fixer 用于修复 SKILL.md 文件的 frontmatter 格式问题。

## 触发条件

### 关键词
- "fix skill", "repair skill"
- "skill format", "skill frontmatter"
- "skill validation", "invalid skill"

### 文件路径
- `**/.claude/skills/*/SKILL.md`

## 核心原则

### 只修复 SKILL.md
- 只修改 SKILL.md 的 frontmatter
- 不修改 skill-rules.json
- 不修改 body 内容

### 验证清单
- [ ] 有效的 YAML 语法
- [ ] `name` 字段存在（小写加连字符）
- [ ] `description` 字段存在且清晰
- [ ] `type` 是 "domain" 或 "guardrail"
- [ ] `enforcement` 是 "suggest", "block", 或 "warn"
- [ ] `priority` 是 "critical", "high", "medium", 或 "low"
- [ ] 触发器字段格式正确（数组）

## 使用示例

### 修复缺少字段

**问题:**
```yaml
---
name: my-skill
keywords: test
---
```

**修复后:**
```yaml
---
name: my-skill
description: Clear description of what this skill does
type: domain
enforcement: suggest
priority: medium
keywords:
  - test
---
```

### 修复字段类型

**问题:**
```yaml
---
name: backend-guide
keywords: "backend"  # 应该是数组
type: custom         # 无效值
---
```

**修复后:**
```yaml
---
name: backend-guide
description: Backend guidelines
type: domain
keywords:
  - backend
---
```

## 测试

```bash
# 创建测试 skill
mkdir -p /tmp/test-skill
cat > /tmp/test-skill/SKILL.md << 'EOF'
---
name: test-skill
keywords: test
---
# Test Skill
EOF

# 在 Claude Code 中
"帮我修复 /tmp/test-skill/SKILL.md 的 frontmatter"

# 验证结果
head -20 /tmp/test-skill/SKILL.md
```

## 常见问题

**Q: 会修改 skill-rules.json 吗？**
A: 不会，只修复 SKILL.md。

**Q: 会改变 skill 内容吗？**
A: 不会，只修改 frontmatter。

**Q: 修复后需要做什么？**
A: 使用 `cw skills add <skill-name>` 重新添加。
