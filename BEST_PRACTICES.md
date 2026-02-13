# Claude Workflow 最佳实践

> 实战经验和技巧，帮助你高效使用 Claude Workflow (cw)

**Last Updated**: 2026-02-11

---

## 📑 目录

- [Dev Docs 模式最佳实践](#dev-docs-模式最佳实践)
- [技能管理最佳实践](#技能管理最佳实践)
- [Hooks 使用最佳实践](#hooks-使用最佳实践)
- [CLI 工作流程](#cli-工作流程)
- [常见陷阱和解决方案](#常见陷阱和解决方案)
- [性能优化](#性能优化)

---

## Dev Docs 模式最佳实践

### 何时创建新任务

**创建新任务的时机**：
- 需要跨多个会话完成的工作（预计 > 1 小时）
- 涉及多个文件或模块的复杂功能
- 需要记录决策和权衡的架构变更

**不需要创建任务**：
- 简单的 bug 修复（< 30 分钟）
- 单文件的小改动
- 一次性的探索或调研

**示例**：
```bash
# ✅ 适合创建任务
/dev-docs implement-user-authentication
/dev-docs refactor-database-layer
/dev-docs add-payment-integration

# ❌ 不需要创建任务
"修复登录页面的拼写错误"
"更新 README 中的安装说明"
```

---

### 如何组织任务结构

**三文件结构的使用**：

1. **plan.md** - 实施计划（创建后很少修改）
   - 执行摘要和目标
   - 实施阶段和任务分解
   - 风险评估和成功指标

2. **context.md** - 当前状态（频繁更新）
   - SESSION PROGRESS（最重要！）
   - 关键文件列表
   - 技术决策和原因
   - 遇到的问题和解决方案

3. **tasks.md** - 任务清单（每完成一项就更新）
   - 按阶段组织的任务列表
   - 使用 `[x]` 标记已完成
   - 记录阻塞项和依赖

**示例结构**：
```
dev/active/user-auth/
├── user-auth-plan.md      # 创建后基本不变
├── user-auth-context.md   # 每次会话都更新
└── user-auth-tasks.md     # 完成任务时更新
```

---

### 更新频率建议

**context.md 更新时机**：
- ✅ 每次会话开始时：记录当前状态
- ✅ 完成重要里程碑后：更新 SESSION PROGRESS
- ✅ 做出关键决策后：记录决策和原因
- ✅ 遇到问题后：记录问题和解决方案
- ✅ 会话结束前：总结本次进度

**tasks.md 更新时机**：
- ✅ 完成任务后立即标记 `[x]`
- ✅ 发现新任务时添加到相应阶段
- ✅ 遇到阻塞时记录到"阻塞项"部分

**plan.md 更新时机**：
- ⚠️ 很少更新（除非需求重大变更）
- 如需调整计划，在 context.md 中记录原因

---

### 上下文恢复技巧

**快速恢复的关键**：

1. **在 context.md 顶部维护 SESSION PROGRESS**
   ```markdown
   ## SESSION PROGRESS

   ### ✅ 已完成
   - 实现了用户注册 API
   - 添加了 JWT token 生成

   ### 🟡 进行中
   - 正在实现登录验证中间件
   - 文件: src/middleware/auth.ts (50% 完成)

   ### ⏳ 待办
   - 添加密码重置功能
   - 编写集成测试
   ```

2. **使用触发词快速恢复**
   ```
   "继续上次的工作"
   "resume"
   "读取任务"
   ```

3. **在 context.md 中记录"下一步"**
   ```markdown
   ## 下一步行动
   1. 完成 auth.ts 中的 token 验证逻辑
   2. 测试登录流程
   3. 添加错误处理
   ```

---

## 技能管理最佳实践

### 理解技能目录结构

**三个技能目录层级**：

1. **CW 技能库**（`~/.claude-workflow/skills/`）
   - CW 管理的技能仓库
   - 包含三个分类：`universal/`、`tech-stack/`、`custom/`
   - 作为技能的"源"，供项目引用
   - 通过 `cw skills sync` 添加自定义技能

2. **用户全局技能**（`~/.claude/skills/`）
   - 用户级别的全局技能目录
   - 跨所有项目可用
   - 通过 `cw skills add <name> --global` 安装
   - 可以是手动安装或从其他来源添加的技能

3. **项目技能**（`.claude/skills/`）
   - 项目特定的技能目录
   - 只在当前项目中可用
   - 通过 `cw skills add <name>` 安装（默认）
   - 包含 `skill-rules.json` 配置文件

---

### 技能安装工作流程

**基本命令**：

```bash
# 1. 查看可用技能（从 CW 技能库）
cw skills

# 2. 安装到项目（默认）
cw skills add backend-dev-guidelines
# 结果：复制到 .claude/skills/backend-dev-guidelines/

# 3. 安装到用户全局目录
cw skills add backend-dev-guidelines --global
# 结果：复制到 ~/.claude/skills/backend-dev-guidelines/

# 4. 从其他来源安装
cw skills add github:user/repo/skill-name
cw skills add /path/to/local/skill
```

**技能查找顺序**（当使用技能名称时）：
1. 项目目录：`.claude/skills/`
2. CW 技能库：`~/.claude-workflow/skills/universal/`
3. CW 技能库：`~/.claude-workflow/skills/tech-stack/`
4. CW 技能库：`~/.claude-workflow/skills/custom/`
5. 用户全局：`~/.claude/skills/`
6. 插件目录：`~/.claude/plugins/*/skills/`

---

### 何时使用 --global 标志

**使用 `--global` 的场景**：
- 技能需要在多个项目中使用
- 不想在每个项目中重复安装
- 技能是通用的开发工具或规范

**不使用 `--global` 的场景**：
- 技能是项目特定的
- 不同项目需要不同版本的技能
- 团队协作时需要版本控制

**示例**：
```bash
# ✅ 适合全局安装
cw skills add dev-docs --global
cw skills add pdf --global

# ✅ 适合项目安装
cw skills add backend-dev-guidelines  # 项目特定的后端规范
cw skills add custom-api-design       # 团队 API 设计规范
```

---

### 同步自定义技能到 CW 库

**使用场景**：
- 你手动创建了一个技能在 `~/.claude/skills/`
- 你想让这个技能被 CW 管理（出现在 `cw skills` 列表中）
- 你想在多个项目中方便地引用这个技能

**sync 命令**：
```bash
# 将用户技能同步到 CW 自定义库
cw skills sync my-custom-skill --category custom

# 查看同步后的位置
ls ~/.claude-workflow/skills/custom/my-custom-skill/
```

**工作流程**：
```bash
# 1. 手动创建技能
mkdir -p ~/.claude/skills/my-skill
echo "---
name: my-skill
description: My custom skill
---
# Content" > ~/.claude/skills/my-skill/SKILL.md

# 2. 同步到 CW 库
cw skills sync my-skill --category custom

# 3. 现在可以在任何项目中使用
cd /path/to/project
cw skills add my-skill
```

---

### 选择合适的技能

**技能类型**：
- **通用技能**（universal）：适用于所有项目（如 `dev-docs`）
- **技术栈技能**（tech-stack）：特定技术（如 `backend-dev-guidelines`）
- **自定义技能**（custom）：个人或团队特定（如 `company-api-design`）

**选择原则**：
- 只安装你实际使用的技能
- 优先使用 CW 内置技能
- 项目特定技能安装到项目目录
- 通用技能可以安装到用户全局目录

**示例**：
```bash
# 查看可用技能
cw skills

# 查看已安装技能
cw skills --installed

# 搜索技能
cw skills search backend
```

---

### 技能规则自动管理

**自动更新 skill-rules.json**：
- `cw skills add` 会自动更新 `.claude/skills/skill-rules.json`
- 从 SKILL.md 的 frontmatter 提取配置
- 不需要手动编辑

**skill-rules.json 的作用**：
- 定义技能的触发条件（关键词、意图模式、文件模式）
- 配置技能优先级和执行策略
- 被 hooks 读取，用于自动激活技能

**示例流程**：
```bash
# 1. 添加技能
cw skills add backend-dev-guidelines

# 2. 自动生成的 skill-rules.json
cat .claude/skills/skill-rules.json
# {
#   "version": "1.0",
#   "skills": {
#     "backend-dev-guidelines": {
#       "type": "domain",
#       "enforcement": "suggest",
#       "priority": "medium",
#       "description": "...",
#       "promptTriggers": {
#         "keywords": ["backend", "api", "controller"],
#         "intentPatterns": ["(create|add).*?(route|api)"]
#       }
#     }
#   }
# }

# 3. 修改关键词（会同步更新 skill-rules.json）
cw skills keywords add backend-dev-guidelines "express" "fastify"
```

**手动修改技能**：
```bash
# 如果需要修改 SKILL.md
vim .claude/skills/backend-dev-guidelines/SKILL.md

# 验证 frontmatter 与 skill-rules.json 一致性
cw skills show backend-dev-guidelines --validate

# 自动修复不一致
cw skills show backend-dev-guidelines --validate --fix
```

---

### 技能优先级和触发

**优先级影响**：
- `high`: 匹配时优先激活，适合核心技能
- `medium`: 标准优先级，适合常用技能
- `low`: 仅在明确匹配时激活，适合特殊场景

**触发机制**：
1. **关键词触发**（keywords）：用户输入包含关键词
2. **意图模式触发**（intentPatterns）：正则匹配用户意图
3. **文件触发**（fileTriggers）：基于文件路径或内容

**优先级配置示例**：
```json
{
  "dev-docs": { "priority": "high" },           // 核心功能
  "backend-dev-guidelines": { "priority": "medium" },  // 常用
  "pdf": { "priority": "low" }                  // 按需
}
```

**管理关键词**：
```bash
# 查看技能的关键词
cw skills keywords view backend-dev-guidelines

# 添加关键词
cw skills keywords add backend-dev-guidelines "express" "fastify"

# 移除关键词
cw skills keywords remove backend-dev-guidelines "old-keyword"
```

---

### 技能移除和清理

**移除技能**：
```bash
# 移除项目技能
cw skills remove backend-dev-guidelines

# 跳过确认
cw skills remove backend-dev-guidelines -y
```

**移除行为**：
- 删除技能目录（`.claude/skills/backend-dev-guidelines/`）
- 从 `skill-rules.json` 中移除配置
- 如果技能在 CW 库中存在，可以重新安装

**处理重复技能**：
- 如果技能同时存在于项目和用户目录，`cw skills add` 会提示处理
- 建议移除旧版本，避免冲突

**清理未使用的技能**：
```bash
# 查看已安装技能
cw skills --installed

# 检查技能大小
cw skills --detailed

# 移除不需要的技能
cw skills remove unused-skill
```

---

### 从不同来源安装技能

**支持的来源**：

1. **CW 技能库**（已安装的技能）
   ```bash
   cw skills add backend-dev-guidelines
   ```

2. **GitHub 仓库**
   ```bash
   # 完整 URL
   cw skills add https://github.com/user/repo

   # 简写格式
   cw skills add github:user/repo

   # 指定子目录中的技能
   cw skills add github:user/repo/skill-name
   ```

3. **本地路径**
   ```bash
   cw skills add /path/to/skill
   cw skills add ./relative/path/to/skill
   ```

4. **Gist**
   ```bash
   cw skills add https://gist.github.com/user/gist-id --name my-skill
   ```

**技能验证**：
- 所有来源的技能必须包含 `SKILL.md` 文件
- `SKILL.md` 必须有 frontmatter（name, description）
- 安装时会自动验证

**预览安装**：
```bash
# 使用 --dry-run 预览
cw skills add github:user/repo --dry-run

# 查看将要安装的内容
cw skills show skill-name --content
```

---

### 技能版本和更新

**检查技能状态**：
```bash
# 查看技能详情
cw skills show backend-dev-guidelines

# 查看技能位置和大小
cw skills --detailed
```

**技能元数据**：
- 每个技能包含 `.skill-meta.json` 文件
- 记录来源、版本、安装时间、校验和
- 用于检测本地修改

**更新技能**：
```bash
# 强制覆盖安装（更新）
cw skills add backend-dev-guidelines --force

# 从 GitHub 更新
cw skills add github:user/repo/skill-name --force
```

**检查本地修改**：
- CW 通过校验和检测技能是否被修改
- 修改后的技能会标记为 `customized: true`
- 更新时会提示是否覆盖本地修改

---

## Hooks 使用最佳实践

### 何时使用 Hooks

**Hooks 适用场景**：
- 自动化重复性任务
- 在特定事件时触发操作
- 扩展 Claude Code 功能

**内置 Hooks**：
- `skill-activation-prompt.ts`: 技能自动激活
- `post-tool-use-tracker.sh`: 工具使用跟踪

**不适合 Hooks**：
- 复杂的业务逻辑（应该在代码中实现）
- 需要用户交互的操作
- 长时间运行的任务

---

### 自定义 Hooks 开发

**创建自定义 Hook**：

1. 在 `.claude/hooks/` 创建脚本
2. 在 `settings.json` 中注册

**示例 - 自动提交 Hook**：

```typescript
// .claude/hooks/auto-commit.ts
import { execSync } from 'child_process';

export function onTaskComplete(taskName: string) {
  try {
    execSync('git add .');
    execSync(`git commit -m "feat: complete ${taskName}"`);
    console.log('✅ 自动提交成功');
  } catch (error) {
    console.error('❌ 提交失败:', error);
  }
}
```

**注册 Hook**：
```json
{
  "hooks": {
    "onTaskComplete": ".claude/hooks/auto-commit.ts"
  }
}
```

---

### 性能考虑

**Hook 性能优化**：
- 保持 Hook 脚本简短（< 100 行）
- 避免同步阻塞操作
- 使用异步操作处理耗时任务
- 添加超时机制

**示例 - 异步 Hook**：
```typescript
export async function onFileChange(filePath: string) {
  // ✅ 使用异步操作
  setTimeout(async () => {
    await processFile(filePath);
  }, 0);

  // ❌ 避免同步阻塞
  // processFileSync(filePath);
}
```

---

### 调试技巧

**Hook 调试方法**：

1. **添加日志输出**
   ```typescript
   console.log('[Hook] 开始执行:', hookName);
   console.log('[Hook] 参数:', params);
   ```

2. **使用环境变量控制调试**
   ```typescript
   const DEBUG = process.env.CW_DEBUG === 'true';
   if (DEBUG) {
     console.log('[Debug]', message);
   }
   ```

3. **测试 Hook**
   ```bash
   # 设置调试模式
   export CW_DEBUG=true

   # 运行 Claude Code
   claude
   ```

---

## CLI 工作流程

### 推荐的工作流程

**标准工作流**：

```bash
# 1. 初始化项目
cd your-project
cw init

# 2. 查看状态
cw status

# 3. 在 Claude Code 中工作
claude
> /dev-docs implement-feature

# 4. 定期更新进度
> /dev-docs-update

# 5. 上下文重置后恢复
> "继续"
```

**多任务工作流**：
```bash
# 查看所有活跃任务
ls dev/active/

# 切换任务（在 Claude Code 中）
> "切换到 user-auth 任务"
> "读取 dev/active/user-auth/user-auth-context.md"
```

---

### 命令组合使用

**常用命令组合**：

```bash
# 快速检查项目状态
cw status && git status

# 初始化并立即开始工作
cw init -y && claude

# 添加技能并验证
cw skills add backend-dev-guidelines && cw status

# 清理并重新初始化
rm -rf .claude/ dev/ && cw init
```

---

### 快捷方式和技巧

**Bash 别名**：
```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
alias cws='cw status'
alias cwi='cw init'
alias cwd='claude'  # 快速启动 Claude Code
```

**快速导航**：
```bash
# 跳转到活跃任务
alias cda='cd dev/active'

# 查看最新任务
alias cwt='ls -lt dev/active/ | head -5'
```

**Claude Code 快捷命令**：
```
# 在 Claude Code 中
/dev-docs <task-name>     # 创建任务
/dev-docs-update          # 更新进度
继续                       # 恢复工作
```

---

## 常见陷阱和解决方案

### 上下文重置处理

**问题**: Claude 忘记了之前的工作

**解决方案**：
1. 确保 context.md 中的 SESSION PROGRESS 是最新的
2. 使用触发词恢复："继续"、"resume"
3. 如果恢复失败，手动读取文件：
   ```
   "读取 dev/active/<task>/context.md 和 tasks.md"
   ```

**预防措施**：
- 每次完成重要工作后立即更新 context.md
- 在 SESSION PROGRESS 中详细记录当前状态
- 记录"下一步行动"

---

### 文件路径问题

**问题**: 找不到技能或 Hook 文件

**常见原因**：
- 相对路径错误
- 文件未正确复制到 `.claude/`
- 权限问题

**解决方案**：
```bash
# 检查文件是否存在
ls -la .claude/skills/
ls -la .claude/hooks/

# 验证权限
chmod +x .claude/hooks/*.sh

# 重新初始化
cw init --force
```

---

### 技能激活失败

**问题**: 技能没有自动激活

**排查步骤**：

1. **检查 skill-rules.json**
   ```bash
   cat .claude/skills/skill-rules.json
   ```

2. **验证关键词匹配**
   - 确保用户输入包含 `keywords` 中的词
   - 检查 `intentPatterns` 正则表达式

3. **检查 Hook 是否运行**
   ```bash
   # 查看 Hook 日志
   cat .claude/hooks/skill-activation-prompt.log
   ```

4. **手动激活技能**
   ```
   # 在 Claude Code 中
   /skill-name
   ```

---

### 性能问题

**问题**: CLI 命令响应慢

**常见原因**：
- 项目文件过多
- Git 仓库过大
- Node.js 版本过旧

**解决方案**：
```bash
# 更新 Node.js
node --version  # 确保 >= 18.0.0

# 清理 node_modules
rm -rf node_modules && npm install

# 使用 .gitignore 排除大文件
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
```

---

## 性能优化

### Token 使用优化

**减少 Token 消耗**：

1. **精简 context.md**
   - 只保留关键信息
   - 删除过时的内容
   - 使用简洁的语言

2. **合理使用 plan.md**
   - 创建后很少修改
   - 避免在 context.md 中重复计划内容

3. **任务拆分**
   - 大任务拆分成多个小任务
   - 每个任务独立的 Dev Docs

**示例 - 精简前**：
```markdown
## SESSION PROGRESS
我们已经完成了用户注册功能的实现，包括前端表单验证、
后端 API 接口、数据库模型设计、以及相关的单元测试和
集成测试。目前正在进行登录功能的开发...
```

**示例 - 精简后**：
```markdown
## SESSION PROGRESS
✅ 用户注册（前端+后端+测试）
🟡 登录功能（进行中）
```

---

### 文件结构优化

**推荐的目录结构**：

```
your-project/
├── .claude/
│   ├── settings.json       # 主配置（< 100 行）
│   ├── skills/
│   │   └── skill-rules.json  # 技能规则（< 200 行）
│   └── hooks/              # Hook 脚本（每个 < 100 行）
├── dev/
│   ├── active/             # 活跃任务（< 5 个）
│   └── archive/            # 已完成任务
└── CLAUDE.md               # 项目规范（< 500 行）
```

**优化建议**：
- 限制活跃任务数量（< 5 个）
- 定期归档已完成任务
- 保持配置文件简洁

---

### 任务拆分策略

**何时拆分任务**：
- 任务预计 > 3 天
- context.md > 500 行
- 涉及 > 10 个文件

**拆分方法**：

**按功能拆分**：
```
user-management/
├── user-registration/
├── user-login/
└── user-profile/
```

**按阶段拆分**：
```
payment-integration/
├── payment-phase1-setup/
├── payment-phase2-api/
└── payment-phase3-ui/
```

**按模块拆分**：
```
refactor-backend/
├── refactor-controllers/
├── refactor-services/
└── refactor-repositories/
```

---

## 📚 相关文档

- [完整使用指南](docs/user/GUIDE.md)
- [Dev Docs 指南](docs/user/DEV_DOCS_GUIDE.md)
- [快速参考](docs/user/QUICK_REFERENCE.md)
- [常见问题](docs/user/FAQ.md)

---

## 🤝 贡献

发现更好的实践？欢迎提交 PR 或 Issue！

---

**最后更新**: 2026-02-11
