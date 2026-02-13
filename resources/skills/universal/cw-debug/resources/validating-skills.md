# Validating Skills

How to verify skills are loaded and activated correctly.

## Check Skills Are Loaded

```bash
# List all skills
cw skills list

# Show specific skill
cw skills show cw-debug

# Check global skills directory
ls -la ~/.claude-workflow/.claude/skills/
```

## Test Skill Activation

**In Claude Code:**
```
debug cw
```

**Expected:** cw-debug skill suggested

## Verify Skill Rules

```bash
# Check skill-rules.json
cat .claude/skills/skill-rules.json | jq .

# Verify cw-debug entry
cat .claude/skills/skill-rules.json | jq '.skills["cw-debug"]'
```

## Common Issues

### Skill Not Found

**Check:**
1. Skill exists in global directory
2. SKILL.md has valid frontmatter
3. Skill name matches directory name

### Skill Not Activating

**Check:**
1. Keywords in skill-rules.json
2. Prompt matches keywords
3. Hook is triggering

---

**Last Updated:** 2026-02-05
