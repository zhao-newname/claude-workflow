/**
 * Environment Checker - Checks Node.js environment and dependencies
 */

import { execSync } from 'child_process';
import {
  IHealthChecker,
  CheckContext,
  CheckResult,
  CheckLevel,
  CheckCategory,
} from '../../types/health-checker.js';

/**
 * Checks Node.js environment and dependencies
 */
export class EnvironmentChecker implements IHealthChecker {
  name = 'environment-checker';
  category = CheckCategory.Environment;
  priority = 0 as const; // P0 - Critical
  description = '检查 Node.js 环境';

  async check(context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    // Check Node.js version
    const nodeResult = this.checkNodeVersion();
    results.push(nodeResult);

    // Check package manager
    const pmResult = this.checkPackageManager();
    results.push(pmResult);

    return results;
  }

  /**
   * Check Node.js version
   */
  private checkNodeVersion(): CheckResult {
    const nodeVersion = process.version;
    const versionMatch = nodeVersion.match(/^v(\d+)\.(\d+)\.(\d+)/);

    if (!versionMatch) {
      return {
        id: 'env-node-version',
        category: this.category,
        level: CheckLevel.Error,
        title: 'Node.js 版本无法识别',
        message: `无法解析 Node.js 版本: ${nodeVersion}`,
        suggestion: '检查 Node.js 安装',
      };
    }

    const major = parseInt(versionMatch[1], 10);

    if (major < 18) {
      return {
        id: 'env-node-version',
        category: this.category,
        level: CheckLevel.Error,
        title: 'Node.js 版本过低',
        message: `当前版本 ${nodeVersion}，需要 >= 18.0.0`,
        suggestion: '升级 Node.js 到 18.0.0 或更高版本',
      };
    }

    return {
      id: 'env-node-version',
      category: this.category,
      level: CheckLevel.Success,
      title: 'Node.js 版本正确',
      message: `Node.js ${nodeVersion}`,
    };
  }

  /**
   * Check package manager availability
   */
  private checkPackageManager(): CheckResult {
    const packageManagers = ['npm', 'yarn', 'pnpm'];
    const available: string[] = [];

    for (const pm of packageManagers) {
      try {
        execSync(`${pm} --version`, { stdio: 'ignore' });
        available.push(pm);
      } catch {
        // Package manager not available
      }
    }

    if (available.length === 0) {
      return {
        id: 'env-package-manager',
        category: this.category,
        level: CheckLevel.Error,
        title: '包管理器不可用',
        message: '未找到可用的包管理器（npm/yarn/pnpm）',
        suggestion: '安装 npm、yarn 或 pnpm',
      };
    }

    return {
      id: 'env-package-manager',
      category: this.category,
      level: CheckLevel.Success,
      title: '包管理器可用',
      message: `可用: ${available.join(', ')}`,
    };
  }
}
