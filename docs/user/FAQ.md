# CW 常见问题

## 安装与配置

### 如何安装 CW？

```bash
git clone https://github.com/zhao-newname/claude-workflow.git
cd claude-workflow
npm install && npm run build && npm link
```

### 如何在项目中使用？

```bash
cd your-project
cw init              # 交互式初始化
cw init -y           # 非交互模式
```

### 需要编辑配置文件吗？

基本不需要。`cw init` 会自动生成所有必要的配置文件。高级用户可以直接编辑 `.claude/` 目录下的配置。

---

## Skills 管理

### 如何添加 skill？

```bash
cw skills add <skill-name>
```

### Skill 不能正确触发怎么办？

1. 检查 `.claude/skills/skill-rules.json` 中的触发规则
2. 确保 SKILL.md 的 frontmatter 格式正确
3. 使用 skill-fixer 修复格式问题

### 如何创建自定义 skill？

1. 在 `.claude/skills/` 创建新目录
2. 添加 `SKILL.md` 文件
3. 使用 `cw skills add` 添加到项目

---

## 故障排查

### `cw: command not found`

运行 `npm link` 或检查 PATH 环境变量。

### 中文乱码

```bash
export LANG=en_US.UTF-8
```

### 如何更新 CW？

```bash
cd claude-workflow
git pull
npm run build
```

---

## Dev Docs

### 什么是 Dev Docs？

Dev Docs 是三文件结构的开发文档系统：
- `context.md` - 任务上下文
- `tasks.md` - 任务清单
- `plan.md` - 实施计划

### 如何创建 Dev Docs？

在 Claude Code 中使用：
```
/dev-docs implement-feature-name
```

### 如何更新进度？

```
/dev-docs-update
```

---

## 获取帮助

- [GitHub Issues](https://github.com/zhao-newname/claude-workflow/issues)
- [完整文档](./GUIDE.md)
