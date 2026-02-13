# Claude Workflow (cw) 使用指南

> **让 Claude Code 记住你的意图，即使在上下文重置后。**

---

## 📑 目录

- [核心概念](#核心概念)
- [快速开始](#快速开始)
- [核心功能](#核心功能)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 核心概念

### 解决的问题

上下文重置导致 Claude 忘记：
- 你在构建什么
- 为什么做某些决策
- 哪些已完成，哪些进行中
- 接下来该做什么

每次重置需要 10-30 分钟重新解释。

### 解决方案

**Dev Docs 三文件模式**：

```
dev/active/your-task/
├── your-task-plan.md      # 实施计划
├── your-task-context.md   # 当前进度和决策
└── your-task-tasks.md     # 任务清单
```

上下文重置后，Claude 读取这些文件，立即恢复工作。

### 核心优势

1. **上下文持久化** - 三文件模式保留所有关键信息
2. **即时恢复** - < 2 分钟恢复工作状态
3. **智能技能激活** - 基于关键词和文件路径自动激活相关技能
4. **任务管理** - 内置任务管理和进度跟踪
5. **Token 优化** - 节省约 70% token

---

## 快速开始

### 安装

```bash
# 从源码安装
git clone https://github.com/zhao-newname/claude-workflow.git
cd claude-workflow
npm install && npm run build && npm link

# 或从 npm 安装
npm install -g claude-workflow
```

### 初始化

```bash
cd your-project
cw init
```

### 基本使用

```
# 在 Claude Code 中创建任务
/dev-docs implement-user-authentication

# 更新进度
/dev-docs-update

# 上下文重置后恢复
"继续上次的工作"
```

---

## 核心功能

### Dev Docs 三文件结构

**1. plan.md** - 实施计划
- 执行摘要和实施阶段
- 带验收标准的详细任务
- 风险评估和时间线

**2. context.md** - 当前状态
- SESSION PROGRESS（最重要）
  - ✅ 已完成
  - 🟡 进行中
  - ⏳ 未开始
  - ⚠️ 阻塞因素
- 关键文件和决策
- 快速恢复指令

**3. tasks.md** - 任务清单
- 复选框格式跟踪
- 验收标准
- 状态指示器

### 技能系统

三层架构：
- **Universal Skills** - 通用技能（code-review, skill-developer）
- **Tech Stack Skills** - 技术栈技能（nodejs-backend, react-frontend）
- **Project Skills** - 项目特定技能

自动激活基于关键词、文件路径和内容模式。

### 任务恢复协议

触发词：
- "继续上次的工作" / "继续" / "resume"
- "恢复工作" / "接着做"
- "读取文档" / "查看任务"

Claude 自动读取 ACTIVE_TASK.md、context.md 和 tasks.md，显示状态并继续工作。

---

## 最佳实践

### 1. 定期更新文档

每完成重要步骤后运行 `/dev-docs-update`，确保信息最新。

### 2. 清晰的任务命名

好的命名：`implement-jwt-authentication`、`refactor-database-layer`
避免：`task1`、`fix-bug`、`update`

### 3. 维护 SESSION PROGRESS

在 context.md 中始终更新当前状态：

```markdown
## SESSION PROGRESS

### ✅ Completed This Session
- Implemented JWT token generation
- Added login endpoint

### 🟡 In Progress
- Token validation middleware (50% done)

### ⏳ Not Started
- Refresh token logic

### ⚠️ Blockers
- None
```

### 4. 具体的验收标准

好的标准：
- Login endpoint returns JWT token
- Token expires after 1 hour
- Invalid credentials return 401

避免模糊描述：
- Login works
- Add tests

---

## 常见问题

### 一般问题

**Q: cw 和其他工具有什么区别？**
A: cw 专注于解决 Claude Code 的上下文重置问题，提供 Dev Docs 三文件模式、自动任务恢复和深度集成。

**Q: 需要修改现有项目吗？**
A: 不需要。cw 只在 `.claude/` 目录中添加配置。

**Q: 支持哪些编程语言？**
A: 所有语言。cw 是语言无关的。

### 技术问题

**Q: 上下文重置后 Claude 没有自动读取文档？**
A: 确保 CLAUDE.md 包含任务恢复协议，使用触发词，ACTIVE_TASK.md 文件存在。

**Q: 如何切换任务？**
A: 手动编辑 `.claude/ACTIVE_TASK.md` 或在新会话中说"继续 [任务名] 任务"。

**Q: 任务文件应该提交到 git 吗？**
A: 建议提交 `dev/active/` 目录，不提交 `.claude/ACTIVE_TASK.md`。

---

## CLI 命令参考

```bash
# 初始化
cw init                     # 初始化项目
cw init -y                  # 非交互模式

# 状态查看
cw status                   # 查看配置状态
cw skills                   # 列出所有技能
cw tasks                    # 列出所有任务

# 任务管理
cw tasks show <name>        # 查看任务详情
cw tasks show <name> --context  # 显示上下文
cw tasks show <name> --tasks    # 显示任务清单

# Claude Code 命令
/dev-docs <task-name>       # 创建新任务
/dev-docs-update            # 更新任务进度
```

---

## 文档资源

- [快速参考](./QUICK_REFERENCE.md) - 命令速查表
- [Dev Docs 指南](./DEV_DOCS_GUIDE.md) - 详细使用方法
- [Claude Code 集成](../integration/CLAUDE_CODE_INTEGRATION.md) - 设置和配置
- [测试指南](../development/TESTING_GUIDE.md) - 运行测试

---

**返回**: [README](../../README.md) | **下一步**: [快速开始](../../GETTING_STARTED.md)
