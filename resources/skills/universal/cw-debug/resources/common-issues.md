# Common Issues

Known issues and solutions for cw development.

## Hooks Don't Trigger

**Symptoms:** No skill suggestions, hooks seem inactive

**Solutions:**
1. Check hooks registered: `cat .claude/settings.json | grep hooks`
2. Verify files exist: `ls -la .claude/hooks/`
3. Check permissions: `chmod +x .claude/hooks/*.sh`
4. Test manually: `echo '...' | tsx .claude/hooks/...`

## Skills Not Found

**Symptoms:** `cw skills list` shows no skills

**Solutions:**
1. Check global directory: `ls -la ~/.claude-workflow/.claude/skills/`
2. Verify skill format: Check YAML frontmatter
3. Reinstall: `cw init --force`

## Dev Docs Commands Not Available

**Symptoms:** `/dev-docs` not recognized

**Solutions:**
1. Verify commands exist: `ls -la .claude/commands/`
2. Reinstall: `cw init --force`
3. Check Claude Code version

## Tests Failing

**Symptoms:** `npm test` fails

**Solutions:**
1. Clean install: `rm -rf node_modules && npm install`
2. Rebuild: `npm run build`
3. Check specific test: `npm test -- path/to/test.ts`

## Build Errors

**Symptoms:** `npm run build` fails

**Solutions:**
1. Check TypeScript errors: `npm run typecheck`
2. Clean dist: `rm -rf dist && npm run build`
3. Update dependencies: `npm update`

---

**Last Updated:** 2026-02-05
