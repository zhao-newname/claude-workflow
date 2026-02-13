# Getting Started with Claude Workflow

完整的安装和使用指南。

---

## 📋 环境要求

- ✅ **Node.js** >= 18.0.0
- ✅ **npm** >= 9.0.0
- ✅ **Git** 任意版本

检查环境：
```bash
node --version   # >= v18.0.0
npm --version    # >= 9.0.0
```

---

## 🚀 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/zhao-newname/claude-workflow.git
cd claude-workflow

# 2. 安装并构建
npm install && npm run build

# 3. 全局链接
npm link

# 4. 验证安装
cw --version

# 5. 在项目中使用
cd /path/to/your-project
cw init
```

完成！现在可以在任何项目中使用 `cw` 命令。

---

## 📦 详细步骤

### 1. 克隆并构建

```bash
git clone https://github.com/zhao-newname/claude-workflow.git
cd claude-workflow
npm install
npm run build
```

构建会生成 `dist/` 目录，包含编译后的代码和模板文件。

### 2. 全局链接

```bash
npm link
```

这会让 `cw` 命令在任何目录都可用。

验证：
```bash
cw --version  # 应该输出: 0.1.0
cw --help     # 显示命令列表
```

---

## 💻 在项目中使用

### 初始化项目

```bash
cd your-project
cw init
```

**交互式流程：**
1. 自动检测项目类型（语言、框架、包管理器）
2. 选择设置模式（快速开始 / 自定义）
3. 确认推荐的 skills
4. 创建配置文件

**非交互模式：**
```bash
cw init -y  # 跳过所有提示
```

**创建的文件：**
```
your-project/
├── .claude/
│   ├── commands/          # /dev-docs 等命令
│   ├── hooks/             # 自动化脚本
│   ├── skills/            # 项目技能
│   └── settings.json      # Claude Code 配置
├── dev/
│   ├── README.md
│   └── active/            # Dev Docs 任务
├── CLAUDE.md              # 开发规范
└── .claude-workflow-meta.json
```

### 查看状态

```bash
cw status
```

显示当前配置、已安装的 skills 和 hooks。

### 管理 Skills

```bash
cw skills              # 查看可用 skills
cw skills add <name>   # 添加 skill
cw skills remove <name> # 删除 skill
```

---

## 🎯 在 Claude Code 中使用

### 1. 启动 Claude Code

```bash
cd your-project
claude  # 或使用你的编辑器
```

### 2. 创建 Dev Docs

```
/dev-docs implement-user-authentication
```

Claude 会创建三个文件：
- `*-plan.md` - 实施计划
- `*-context.md` - 当前进度
- `*-tasks.md` - 任务清单

### 3. 更新进度

```
/dev-docs-update
```

### 4. 上下文恢复

当 Claude Code 上下文重置后，说"继续"或"resume"，Claude 会自动读取 Dev Docs 文件并继续工作。

---

## ❓ 常见问题

### `cw: command not found`

重新链接：
```bash
cd /path/to/claude-workflow
npm unlink && npm link
```

检查 PATH：
```bash
which cw  # 应该显示 npm bin 目录中的路径
```

### `npm install` 失败

清理缓存：
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### `cw init` 提示 "Hooks not found"

重新构建：
```bash
npm run build
ls dist/templates/  # 验证模板文件存在
```

### 如何更新到最新版本？

```bash
cd /path/to/claude-workflow
git pull origin master
npm install
npm run build
cw --version
```

---

## 🗑️ 卸载

### 完全卸载

```bash
# 取消全局链接
cd /path/to/claude-workflow
npm unlink

# 删除项目目录
cd .. && rm -rf claude-workflow

# 清理全局 skills（可选）
rm -rf ~/.claude-workflow/
```

### 只删除项目配置

```bash
cd your-project
rm -rf .claude/ dev/ CLAUDE.md .claude-workflow-meta.json
```

---

## 📂 目录结构

### 全局目录

```
~/.claude-workflow/
└── skills/
    ├── universal/         # 通用 skills
    └── tech-stack/        # 技术栈 skills
```

### 项目目录（初始化后）

```
your-project/
├── .claude/               # cw 配置
│   ├── commands/
│   ├── hooks/
│   ├── skills/
│   └── settings.json
├── dev/                   # Dev Docs
│   └── active/
└── CLAUDE.md              # 开发规范
```

---

## 📚 下一步

- 📖 [README.md](./README.md) - 项目概述
- 📖 [docs/user/GUIDE.md](docs/user/GUIDE.md) - 完整使用指南
- 📖 [docs/user/QUICK_REFERENCE.md](docs/user/QUICK_REFERENCE.md) - 命令速查

---

## 💬 获取帮助

- 📖 **文档**: [docs/](docs/)
- 🐛 **Bug 报告**: [GitHub Issues](https://github.com/zhao-newname/claude-workflow/issues)
- 💬 **讨论**: [GitHub Discussions](https://github.com/zhao-newname/claude-workflow/discussions)

---

**最后更新**: 2026-02-10
