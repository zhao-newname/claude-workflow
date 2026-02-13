# File Trigger 功能说明

## 概述

增强版的 `skill-activation-prompt` Hook 现在支持**文件触发**功能，可以根据用户编辑的文件自动建议相关技能。

## 工作原理

```
用户编辑文件
    ↓
PostToolUse: post-tool-use-tracker.sh
    → 记录到 ~/.claude/tsc-cache/{session_id}/edited-files.log
    ↓
用户提问："检查一下代码"
    ↓
UserPromptSubmit: skill-activation-prompt.ts
    → 检测到关键词（检查 + 代码）
    → 读取 edited-files.log
    → 匹配 skill-rules.json 的 fileTriggers
    → 输出匹配的技能建议
    ↓
Claude 看到建议，使用相应技能
```

## 触发条件

### 1. Prompt 触发（已有功能）

当用户的 prompt 包含技能配置的关键词或意图模式时触发。

**示例**：
```
用户："我要创建一个新的 API 路由"
→ 触发 backend-dev-guidelines（关键词：API、路由）
```

### 2. 文件触发（新功能）

当用户询问代码检查相关问题时，分析编辑的文件并建议相关技能。

**触发关键词组合**：
- 检查 + 代码/文件/改动
- 审查 + 代码/文件/改动
- 看看 + 代码/文件/改动
- 分析 + 代码/文件/改动
- check/review/show/analyze + code/file/change

**示例**：
```
用户编辑了：src/core/trigger-orchestrator.ts
用户："检查一下代码"
→ 触发 backend-dev-guidelines（匹配 1 个文件）
```

## 配置方法

在 `skill-rules.json` 中为技能添加 `fileTriggers` 配置：

```json
{
  "skills": {
    "backend-dev-guidelines": {
      "type": "domain",
      "enforcement": "suggest",
      "priority": "medium",
      "promptTriggers": {
        "keywords": ["backend", "api", "controller"],
        "intentPatterns": ["(create|add).*?(route|endpoint)"]
      },
      "fileTriggers": {
        "pathPatterns": [
          "src/core/**/*.ts",
          "src/cli/**/*.ts",
          "backend/**/*.ts"
        ],
        "pathExclusions": [
          "**/*.test.ts",
          "**/*.spec.ts"
        ],
        "contentPatterns": [
          "export.*Controller",
          "router\\.",
          "prisma\\."
        ]
      }
    }
  }
}
```

### 配置说明

#### `pathPatterns` (必需)

Glob 模式匹配文件路径。

**通用模式**：
- `**/*.ts` - 所有 TypeScript 文件
- `src/**/*.ts` - src 目录下的所有 TS 文件
- `**/*Controller.ts` - 所有 Controller 文件
- `backend/**/*.{ts,js}` - backend 目录下的 TS/JS 文件

#### `pathExclusions` (可选)

排除不需要匹配的文件。

**常用排除**：
- `**/*.test.ts` - 测试文件
- `**/*.spec.ts` - 规范文件
- `**/*.d.ts` - 类型定义文件
- `node_modules/**` - 依赖目录

#### `contentPatterns` (可选)

正则表达式匹配文件内容。

**注意**：内容匹配会读取文件，有性能开销，建议谨慎使用。

**示例模式**：
- `export.*Controller` - 导出 Controller 类
- `router\\.` - 使用 router
- `prisma\\.` - 使用 Prisma
- `import.*express` - 导入 Express

## 使用示例

### 场景 1：后端开发

```bash
# 用户编辑了后端文件
# src/api/UserController.ts
# src/services/UserService.ts

# 用户询问
用户："检查一下代码"

# Hook 输出
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 SKILL ACTIVATION CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 SUGGESTED SKILLS:
  → backend-dev-guidelines (匹配 2 个文件)

ACTION: Use Skill tool BEFORE responding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 场景 2：前端开发

```json
{
  "frontend-dev-guidelines": {
    "fileTriggers": {
      "pathPatterns": [
        "src/components/**/*.tsx",
        "src/features/**/*.tsx",
        "frontend/**/*.tsx"
      ],
      "pathExclusions": [
        "**/*.test.tsx",
        "**/*.stories.tsx"
      ]
    }
  }
}
```

```bash
# 用户编辑了前端组件
# src/components/UserList.tsx

# 用户询问
用户："看看改了什么文件"

# Hook 输出
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 SKILL ACTIVATION CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 RECOMMENDED SKILLS:
  → frontend-dev-guidelines (匹配 1 个文件)

ACTION: Use Skill tool BEFORE responding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 场景 3：多技能匹配

```bash
# 用户编辑了多种类型的文件
# src/api/UserController.ts (后端)
# src/components/UserList.tsx (前端)
# prisma/schema.prisma (数据库)

# 用户询问
用户："代码审查"

# Hook 输出
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 SKILL ACTIVATION CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 RECOMMENDED SKILLS:
  → backend-dev-guidelines (匹配 1 个文件)
  → frontend-dev-guidelines (匹配 1 个文件)
  → database-best-practices (匹配 1 个文件)

ACTION: Use Skill tool BEFORE responding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 性能考虑

### Path Pattern 匹配

- ✅ 快速（使用 minimatch）
- ✅ 无 I/O 开销
- ✅ 推荐优先使用

### Content Pattern 匹配

- ⚠️ 较慢（需要读取文件）
- ⚠️ 有 I/O 开销
- ⚠️ 建议谨慎使用，只在必要时添加

### 优化建议

1. **优先使用 pathPatterns**
   - 大多数情况下路径匹配就足够了
   - 例如：`**/*Controller.ts` 可以匹配所有 Controller

2. **contentPatterns 作为补充**
   - 只在路径无法区分时使用
   - 例如：区分是否使用了 Prisma

3. **合理设置 pathExclusions**
   - 排除测试文件、类型定义等
   - 减少不必要的匹配

## 调试

### 测试 Hook

```bash
cd .claude/hooks

# 测试 prompt 触发
npx tsx skill-activation-prompt.ts <<'EOF'
{
  "session_id": "test",
  "cwd": "/path/to/project",
  "prompt": "创建 API 路由"
}
EOF

# 测试文件触发
mkdir -p ~/.claude/tsc-cache/test
echo "1707123456:/path/to/file.ts:repo" > ~/.claude/tsc-cache/test/edited-files.log
npx tsx skill-activation-prompt.ts <<'EOF'
{
  "session_id": "test",
  "cwd": "/path/to/project",
  "prompt": "检查代码"
}
EOF
```

### 查看编辑的文件

```bash
# 查看当前会话编辑的文件
cat ~/.claude/tsc-cache/{session_id}/edited-files.log
```

### 验证配置

```bash
# 验证 skill-rules.json 语法
cat .claude/skills/skill-rules.json | python -m json.tool
```

## 与 CW CLI 的关系

### CW 的职责

- ✅ 提供配置管理 (`cw init`)
- ✅ 提供验证工具 (`cw triggers validate`)
- ✅ 提供测试工具 (`cw triggers test`)

### Hook 的职责

- ✅ 运行时执行
- ✅ 读取配置文件
- ✅ 独立运行，不依赖 CW

**重要**：Hook 是独立脚本，不调用 CW 的 TypeScript 模块。

## 常见问题

### Q: 为什么文件触发没有生效？

A: 检查以下几点：
1. 是否使用了触发关键词（检查、审查、看看等 + 代码/文件）
2. `post-tool-use-tracker.sh` 是否正常工作
3. `skill-rules.json` 中是否配置了 `fileTriggers`
4. 路径模式是否正确匹配文件

### Q: 如何避免过多的技能建议？

A:
1. 使用更精确的 `pathPatterns`
2. 添加 `pathExclusions` 排除不相关文件
3. 调整技能的 `priority` 级别
4. 只在必要时使用 `contentPatterns`

### Q: 文件触发会影响性能吗？

A:
- Path matching 非常快（<1ms）
- Content matching 较慢（取决于文件大小）
- 建议优先使用 path patterns

### Q: 可以禁用文件触发吗？

A: 可以，只需不在 prompt 中使用触发关键词即可。文件触发只在用户明确询问代码检查时才会激活。

## 更新日志

### v1.1.0 (2026-02-09)

- ✨ 新增文件触发功能
- ✨ 支持 pathPatterns 和 contentPatterns
- ✨ 支持 pathExclusions
- ✨ 智能关键词检测（检查 + 代码）
- ✨ 显示匹配文件数量
- 🐛 修复重复技能建议问题
- 📝 添加完整文档和示例

### v1.0.0

- ✨ 基础 prompt 触发功能
- ✨ 关键词和意图模式匹配
- ✨ 优先级分组显示
