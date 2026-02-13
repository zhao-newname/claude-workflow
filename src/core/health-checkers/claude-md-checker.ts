/**
 * CLAUDE.md Checker - Checks CLAUDE.md preset configuration
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
 * Checks if CLAUDE.md has proper CW preset configuration
 */
export class ClaudeMdChecker implements IHealthChecker {
  name = 'claude-md-checker';
  category = CheckCategory.ClaudeMd;
  priority = 0 as const; // P0 - Critical
  description = '检查 CLAUDE.md 预设配置';

  async check(context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const claudeMdPath = path.join(context.cwd, 'CLAUDE.md');

    // Check if CLAUDE.md exists
    const existsResult = await this.checkExists(claudeMdPath);
    results.push(existsResult);

    if (existsResult.level === CheckLevel.Error) {
      return results;
    }

    // Read file content
    const content = await fs.readFile(claudeMdPath, 'utf-8');

    // Check preset markers
    const markersResult = this.checkPresetMarkers(content, claudeMdPath);
    results.push(markersResult);

    // Check preset version
    const versionResult = this.checkPresetVersion(content, claudeMdPath);
    results.push(versionResult);

    return results;
  }

  /**
   * Check if CLAUDE.md exists
   */
  private async checkExists(filePath: string): Promise<CheckResult> {
    const exists = await fs.pathExists(filePath);

    if (!exists) {
      return {
        id: 'claude-md-exists',
        category: this.category,
        level: CheckLevel.Error,
        title: 'CLAUDE.md 缺失',
        message: 'CLAUDE.md 文件不存在',
        suggestion: '创建 CLAUDE.md 文件并添加 CW 预设配置',
        filePath,
      };
    }

    return {
      id: 'claude-md-exists',
      category: this.category,
      level: CheckLevel.Success,
      title: 'CLAUDE.md 存在',
      message: 'CLAUDE.md 文件已创建',
    };
  }

  /**
   * Check preset markers
   */
  private checkPresetMarkers(content: string, filePath: string): CheckResult {
    const hasStartMarker = content.includes('<!-- CW_PRESET_START -->');
    const hasEndMarker = content.includes('<!-- CW_PRESET_END -->');

    if (!hasStartMarker && !hasEndMarker) {
      return {
        id: 'claude-md-markers',
        category: this.category,
        level: CheckLevel.Error,
        title: 'CW 预设标记缺失',
        message: 'CLAUDE.md 缺少 CW_PRESET_START 和 CW_PRESET_END 标记',
        suggestion: '运行 "cw init" 添加 CW 预设配置',
        filePath,
      };
    }

    if (!hasStartMarker) {
      return {
        id: 'claude-md-markers',
        category: this.category,
        level: CheckLevel.Error,
        title: 'CW 预设起始标记缺失',
        message: 'CLAUDE.md 缺少 <!-- CW_PRESET_START --> 标记',
        suggestion: '检查 CLAUDE.md 文件，确保预设标记完整',
        filePath,
      };
    }

    if (!hasEndMarker) {
      return {
        id: 'claude-md-markers',
        category: this.category,
        level: CheckLevel.Error,
        title: 'CW 预设结束标记缺失',
        message: 'CLAUDE.md 缺少 <!-- CW_PRESET_END --> 标记',
        suggestion: '检查 CLAUDE.md 文件，确保预设标记完整',
        filePath,
      };
    }

    // Check marker order
    const startIndex = content.indexOf('<!-- CW_PRESET_START -->');
    const endIndex = content.indexOf('<!-- CW_PRESET_END -->');

    if (startIndex > endIndex) {
      return {
        id: 'claude-md-markers',
        category: this.category,
        level: CheckLevel.Error,
        title: 'CW 预设标记顺序错误',
        message: 'CW_PRESET_END 标记出现在 CW_PRESET_START 之前',
        suggestion: '检查 CLAUDE.md 文件，确保标记顺序正确',
        filePath,
      };
    }

    return {
      id: 'claude-md-markers',
      category: this.category,
      level: CheckLevel.Success,
      title: 'CW 预设标记正确',
      message: 'CLAUDE.md 包含正确的预设标记',
    };
  }

  /**
   * Check preset version
   */
  private checkPresetVersion(content: string, filePath: string): CheckResult {
    const versionMatch = content.match(/<!--\s*Version:\s*([\d.]+)\s*-->/);

    if (!versionMatch) {
      return {
        id: 'claude-md-version',
        category: this.category,
        level: CheckLevel.Warning,
        title: 'CW 预设版本标记缺失',
        message: 'CLAUDE.md 缺少版本标记',
        suggestion: '添加 <!-- Version: X.X.X --> 标记',
        filePath,
      };
    }

    const version = versionMatch[1];

    // Simple version format check
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      return {
        id: 'claude-md-version',
        category: this.category,
        level: CheckLevel.Warning,
        title: 'CW 预设版本格式错误',
        message: `版本号格式不正确: ${version}`,
        suggestion: '使用 semver 格式（如 1.2.0）',
        filePath,
      };
    }

    return {
      id: 'claude-md-version',
      category: this.category,
      level: CheckLevel.Success,
      title: 'CW 预设版本正确',
      message: `版本: ${version}`,
    };
  }
}
