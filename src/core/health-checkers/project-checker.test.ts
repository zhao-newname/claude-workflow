/**
 * Tests for ProjectChecker
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { ProjectChecker } from './project-checker.js';
import { CheckLevel, CheckContext } from '../../types/health-checker.js';

describe('ProjectChecker', () => {
  let checker: ProjectChecker;
  let testDir: string;
  let context: CheckContext;

  beforeEach(async () => {
    checker = new ProjectChecker();
    testDir = path.join(process.cwd(), 'test-temp', `project-checker-${Date.now()}`);
    await fs.ensureDir(testDir);

    context = {
      cwd: testDir,
      claudeDir: path.join(testDir, '.claude'),
      mode: 'standard',
      verbose: false,
    };
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(checker.name).toBe('project-checker');
      expect(checker.priority).toBe(0);
      expect(checker.description).toBeTruthy();
    });
  });

  describe('check - uninitialized project', () => {
    it('should detect missing .claude/ directory', async () => {
      const results = await checker.check(context);

      expect(results.length).toBeGreaterThan(0);
      const claudeDirResult = results.find(r => r.id === 'init-claude-dir');
      expect(claudeDirResult).toBeDefined();
      expect(claudeDirResult?.level).toBe(CheckLevel.Error);
      expect(claudeDirResult?.message).toContain('.claude/ 目录不存在');
      expect(claudeDirResult?.fixable).toBe(true);
    });

    it('should provide fix for missing .claude/ directory', async () => {
      const results = await checker.check(context);
      const claudeDirResult = results.find(r => r.id === 'init-claude-dir');

      expect(claudeDirResult?.fix).toBeDefined();

      // Apply fix
      if (claudeDirResult?.fix) {
        await claudeDirResult.fix();
      }

      // Verify fix
      const exists = await fs.pathExists(context.claudeDir);
      expect(exists).toBe(true);
    });
  });

  describe('check - missing settings.json', () => {
    beforeEach(async () => {
      await fs.ensureDir(context.claudeDir);
    });

    it('should detect missing settings.json', async () => {
      const results = await checker.check(context);

      const settingsResult = results.find(r => r.id === 'init-settings-json');
      expect(settingsResult).toBeDefined();
      expect(settingsResult?.level).toBe(CheckLevel.Error);
      expect(settingsResult?.message).toContain('settings.json 不存在');
      expect(settingsResult?.fixable).toBe(true);
    });

    it('should provide fix for missing settings.json', async () => {
      const results = await checker.check(context);
      const settingsResult = results.find(r => r.id === 'init-settings-json');

      // Apply fix
      if (settingsResult?.fix) {
        await settingsResult.fix();
      }

      // Verify fix
      const settingsPath = path.join(context.claudeDir, 'settings.json');
      const exists = await fs.pathExists(settingsPath);
      expect(exists).toBe(true);

      const settings = await fs.readJson(settingsPath);
      expect(settings.version).toBeDefined();
      expect(settings.mode).toBeDefined();
    });
  });

  describe('check - invalid settings.json', () => {
    beforeEach(async () => {
      await fs.ensureDir(context.claudeDir);
    });

    it('should detect corrupted settings.json', async () => {
      const settingsPath = path.join(context.claudeDir, 'settings.json');
      await fs.writeFile(settingsPath, 'invalid json{');

      const results = await checker.check(context);
      const settingsResult = results.find(r => r.id === 'init-settings-json');

      expect(settingsResult?.level).toBe(CheckLevel.Error);
      expect(settingsResult?.message).toContain('无法解析');
    });

    it('should detect incomplete settings.json', async () => {
      const settingsPath = path.join(context.claudeDir, 'settings.json');
      await fs.writeJson(settingsPath, { version: '1.0' }); // Missing mode

      const results = await checker.check(context);
      const settingsResult = results.find(r => r.id === 'init-settings-json');

      expect(settingsResult?.level).toBe(CheckLevel.Error);
      expect(settingsResult?.message).toContain('缺少必需字段');
    });
  });

  describe('check - valid project', () => {
    beforeEach(async () => {
      await fs.ensureDir(context.claudeDir);
      const settingsPath = path.join(context.claudeDir, 'settings.json');
      await fs.writeJson(settingsPath, {
        version: '1.0',
        mode: 'single-agent',
      });
    });

    it('should pass all checks for valid project', async () => {
      await fs.ensureDir(path.join(context.claudeDir, 'skills'));
      await fs.ensureDir(path.join(context.claudeDir, 'hooks'));

      const results = await checker.check(context);

      // All results should be success
      const errors = results.filter(r => r.level === CheckLevel.Error);
      expect(errors).toHaveLength(0);

      const claudeDirResult = results.find(r => r.id === 'init-claude-dir');
      expect(claudeDirResult?.level).toBe(CheckLevel.Success);

      const settingsResult = results.find(r => r.id === 'init-settings-json');
      expect(settingsResult?.level).toBe(CheckLevel.Success);
    });
  });

  describe('check - missing subdirectories', () => {
    beforeEach(async () => {
      await fs.ensureDir(context.claudeDir);
      const settingsPath = path.join(context.claudeDir, 'settings.json');
      await fs.writeJson(settingsPath, {
        version: '1.0',
        mode: 'single-agent',
      });
    });

    it('should detect missing skills directory', async () => {
      const results = await checker.check(context);

      const skillsDirResult = results.find(r => r.id === 'init-subdir-skills');
      expect(skillsDirResult).toBeDefined();
      expect(skillsDirResult?.level).toBe(CheckLevel.Warning);
      expect(skillsDirResult?.message).toContain('skills/ 目录不存在');
      expect(skillsDirResult?.fixable).toBe(true);
    });

    it('should detect missing hooks directory', async () => {
      const results = await checker.check(context);

      const hooksDirResult = results.find(r => r.id === 'init-subdir-hooks');
      expect(hooksDirResult).toBeDefined();
      expect(hooksDirResult?.level).toBe(CheckLevel.Warning);
      expect(hooksDirResult?.message).toContain('hooks/ 目录不存在');
      expect(hooksDirResult?.fixable).toBe(true);
    });

    it('should provide fix for missing subdirectories', async () => {
      const results = await checker.check(context);

      // Apply all fixes
      for (const result of results) {
        if (result.fixable && result.fix) {
          await result.fix();
        }
      }

      // Verify fixes
      const skillsDir = path.join(context.claudeDir, 'skills');
      const hooksDir = path.join(context.claudeDir, 'hooks');

      expect(await fs.pathExists(skillsDir)).toBe(true);
      expect(await fs.pathExists(hooksDir)).toBe(true);
    });

    it('should report success for existing subdirectories', async () => {
      await fs.ensureDir(path.join(context.claudeDir, 'skills'));
      await fs.ensureDir(path.join(context.claudeDir, 'hooks'));

      const results = await checker.check(context);

      const skillsDirResult = results.find(r => r.id === 'init-subdir-skills');
      expect(skillsDirResult?.level).toBe(CheckLevel.Success);

      const hooksDirResult = results.find(r => r.id === 'init-subdir-hooks');
      expect(hooksDirResult?.level).toBe(CheckLevel.Success);
    });
  });

  describe('early exit on critical error', () => {
    it('should only return .claude/ error when directory missing', async () => {
      const results = await checker.check(context);

      // Should only have the .claude/ directory check result
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('init-claude-dir');
      expect(results[0].level).toBe(CheckLevel.Error);
    });
  });
});
