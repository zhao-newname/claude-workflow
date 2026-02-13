/**
 * Diagnostic Formatter - Formats diagnostic reports for output
 */

import chalk from 'chalk';
import type { DiagnosticReport, DiagnosticStats } from './diagnostic-report.js';
import { CheckLevel, CheckCategory, type CheckResult } from '../types/health-checker.js';

/**
 * Formatter options
 */
export interface FormatterOptions {
  /** Use colored output */
  color?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** JSON output */
  json?: boolean;
}

/**
 * Category display names
 */
const CATEGORY_NAMES: Record<CheckCategory, string> = {
  [CheckCategory.Initialization]: '项目初始化',
  [CheckCategory.ClaudeMd]: 'CLAUDE.md 配置',
  [CheckCategory.SkillRules]: 'skill-rules.json 配置',
  [CheckCategory.Configuration]: 'settings.json 配置',
  [CheckCategory.Skills]: '技能系统',
  [CheckCategory.Hooks]: 'Hooks 系统',
  [CheckCategory.Files]: '文件结构',
  [CheckCategory.Environment]: '环境配置',
  [CheckCategory.Security]: '安全检查',
  [CheckCategory.Performance]: '性能检查',
  [CheckCategory.Platform]: '跨平台兼容性',
};

/**
 * Level icons and colors
 */
const LEVEL_CONFIG = {
  [CheckLevel.Error]: {
    icon: '❌',
    color: chalk.red,
    label: '错误',
  },
  [CheckLevel.Warning]: {
    icon: '⚠️',
    color: chalk.yellow,
    label: '警告',
  },
  [CheckLevel.Info]: {
    icon: '💡',
    color: chalk.blue,
    label: '信息',
  },
  [CheckLevel.Success]: {
    icon: '✅',
    color: chalk.green,
    label: '成功',
  },
};

/**
 * Diagnostic formatter
 */
export class DiagnosticFormatter {
  private options: Required<FormatterOptions>;

  constructor(options: FormatterOptions = {}) {
    this.options = {
      color: options.color ?? true,
      verbose: options.verbose ?? false,
      json: options.json ?? false,
    };

    // Disable colors if requested
    if (!this.options.color) {
      chalk.level = 0;
    }
  }

  /**
   * Format the diagnostic report
   */
  format(report: DiagnosticReport): string {
    if (this.options.json) {
      return this.formatJSON(report);
    }

    return this.formatTerminal(report);
  }

  /**
   * Format as JSON
   */
  private formatJSON(report: DiagnosticReport): string {
    return JSON.stringify(report.toJSON(), null, 2);
  }

  /**
   * Format for terminal output
   */
  private formatTerminal(report: DiagnosticReport): string {
    const lines: string[] = [];

    // Header
    lines.push('');
    lines.push(chalk.bold('🔍 Claude Workflow 健康检查'));
    lines.push(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    lines.push('');

    // Group results by category
    const grouped = report.getResultsByCategories();
    const sortedCategories = this.sortCategories(Array.from(grouped.keys()));

    for (const category of sortedCategories) {
      const results = grouped.get(category) || [];
      if (results.length === 0) continue;

      lines.push(this.formatCategory(category, results));
    }

    // Summary
    lines.push(this.formatSummary(report));

    // Footer with suggestions
    lines.push(this.formatFooter(report));

    return lines.join('\n');
  }

  /**
   * Format a category section
   */
  private formatCategory(category: CheckCategory, results: CheckResult[]): string {
    const lines: string[] = [];

    // Determine overall status for category
    const hasErrors = results.some(r => r.level === CheckLevel.Error);
    const hasWarnings = results.some(r => r.level === CheckLevel.Warning);
    const allSuccess = results.every(r => r.level === CheckLevel.Success);

    let icon: string;
    let color: chalk.Chalk;

    if (hasErrors) {
      icon = '❌';
      color = chalk.red;
    } else if (hasWarnings) {
      icon = '⚠️';
      color = chalk.yellow;
    } else if (allSuccess) {
      icon = '✅';
      color = chalk.green;
    } else {
      icon = '💡';
      color = chalk.blue;
    }

    // Category header
    const categoryName = CATEGORY_NAMES[category] || category;
    lines.push(color(`${icon} ${categoryName}`));

    // Results
    for (const result of results) {
      lines.push(this.formatResult(result));
    }

    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format a single result
   */
  private formatResult(result: CheckResult): string {
    const config = LEVEL_CONFIG[result.level];
    const lines: string[] = [];

    if (this.options.verbose) {
      // Verbose mode: show full details
      lines.push(chalk.gray(`   ${config.icon} ${result.title}`));
      lines.push(chalk.gray(`      ${result.message}`));

      if (result.filePath) {
        const location = result.line
          ? `${result.filePath}:${result.line}`
          : result.filePath;
        lines.push(chalk.gray(`      📁 ${location}`));
      }

      if (result.suggestion) {
        lines.push(config.color(`      → ${result.suggestion}`));
      }

      if (result.fixable) {
        lines.push(chalk.cyan(`      🔧 可自动修复`));
      }
    } else {
      // Compact mode: show summary
      if (result.level === CheckLevel.Success) {
        lines.push(chalk.gray(`   ✓ ${result.title}`));
      } else {
        lines.push(chalk.gray(`   ${config.icon} ${result.message}`));
        if (result.suggestion) {
          lines.push(config.color(`   → ${result.suggestion}`));
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Format summary section
   */
  private formatSummary(report: DiagnosticReport): string {
    const stats = report.getStats();
    const lines: string[] = [];

    lines.push(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    // Summary line
    const parts: string[] = [];

    if (stats.errors > 0) {
      parts.push(chalk.red(`${stats.errors} 个错误`));
    }
    if (stats.warnings > 0) {
      parts.push(chalk.yellow(`${stats.warnings} 个警告`));
    }
    if (stats.info > 0) {
      parts.push(chalk.blue(`${stats.info} 个信息`));
    }

    const summary = parts.length > 0 ? parts.join(', ') : chalk.green('所有检查通过');
    lines.push(chalk.bold(`📊 总结: ${summary}`));

    // Duration
    const duration = (report.getDuration() / 1000).toFixed(2);
    lines.push(chalk.gray(`⏱️  耗时: ${duration}s`));

    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format footer with suggestions
   */
  private formatFooter(report: DiagnosticReport): string {
    const lines: string[] = [];
    const stats = report.getStats();

    if (stats.fixable > 0) {
      lines.push(chalk.cyan(`💡 运行 'cw doctor --fix' 尝试自动修复 ${stats.fixable} 个问题`));
    }

    if (stats.errors > 0 || stats.warnings > 0) {
      if (!this.options.verbose) {
        lines.push(chalk.gray(`💡 运行 'cw doctor --verbose' 查看详细信息`));
      }
    }

    if (report.isHealthy()) {
      lines.push(chalk.green('✨ 项目配置健康！'));
    }

    lines.push('');

    return lines.join('\n');
  }

  /**
   * Sort categories by priority
   */
  private sortCategories(categories: CheckCategory[]): CheckCategory[] {
    const priority: Record<CheckCategory, number> = {
      [CheckCategory.Initialization]: 0,
      [CheckCategory.ClaudeMd]: 1,
      [CheckCategory.SkillRules]: 2,
      [CheckCategory.Configuration]: 3,
      [CheckCategory.Skills]: 4,
      [CheckCategory.Hooks]: 5,
      [CheckCategory.Files]: 6,
      [CheckCategory.Environment]: 7,
      [CheckCategory.Security]: 8,
      [CheckCategory.Performance]: 9,
      [CheckCategory.Platform]: 10,
    };

    return categories.sort((a, b) => priority[a] - priority[b]);
  }

  /**
   * Format a simple message
   */
  static formatMessage(level: CheckLevel, message: string): string {
    const config = LEVEL_CONFIG[level];
    return config.color(`${config.icon} ${message}`);
  }

  /**
   * Format a progress message
   */
  static formatProgress(current: number, total: number, message: string): string {
    const percentage = Math.round((current / total) * 100);
    return chalk.gray(`[${current}/${total}] ${percentage}% - ${message}`);
  }
}
