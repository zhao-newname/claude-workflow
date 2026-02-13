/**
 * Hooks Checker - Checks hooks system integrity
 *
 * Checks:
 * - Required hook files exist
 * - Hook files have correct permissions
 * - TypeScript files are valid
 * - Shell scripts are valid
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

export class HooksChecker implements IHealthChecker {
  name = 'hooks-checker';
  category = CheckCategory.Hooks;
  priority = 1 as const; // P1
  description = '检查 Hooks 系统完整性';

  // Required hook files
  private readonly REQUIRED_HOOKS = [
    {
      name: 'skill-activation-prompt.ts',
      description: '技能激活 Hook（TypeScript）',
      type: 'typescript',
    },
    {
      name: 'post-tool-use-tracker.sh',
      description: '工具使用追踪 Hook（Shell）',
      type: 'shell',
    },
  ];

  async check(context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const hooksDir = path.join(context.claudeDir, 'hooks');

    // Check if hooks directory exists
    const dirExists = await fs.pathExists(hooksDir);

    if (!dirExists) {
      results.push({
        id: 'hooks-dir-missing',
        category: this.category,
        level: CheckLevel.Error,
        title: 'Hooks 目录不存在',
        message: '.claude/hooks/ 目录不存在',
        suggestion: '运行 "cw init" 创建 hooks 目录',
        filePath: hooksDir,
      });
      return results;
    }

    // Check each required hook file
    for (const hook of this.REQUIRED_HOOKS) {
      const hookResults = await this.checkHookFile(hooksDir, hook, context);
      results.push(...hookResults);
    }

    // Check for additional hook files
    const additionalHooks = await this.findAdditionalHooks(hooksDir);
    if (additionalHooks.length > 0 && context.verbose) {
      results.push({
        id: 'hooks-additional',
        category: this.category,
        level: CheckLevel.Info,
        title: '发现额外的 Hook 文件',
        message: `找到 ${additionalHooks.length} 个额外的 hook 文件: ${additionalHooks.join(', ')}`,
      });
    }

    // Summary
    const errorCount = results.filter(r => r.level === CheckLevel.Error).length;
    const warningCount = results.filter(r => r.level === CheckLevel.Warning).length;

    if (errorCount === 0 && warningCount === 0) {
      results.push({
        id: 'hooks-summary',
        category: this.category,
        level: CheckLevel.Success,
        title: 'Hooks 系统正常',
        message: `检查了 ${this.REQUIRED_HOOKS.length} 个必需 hook，全部正常`,
      });
    }

    return results;
  }

  /**
   * Check a single hook file
   */
  private async checkHookFile(
    hooksDir: string,
    hook: { name: string; description: string; type: string },
    context: CheckContext
  ): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const hookPath = path.join(hooksDir, hook.name);

    // Check if file exists
    const exists = await fs.pathExists(hookPath);

    if (!exists) {
      results.push({
        id: `hooks-${hook.name}-missing`,
        category: this.category,
        level: CheckLevel.Error,
        title: `${hook.description}缺失`,
        message: `${hook.name} 不存在`,
        suggestion: `创建 ${hookPath}`,
        filePath: hookPath,
      });
      return results;
    }

    // Check file permissions (for shell scripts)
    if (hook.type === 'shell' && process.platform !== 'win32') {
      try {
        const stats = await fs.stat(hookPath);
        const isExecutable = (stats.mode & 0o111) !== 0;

        if (!isExecutable) {
          results.push({
            id: `hooks-${hook.name}-not-executable`,
            category: this.category,
            level: CheckLevel.Warning,
            title: `${hook.description}不可执行`,
            message: `${hook.name} 缺少执行权限`,
            suggestion: `运行 "chmod +x ${hookPath}"`,
            filePath: hookPath,
            fixable: true,
            fix: async () => {
              await fs.chmod(hookPath, 0o755);
            },
          });
        }
      } catch (error) {
        results.push({
          id: `hooks-${hook.name}-stat-error`,
          category: this.category,
          level: CheckLevel.Warning,
          title: `无法检查 ${hook.description}权限`,
          message: `检查文件权限时发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
          filePath: hookPath,
        });
      }
    }

    // Check file content (basic validation)
    try {
      const content = await fs.readFile(hookPath, 'utf-8');

      if (content.trim().length === 0) {
        results.push({
          id: `hooks-${hook.name}-empty`,
          category: this.category,
          level: CheckLevel.Warning,
          title: `${hook.description}为空`,
          message: `${hook.name} 文件内容为空`,
          suggestion: '添加 hook 实现代码',
          filePath: hookPath,
        });
      } else {
        // Basic syntax check for TypeScript files
        if (hook.type === 'typescript') {
          if (!content.includes('export') && !content.includes('function')) {
            results.push({
              id: `hooks-${hook.name}-invalid-ts`,
              category: this.category,
              level: CheckLevel.Warning,
              title: `${hook.description}可能无效`,
              message: `${hook.name} 缺少 export 或 function 声明`,
              suggestion: '检查 TypeScript 语法',
              filePath: hookPath,
            });
          }
        }

        // Basic syntax check for shell scripts
        if (hook.type === 'shell') {
          if (!content.startsWith('#!')) {
            results.push({
              id: `hooks-${hook.name}-no-shebang`,
              category: this.category,
              level: CheckLevel.Warning,
              title: `${hook.description}缺少 shebang`,
              message: `${hook.name} 缺少 shebang 行（#!/bin/bash）`,
              suggestion: '在文件开头添加 #!/bin/bash',
              filePath: hookPath,
            });
          }
        }
      }

      // If no errors or warnings, add success result
      if (results.length === 0) {
        results.push({
          id: `hooks-${hook.name}-valid`,
          category: this.category,
          level: CheckLevel.Success,
          title: `${hook.description}正常`,
          message: `${hook.name} 文件有效`,
        });
      }
    } catch (error) {
      results.push({
        id: `hooks-${hook.name}-read-error`,
        category: this.category,
        level: CheckLevel.Error,
        title: `无法读取 ${hook.description}`,
        message: `读取 ${hook.name} 时发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        filePath: hookPath,
      });
    }

    return results;
  }

  /**
   * Find additional hook files (not in required list)
   */
  private async findAdditionalHooks(hooksDir: string): Promise<string[]> {
    const additionalHooks: string[] = [];

    try {
      const entries = await fs.readdir(hooksDir, { withFileTypes: true });
      const requiredNames = new Set(this.REQUIRED_HOOKS.map(h => h.name));

      for (const entry of entries) {
        if (entry.isFile() && !requiredNames.has(entry.name)) {
          // Only include .ts, .js, .sh files
          if (entry.name.match(/\.(ts|js|sh)$/)) {
            additionalHooks.push(entry.name);
          }
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return additionalHooks;
  }
}
