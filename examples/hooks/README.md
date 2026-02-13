# Optional Hooks Examples

这个目录包含了可选的 Claude Code hooks，它们提供有价值的功能但默认未启用。

---

## 📋 可用的 Hooks

### 1. comprehensive-status.sh

**功能：** 会话结束时生成综合状态总结

**提供的信息：**
- 修改的文件列表
- 影响的仓库
- 推荐的命令（TypeScript 检查、构建等）
- Git 状态（未提交的更改、未推送的提交）

**如何启用：**

1. 复制到 hooks 目录：
```bash
cp examples/hooks/comprehensive-status.sh .claude/hooks/
```

2. 更新 `.claude/settings.json`，添加 Stop Hook：
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/comprehensive-status.sh"
          }
        ]
      }
    ]
  }
}
```

---

### 2. tsc-check.sh

**功能：** 会话结束时自动运行 TypeScript 类型检查

**提供的功能：**
- 检测所有被修改的 TypeScript 项目
- 自动运行 `tsc --noEmit` 检查类型错误
- 支持 monorepo 结构
- 显示清晰的错误报告

**依赖：**
- 需要 `.claude/tsc-cache/` 目录（由 post-tool-use-tracker.sh 创建）
- 需要 `CLAUDE_SESSION_ID` 环境变量

**如何启用：**

1. 复制到 hooks 目录：
```bash
cp examples/hooks/tsc-check.sh .claude/hooks/
```

2. 更新 `.claude/settings.json`，添加 Stop Hook：
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/tsc-check.sh"
          }
        ]
      }
    ]
  }
}
```

---

## 🔧 同时启用两个 Hooks

如果你想同时启用两个 hooks，可以这样配置：

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/tsc-check.sh"
          },
          {
            "type": "command",
            "command": ".claude/hooks/comprehensive-status.sh"
          }
        ]
      }
    ]
  }
}
```

**注意：** hooks 会按顺序执行。建议先运行 `tsc-check.sh`，再运行 `comprehensive-status.sh`。

---

## 📝 注意事项

### tsc-cache 目录

`tsc-check.sh` 依赖 `.claude/tsc-cache/` 目录来追踪修改的文件。这个目录由 `post-tool-use-tracker.sh` 自动创建和维护。

**确保：**
1. `.claude/tsc-cache/` 已添加到 `.gitignore`（避免提交缓存）
2. `post-tool-use-tracker.sh` 正在运行（应该已经在 `PostToolUse` hook 中配置）

### 性能考虑

- `tsc-check.sh` 会在每个会话结束时运行类型检查，可能需要几秒到几十秒
- 如果你的项目很大，考虑只在需要时手动运行 `npm run typecheck`

---

## 🚀 快速测试

启用 hooks 后，你可以这样测试：

1. 修改一个 TypeScript 文件
2. 结束 Claude Code 会话
3. 查看输出，应该能看到：
   - TypeScript 类型检查结果（如果启用了 tsc-check.sh）
   - 会话总结（如果启用了 comprehensive-status.sh）

---

## 🔍 故障排查

### Hook 没有执行

1. 检查 `.claude/settings.json` 配置是否正确
2. 确认 hook 文件有执行权限：
   ```bash
   chmod +x .claude/hooks/*.sh
   ```
3. 检查 Claude Code 日志

### tsc-check.sh 报错

1. 确认项目有 `tsconfig.json`
2. 确认 `npx tsc` 可以正常运行
3. 检查 `.claude/tsc-cache/` 目录是否存在

---

## 📚 更多信息

- [Claude Code Hooks 文档](../.claude/hooks/FILE_TRIGGER_README.md)
- [Claude Workflow 文档](../../README.md)

---

**最后更新：** 2026-02-11
