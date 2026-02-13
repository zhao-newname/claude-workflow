# 如何添加 Skills

从网络或本地获取并添加 skills 到你的项目。

---

## 🚀 快速开始

### 从参考项目复制 Skills

```bash
# 1. Clone 参考项目
git clone https://github.com/diet103/claude-code-infrastructure-showcase.git /tmp/showcase

# 2. 查看可用的 skills
ls /tmp/showcase/.claude/skills/

# 3. 复制到全局仓库
cp -r /tmp/showcase/.claude/skills/backend-dev-guidelines \
      ~/.claude-workflow/skills/tech-stack/

# 4. 在项目中使用
cd /path/to/project
cw init --yes

# 5. 清理
rm -rf /tmp/showcase
```

---

## 📦 添加方式

### 方式 1：从 GitHub 仓库

```bash
# 下载整个仓库
cd /tmp
git clone https://github.com/user/repo.git

# 复制 skill 到全局仓库
cp -r repo/.claude/skills/skill-name ~/.claude-workflow/skills/universal/

# 或复制到当前项目
cp -r repo/.claude/skills/skill-name ./.claude/skills/
```

### 方式 2：从 GitHub Gist

```bash
# 创建 skill 目录
mkdir -p ~/.claude-workflow/skills/universal/my-skill
cd ~/.claude-workflow/skills/universal/my-skill

# 下载 SKILL.md
curl -o SKILL.md https://gist.githubusercontent.com/username/gist-id/raw/SKILL.md

# 如果有其他文件
mkdir resources
curl -o resources/checklist.md https://gist.githubusercontent.com/.../checklist.md
```

### 方式 3：从本地路径

```bash
# 复制本地 skill
cp -r /path/to/local-skill ~/.claude-workflow/skills/universal/
```

---

## 📂 安装位置

Skills 可以安装到三个位置：

```bash
# Universal skills（通用技能）
~/.claude-workflow/skills/universal/

# Tech-stack skills（技术栈特定）
~/.claude-workflow/skills/tech-stack/

# Project skills（项目特定）
/path/to/project/.claude/skills/
```

---

## 📚 Skill 资源

### 推荐来源

- **[claude-code-infrastructure-showcase](https://github.com/diet103/claude-code-infrastructure-showcase)** - 参考项目，包含多个示例 skills
- **GitHub 搜索**：搜索 `.claude/skills/` 或 `#claude-code-skills`
- **GitHub Gist**：搜索 `claude skill` 或 `SKILL.md`

### 验证 Skill 质量

添加前检查：
- ✅ 是否有 `SKILL.md` 文件
- ✅ 内容是否符合需求
- ✅ 来源是否可信

---

## 🔄 未来功能

计划实现 `cw skills add` 命令，支持：

```bash
# 从 GitHub 添加
cw skills add github:user/repo/skill-name

# 从 Gist 添加
cw skills add gist:gist-id

# 从 URL 添加
cw skills add https://github.com/user/repo/.claude/skills/skill-name
```

目前请使用手动方式添加。

---

**最后更新：** 2026-02-10
