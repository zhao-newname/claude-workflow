/**
 * Project Checker - Checks project initialization status
 */

import path from 'path';
import fs from 'fs-extra';
import {
  IHealthChecker,
  CheckContext,
  CheckResult,
  CheckLevel,
  CheckCategory,
} from '../../types/health-checker.js';

/**
 * Checks if the project is properly initialized with Claude Workflow
 */
export class ProjectChecker implements IHealthChecker {
  name = 'project-checker';
  category = CheckCategory.Initialization;
  priority = 0 as const; // P0 - Critical
  description = '检查项目初始化状态';

  async check(context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    // Check .claude/ directory
    const claudeDirResult = await this.checkClaudeDirectory(context);
    results.push(claudeDirResult);

    // Only continue if .claude/ exists
    if (claudeDirResult.level === CheckLevel.Error) {
      return results;
    }

    // Check settings.json
    const settingsResult = await this.checkSettingsJson(context);
    results.push(settingsResult);

    // Check required subdirectories
    const subdirsResults = await this.checkSubdirectories(context);
    results.push(...subdirsResults);

    return results;
  }

  /**
   * Check if .claude/ directory exists
   */
  private async checkClaudeDirectory(context: CheckContext): Promise<CheckResult> {
    const exists = await fs.pathExists(context.claudeDir);

    if (!exists) {
      return {
        id: 'init-claude-dir',
        category: this.category,
        level: CheckLevel.Error,
        title: '项目未初始化',
        message: '.claude/ 目录不存在',
        suggestion: '运行 "cw init" 初始化项目',
        filePath: context.claudeDir,
        fixable: true,
        fix: async () => {
          await fs.ensureDir(context.claudeDir);
        },
      };
    }

    return {
      id: 'init-claude-dir',
      category: this.category,
      level: CheckLevel.Success,
      title: '项目已初始化',
      message: '.claude/ 目录存在',
    };
  }

  /**
   * Check if settings.json exists and is valid
   */
  private async checkSettingsJson(context: CheckContext): Promise<CheckResult> {
    const settingsPath = path.join(context.claudeDir, 'settings.json');
    const exists = await fs.pathExists(settingsPath);

    if (!exists) {
      return {
        id: 'init-settings-json',
        category: this.category,
        level: CheckLevel.Error,
        title: '配置文件缺失',
        message: 'settings.json 不存在',
        suggestion: '运行 "cw init" 创建配置文件',
        filePath: settingsPath,
        fixable: true,
        fix: async () => {
          const defaultConfig = {
            version: '1.0',
            mode: 'single-agent',
          };
          await fs.writeJson(settingsPath, defaultConfig, { spaces: 2 });
        },
      };
    }

    // Try to read and parse settings.json
    try {
      const settings = await fs.readJson(settingsPath);

      // Check required fields
      if (!settings.version || !settings.mode) {
        return {
          id: 'init-settings-json',
          category: this.category,
          level: CheckLevel.Error,
          title: '配置文件不完整',
          message: 'settings.json 缺少必需字段（version 或 mode）',
          suggestion: '检查配置文件格式，确保包含 version 和 mode 字段',
          filePath: settingsPath,
        };
      }

      return {
        id: 'init-settings-json',
        category: this.category,
        level: CheckLevel.Success,
        title: '配置文件有效',
        message: 'settings.json 格式正确',
      };
    } catch (error) {
      return {
        id: 'init-settings-json',
        category: this.category,
        level: CheckLevel.Error,
        title: '配置文件损坏',
        message: `settings.json 无法解析: ${error instanceof Error ? error.message : '未知错误'}`,
        suggestion: '检查 JSON 格式是否正确，或运行 "cw init" 重新初始化',
        filePath: settingsPath,
      };
    }
  }

  /**
   * Check required subdirectories
   */
  private async checkSubdirectories(context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const requiredDirs = [
      { name: 'skills', description: '技能目录' },
      { name: 'hooks', description: 'Hooks 目录' },
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(context.claudeDir, dir.name);
      const exists = await fs.pathExists(dirPath);

      if (!exists) {
        results.push({
          id: `init-subdir-${dir.name}`,
          category: this.category,
          level: CheckLevel.Warning,
          title: `${dir.description}缺失`,
          message: `${dir.name}/ 目录不存在`,
          suggestion: `创建 .claude/${dir.name}/ 目录`,
          filePath: dirPath,
          fixable: true,
          fix: async () => {
            await fs.ensureDir(dirPath);
          },
        });
      } else {
        results.push({
          id: `init-subdir-${dir.name}`,
          category: this.category,
          level: CheckLevel.Success,
          title: `${dir.description}存在`,
          message: `${dir.name}/ 目录已创建`,
        });
      }
    }

    return results;
  }
}
