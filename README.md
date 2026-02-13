# Claude Workflow (cw)

**Let Claude Code remember your work across context resets.**

**cw** solves the context reset problem with the **Dev Docs pattern**: a three-file structure (plan, context, tasks) that persists your progress, decisions, and next steps. When context resets, Claude reads these files and resumes instantly—no re-explanation needed.

---

## 🚀 Quick Start

### 1. Installation

**From source:**

```bash
git clone https://github.com/zhao-newname/claude-workflow.git
cd claude-workflow
npm install && npm run build && npm link
```

**From npm** (when published):

```bash
npm install -g claude-workflow
```

### 2. Initialize Your Project

```bash
cd your-project
cw init
```

This creates the `.claude/` structure with hooks, skills, and commands.

### 3. Use in Claude Code

Start a task:

```
/dev-docs implement-user-authentication
```

Claude creates the three-file structure and begins planning. Update progress as you work:

```
/dev-docs-update
```

After context reset, simply say "继续" or "resume" and Claude reads the files to continue seamlessly.

---

## ✨ Core Features

- **Dev Docs Pattern**: Three-file structure (plan, context, tasks) survives context resets
- **Skills Auto-Activation**: 10+ built-in skills automatically suggested based on context
- **Hooks System**: Extensible automation (skill activation, file tracking, etc.)
- **Interactive CLI**: Smart defaults, 5-minute setup, CI/CD ready

---

## 📖 Documentation

- **[🚀 Getting Started](GETTING_STARTED.md)** - Detailed installation and setup
- **[💡 Best Practices](BEST_PRACTICES.md)** - Tips and tricks for efficient workflow
- **[📖 Complete Guide](docs/user/GUIDE.md)** - From basics to advanced usage
- **[⚡ Quick Reference](docs/user/QUICK_REFERENCE.md)** - Command cheatsheet
- **[📚 All Documentation](docs/README.md)** - Full documentation index

---

## 🔄 Coming Soon

- Multi-agent collaboration (Planner + Executor + Reviewer)
- Workflow engine for complex orchestration
- TUI visualization for real-time agent status
- Template system for projects and skills
- More built-in skills (testing, documentation, security, etc.)

---

## 📊 Project Status

**Version:** 0.1.0 (MVP)
**Status:** ✅ Ready for testing

**Working:**
- ✅ Dev Docs mechanism (validated)
- ✅ Skills auto-activation
- ✅ Hooks system
- ✅ Interactive CLI
- ✅ 71 unit tests + 21 E2E tests

**Next:**
- 🔄 Multi-agent support
- 🎨 More skills and templates

---

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📝 License

Apache-2.0

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/claude-workflow/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/claude-workflow/discussions)
- **Documentation**: [docs/](docs/)

---

## 🙏 Acknowledgments

Inspired by:
- [claude-code-infrastructure-showcase](https://github.com/diet103/claude-code-infrastructure-showcase) - Dev Docs pattern and hooks
- The Claude Code community
- Everyone frustrated with context resets

---

**Built with ❤️ for developers who want their AI to remember.**
