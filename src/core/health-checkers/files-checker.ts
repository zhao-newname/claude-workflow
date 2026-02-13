/**
 * Files Checker - Checks project file structure
 *
 * Checks:
 * - Required files exist
 * - File formats are correct
 * - .gitignore is properly configured
 * - dev/ directory structure
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

export class FilesChecker implements IHealthChecker {
  name = 'files-checker';
  category = CheckCategory.Files;
  priority = 2 as const; // P2
  description = '检查项目文件结构';

  // Required files in project root
  private readonly REQUIRED_FILES = [
    {
      path: 'CLAUDE.md',
      description: 'Claude 配置文件',
      required: true,
    },
    {
      path: '.gitignore',
      description: 'Git 忽略配置',
      required: false,
    },
    {
      path: 'package.json',
      description: 'Node.js 项目配置',
      required: false,
    },
  ];

  // Recommended .gitignore entries
  private readonly GITIGNORE_ENTRIES = [
    '.claude/cache/',
    'node_modules/',
    '.env',
    '.DS_Store',
  ];

  async check(context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    // Check required files
    for (const file of this.REQUIRED_FILES) {
      const fileResults = await this.checkFile(context.cwd, file);
      results.push(...fileResults);
    }

    // Check .gitignore content
    const gitignoreResults = await this.checkGitignore(context);
    results.push(...gitignoreResults);

    // Check dev/ directory structure
    const devResults = await this.checkDevDirectory(context);
    results.push(...devResults);

    // Summary
    const errorCount = results.filter(r => r.level === CheckLevel.Error).length;
    const warningCount = results.filter(r => r.level === CheckLevel.Warning).length;

    if (errorCount === 0 && warningCount === 0) {
      results.push({
        id: 'files-summary',
        category: this.category,
        level: CheckLevel.Success,
        title: '文件结构正常',
        message: '项目文件结构完整',
      });
    }

    return results;
  }

  /**
   * Check a single file
   */
  private async checkFile(
    cwd: string,
    file: { path: string; description: string; required: boolean }
  ): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const filePath = path.join(cwd, file.path);
    const exists = await fs.pathExists(filePath);

    if (!exists) {
      if (file.required) {
        results.push({
          id: `files-${file.path}-missing`,
          category: this.category,
          level: CheckLevel.Error,
          title: `${file.description}缺失`,
          message: `${file.path} 不存在`,
          suggestion: `创建 ${file.path} 文件`,
          filePath,
        });
      } else {
        results.push({
          id: `files-${file.path}-missing`,
          category: this.category,
          level: CheckLevel.Info,
          title: `${file.description}不存在`,
          message: `${file.path} 不存在（可选）`,
          filePath,
        });
      }
    } else {
      // Check if file is readable
      try {
        await fs.access(filePath, fs.constants.R_OK);
        results.push({
          id: `files-${file.path}-exists`,
          category: this.category,
          level: CheckLevel.Success,
          title: `${file.description}存在`,
          message: `${file.path} 文件正常`,
        });
      } catch (error) {
        results.push({
          id: `files-${file.path}-not-readable`,
          category: this.category,
          level: CheckLevel.Error,
          title: `${file.description}不可读`,
          message: `${file.path} 存在但无法读取`,
          suggestion: '检查文件权限',
          filePath,
        });
      }
    }

    return results;
  }

  /**
   * Check .gitignore content
   */
  private async checkGitignore(context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const gitignorePath = path.join(context.cwd, '.gitignore');

    // Check if .gitignore exists
    const exists = await fs.pathExists(gitignorePath);

    if (!exists) {
      results.push({
        id: 'files-gitignore-missing',
        category: this.category,
        level: CheckLevel.Info,
        title: '.gitignore 不存在',
        message: '项目没有 .gitignore 文件',
        suggestion: '创建 .gitignore 文件以忽略不必要的文件',
        filePath: gitignorePath,
      });
      return results;
    }

    // Read and check content
    try {
      const content = await fs.readFile(gitignorePath, 'utf-8');
      const missingEntries: string[] = [];

      for (const entry of this.GITIGNORE_ENTRIES) {
        if (!content.includes(entry)) {
          missingEntries.push(entry);
        }
      }

      if (missingEntries.length > 0) {
        results.push({
          id: 'files-gitignore-incomplete',
          category: this.category,
          level: CheckLevel.Info,
          title: '.gitignore 可以改进',
          message: `建议添加以下条目: ${missingEntries.join(', ')}`,
          suggestion: '将这些条目添加到 .gitignore',
          filePath: gitignorePath,
        });
      } else {
        results.push({
          id: 'files-gitignore-complete',
          category: this.category,
          level: CheckLevel.Success,
          title: '.gitignore 配置完整',
          message: '.gitignore 包含推荐的忽略条目',
        });
      }
    } catch (error) {
      results.push({
        id: 'files-gitignore-read-error',
        category: this.category,
        level: CheckLevel.Warning,
        title: '无法读取 .gitignore',
        message: `读取 .gitignore 时发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        filePath: gitignorePath,
      });
    }

    return results;
  }

  /**
   * Check dev/ directory structure
   */
  private async checkDevDirectory(context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const devDir = path.join(context.cwd, 'dev');

    // Check if dev/ directory exists
    const exists = await fs.pathExists(devDir);

    if (!exists) {
      results.push({
        id: 'files-dev-dir-missing',
        category: this.category,
        level: CheckLevel.Info,
        title: 'dev/ 目录不存在',
        message: 'dev/ 目录不存在（可选）',
        suggestion: '如果使用 dev docs 功能，创建 dev/ 目录',
        filePath: devDir,
      });
      return results;
    }

    // Check subdirectories
    const subdirs = ['active', 'archive', 'templates'];
    let foundSubdirs = 0;

    for (const subdir of subdirs) {
      const subdirPath = path.join(devDir, subdir);
      const subdirExists = await fs.pathExists(subdirPath);

      if (subdirExists) {
        foundSubdirs++;
      }
    }

    if (foundSubdirs > 0) {
      results.push({
        id: 'files-dev-dir-exists',
        category: this.category,
        level: CheckLevel.Success,
        title: 'dev/ 目录结构正常',
        message: `dev/ 目录包含 ${foundSubdirs} 个子目录`,
      });
    } else {
      results.push({
        id: 'files-dev-dir-empty',
        category: this.category,
        level: CheckLevel.Info,
        title: 'dev/ 目录为空',
        message: 'dev/ 目录存在但没有标准子目录',
        suggestion: '创建 active/, archive/, templates/ 子目录',
        filePath: devDir,
      });
    }

    return results;
  }
}
