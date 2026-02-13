# CW 快速参考

## 核心命令

```bash
cw init                 # 初始化项目
cw status               # 查看配置状态
cw skills               # 管理 skills
cw skills add <name>    # 添加 skill
cw --help               # 查看帮助
```

## 目录结构

```
~/.claude-workflow/     # 全局 skills
your-project/
├── .claude/            # 项目配置
│   ├── skills/         # 项目 skills
│   ├── hooks/          # 运行时脚本
│   └── settings.json   # Claude Code 配置
├── dev/                # Dev Docs
└── CLAUDE.md           # 开发规范
```

## 核心概念

### CW 定位
- CLI 配置管理工具
- 生成 `.claude/` 配置
- 管理 skills 和 hooks
- 不负责运行时逻辑

### Skill 架构
```
Universal (通用) → Tech Stack (技术栈) → Project (项目)
```

## 在 Claude Code 中使用

```
/dev-docs implement-feature-name    # 创建 Dev Docs
/dev-docs-update                    # 更新进度
```

## 常见问题

| 问题 | 解决方案 |
|------|----------|
| `cw: command not found` | `npm link` 或检查 PATH |
| 更新代码 | `git pull && npm run build` |

## 更多信息

- [完整指南](GUIDE.md)
- [Dev Docs 指南](DEV_DOCS_GUIDE.md)
- [命令参考](COMMANDS.md)
- [常见问题](FAQ.md)
- [项目主页](../../README.md)
- [GitHub Issues](https://github.com/zhao-newname/claude-workflow/issues)
