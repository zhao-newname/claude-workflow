/**
 * Config Checker - Checks settings.json configuration
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
 * Checks settings.json configuration validity
 */
export class ConfigChecker implements IHealthChecker {
  name = 'config-checker';
  category = CheckCategory.Configuration;
  priority = 0 as const; // P0 - Critical
  description = '检查 settings.json 配置';

  async check(context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const settingsPath = path.join(context.claudeDir, 'settings.json');

    // Check if file exists (should be checked by ProjectChecker, but double-check)
    if (!(await fs.pathExists(settingsPath))) {
      return results; // Skip if not exists
    }

    // Read and validate config
    try {
      const config = await fs.readJson(settingsPath);

      // Validate mode
      if (config.mode && !['single-agent', 'multi-agent'].includes(config.mode)) {
        results.push({
          id: 'config-invalid-mode',
          category: this.category,
          level: CheckLevel.Error,
          title: 'mode 配置无效',
          message: `mode 值无效: ${config.mode}`,
          suggestion: '将 mode 设置为 "single-agent" 或 "multi-agent"',
          filePath: settingsPath,
        });
      }

      // Check for deprecated fields
      const deprecatedFields = ['agent', 'workflow', 'legacy'];
      const foundDeprecated = deprecatedFields.filter(field => field in config);

      if (foundDeprecated.length > 0) {
        results.push({
          id: 'config-deprecated-fields',
          category: this.category,
          level: CheckLevel.Warning,
          title: '配置包含废弃字段',
          message: `发现废弃字段: ${foundDeprecated.join(', ')}`,
          suggestion: '移除废弃字段或参考最新文档',
          filePath: settingsPath,
        });
      }

      // If no issues, add success result
      if (results.length === 0) {
        results.push({
          id: 'config-valid',
          category: this.category,
          level: CheckLevel.Success,
          title: '配置文件有效',
          message: 'settings.json 配置正确',
        });
      }
    } catch (error) {
      // Should not happen as ProjectChecker already validates JSON
      results.push({
        id: 'config-error',
        category: this.category,
        level: CheckLevel.Error,
        title: '配置文件读取失败',
        message: `无法读取 settings.json: ${error instanceof Error ? error.message : '未知错误'}`,
        filePath: settingsPath,
      });
    }

    return results;
  }
}
