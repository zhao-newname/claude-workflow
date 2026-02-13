# Agents Guide

Claude Workflow 提供了一套专用的 Agent 模板，用于处理特定的开发任务。这些 Agent 是独立的、可复用的 Markdown 文件，可以直接使用。

## 什么是 Agents？

Agents 是预定义的专用助手，每个 Agent 专注于特定的开发任务领域。它们包含详细的指令、最佳实践和工作流程，帮助 Claude 更有效地完成特定类型的任务。

## 可用的 Agents

### 1. Code Architecture Reviewer
**文件**: `.claude/agents/code-architecture-reviewer.md`

审查代码架构并提供改进建议。专注于：
- 设计模式和架构模式
- 代码组织和模块化
- 关注点分离
- 可扩展性和可维护性
- 技术债务识别

**使用场景**: 需要对项目架构进行全面评估时

---

### 2. Code Refactor Master
**文件**: `.claude/agents/code-refactor-master.md`

专注于代码重构，提供系统化的重构方案。

**使用场景**: 需要重构遗留代码或改进代码质量时

---

### 3. Documentation Architect
**文件**: `.claude/agents/documentation-architect.md`

创建和维护项目文档，确保文档完整性和一致性。

**使用场景**: 需要编写或改进项目文档时

---

### 4. Frontend Error Fixer
**文件**: `.claude/agents/frontend-error-fixer.md`

专门处理前端错误和调试问题。

**使用场景**: 遇到前端 bug 或运行时错误时

---

### 5. Refactor Planner
**文件**: `.claude/agents/refactor-planner.md`

制定详细的重构计划，评估风险和工作量。

**使用场景**: 需要规划大型重构项目时

---

### 6. Plan Reviewer
**文件**: `.claude/agents/plan-reviewer.md`

审查技术方案和实施计划，提供反馈。

**使用场景**: 需要对技术方案进行评审时

---

### 7. Web Research Specialist
**文件**: `.claude/agents/web-research-specialist.md`

进行技术调研，收集和分析信息。

**使用场景**: 需要调研新技术或解决方案时

---

### 8. Auth Route Tester
**文件**: `.claude/agents/auth-route-tester.md`

测试认证和授权相关的路由。

**使用场景**: 需要测试认证流程时

---

### 9. Auth Route Debugger
**文件**: `.claude/agents/auth-route-debugger.md`

调试认证和授权问题。

**使用场景**: 认证功能出现问题时

---

### 10. Auto Error Resolver
**文件**: `.claude/agents/auto-error-resolver.md`

自动分析和解决常见错误。

**使用场景**: 遇到错误需要快速诊断和修复时

---

## 如何使用 Agents

### 方法 1: 直接引用

在与 Claude 对话时，直接提及 Agent 名称：

```
请使用 code-architecture-reviewer agent 审查我的项目架构
```

### 方法 2: 读取 Agent 文件

让 Claude 读取特定的 Agent 文件：

```
请读取 .claude/agents/refactor-planner.md 并帮我制定重构计划
```

### 方法 3: 使用 Skill 工具

如果 Agent 被配置为 Skill，可以使用 Skill 工具调用：

```
/code-architecture-reviewer
```

## Agent 文件结构

每个 Agent 文件通常包含：

1. **角色定义**: Agent 的专业领域和职责
2. **任务描述**: Agent 要完成的具体任务
3. **工作流程**: 执行任务的步骤
4. **输出格式**: 期望的输出结构
5. **指导原则**: 最佳实践和注意事项

## 自定义 Agents

你可以创建自己的 Agent：

1. 在 `.claude/agents/` 目录下创建新的 `.md` 文件
2. 定义 Agent 的角色、任务和工作流程
3. 参考现有 Agent 的格式和结构

## 更多信息

详细的 Agent 使用说明和示例，请参阅：
- `.claude/agents/README.md` - Agents 库完整文档
- 各个 Agent 文件中的详细说明

## 最佳实践

1. **选择合适的 Agent**: 根据任务类型选择最匹配的 Agent
2. **提供上下文**: 给 Agent 提供足够的项目背景信息
3. **明确目标**: 清楚地说明你期望 Agent 完成什么
4. **迭代改进**: 根据 Agent 的输出进行调整和优化

---

**提示**: 所有 Agent 都是独立的，可以单独使用，也可以组合使用以完成复杂任务。
