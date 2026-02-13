# CW 命令参考

## 核心命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `cw --version` | 查看版本 | `cw --version` |
| `cw --help` | 查看帮助 | `cw --help` |
| `cw init` | 初始化项目 | `cw init` |
| `cw init -y` | 非交互初始化 | `cw init -y` |
| `cw status` | 查看配置状态 | `cw status` |

## Skills 管理

| 命令 | 说明 | 示例 |
|------|------|------|
| `cw skills` | 列出所有 skills | `cw skills` |
| `cw skills add <name>` | 添加 skill | `cw skills add python` |
| `cw skills remove <name>` | 删除 skill | `cw skills remove python` |

## Claude Code 中的命令

在 Claude Code 对话中使用：

| 命令 | 说明 |
|------|------|
| `/dev-docs <task-name>` | 创建 Dev Docs 三文件结构 |
| `/dev-docs-update` | 更新任务进度 |

## 快速验证

```bash
# 测试安装
cd /tmp && mkdir test-cw && cd test-cw
cw init -y
ls -la .claude/
cd .. && rm -rf test-cw
```

## 更多信息

- [完整指南](./GUIDE.md)
- [常见问题](./FAQ.md)
