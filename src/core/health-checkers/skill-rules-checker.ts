/**
 * Skill Rules Checker - Checks skill-rules.json configuration
 *
 * According to skill-developer guide:
 * - skill-rules.json should be at .claude/skills/skill-rules.json (single file)
 * - Contains configuration for ALL skills
 * - Each skill entry should have: type, enforcement, priority, promptTriggers
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

interface SkillConfig {
  type?: string;
  enforcement?: string;
  priority?: string;
  description?: string;
  promptTriggers?: {
    keywords?: string[];
    intentPatterns?: string[];
  };
  fileTriggers?: {
    pathPatterns?: string[];
    pathExclusions?: string[];
    contentPatterns?: string[];
  };
  blockMessage?: string;
  skipConditions?: any;
}

interface SkillRulesFile {
  version?: string;
  skills?: {
    [skillName: string]: SkillConfig;
  };
}

/**
 * Checks if skill-rules.json configuration is valid
 */
export class SkillRulesChecker implements IHealthChecker {
  name = 'skill-rules-checker';
  category = CheckCategory.SkillRules;
  priority = 0 as const; // P0 - Critical
  description = '检查 skill-rules.json 配置';

  async check(context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const skillRulesPath = path.join(context.claudeDir, 'skills', 'skill-rules.json');

    // Check if skill-rules.json exists
    const exists = await fs.pathExists(skillRulesPath);

    if (!exists) {
      results.push({
        id: 'skill-rules-missing',
        category: this.category,
        level: CheckLevel.Warning,
        title: 'skill-rules.json 不存在',
        message: '.claude/skills/skill-rules.json 配置文件不存在',
        suggestion: '创建 skill-rules.json 文件来配置技能触发规则',
        filePath: skillRulesPath,
      });
      return results;
    }

    // Try to parse JSON
    let fileContent: SkillRulesFile;
    try {
      fileContent = await fs.readJson(skillRulesPath);
    } catch (error) {
      results.push({
        id: 'skill-rules-invalid-json',
        category: this.category,
        level: CheckLevel.Error,
        title: 'skill-rules.json 格式错误',
        message: `无法解析 skill-rules.json: ${error instanceof Error ? error.message : '未知错误'}`,
        suggestion: '检查 JSON 语法是否正确',
        filePath: skillRulesPath,
      });
      return results;
    }

    // Check if skills object exists
    if (!fileContent.skills || typeof fileContent.skills !== 'object') {
      results.push({
        id: 'skill-rules-no-skills-object',
        category: this.category,
        level: CheckLevel.Error,
        title: 'skill-rules.json 缺少 skills 对象',
        message: '配置文件必须包含 "skills" 对象',
        suggestion: '添加 "skills": {} 对象来包含技能配置',
        filePath: skillRulesPath,
      });
      return results;
    }

    const skillsConfig = fileContent.skills;

    // Validate configuration structure
    const validationResults = await this.validateConfig(skillsConfig, skillRulesPath, context);
    results.push(...validationResults);

    // If no errors, add success result
    const errorCount = results.filter(r => r.level === CheckLevel.Error).length;
    if (errorCount === 0) {
      results.push({
        id: 'skill-rules-valid',
        category: this.category,
        level: CheckLevel.Success,
        title: 'skill-rules.json 配置正确',
        message: `配置了 ${Object.keys(skillsConfig).length} 个技能的触发规则`,
      });
    }

    return results;
  }

  /**
   * Validate skill-rules.json configuration
   */
  private async validateConfig(
    skillsConfig: { [skillName: string]: SkillConfig },
    filePath: string,
    context: CheckContext
  ): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    // Check if config is empty
    if (Object.keys(skillsConfig).length === 0) {
      results.push({
        id: 'skill-rules-empty',
        category: this.category,
        level: CheckLevel.Warning,
        title: 'skill-rules.json 为空',
        message: 'skills 对象中没有定义任何技能规则',
        suggestion: '为已安装的技能添加触发规则配置',
        filePath,
      });
      return results;
    }

    // Get list of installed skills
    const installedSkills = await this.getInstalledSkills(context);

    // Validate each skill entry
    for (const [skillName, skillConfig] of Object.entries(skillsConfig)) {
      // Check if skill is installed
      if (!installedSkills.includes(skillName)) {
        results.push({
          id: `skill-rules-${skillName}-not-installed`,
          category: this.category,
          level: CheckLevel.Warning,
          title: `技能 ${skillName} 未安装`,
          message: `skill-rules.json 中配置了 ${skillName}，但该技能未安装`,
          suggestion: `删除 ${skillName} 的配置，或安装该技能`,
          filePath,
        });
        continue;
      }

      // Validate required fields
      if (!skillConfig.type) {
        results.push({
          id: `skill-rules-${skillName}-no-type`,
          category: this.category,
          level: CheckLevel.Error,
          title: `技能 ${skillName} 缺少 type 字段`,
          message: 'type 字段是必需的（domain 或 guardrail）',
          suggestion: '添加 "type": "domain" 或 "type": "guardrail"',
          filePath,
        });
      } else if (!['domain', 'guardrail'].includes(skillConfig.type)) {
        results.push({
          id: `skill-rules-${skillName}-invalid-type`,
          category: this.category,
          level: CheckLevel.Error,
          title: `技能 ${skillName} type 值无效`,
          message: `type 必须是 "domain" 或 "guardrail"，当前值: ${skillConfig.type}`,
          suggestion: '将 type 改为 "domain" 或 "guardrail"',
          filePath,
        });
      }

      if (!skillConfig.enforcement) {
        results.push({
          id: `skill-rules-${skillName}-no-enforcement`,
          category: this.category,
          level: CheckLevel.Error,
          title: `技能 ${skillName} 缺少 enforcement 字段`,
          message: 'enforcement 字段是必需的（block, suggest, warn）',
          suggestion: '添加 "enforcement": "suggest" 或其他值',
          filePath,
        });
      } else if (!['block', 'suggest', 'warn'].includes(skillConfig.enforcement)) {
        results.push({
          id: `skill-rules-${skillName}-invalid-enforcement`,
          category: this.category,
          level: CheckLevel.Error,
          title: `技能 ${skillName} enforcement 值无效`,
          message: `enforcement 必须是 "block", "suggest" 或 "warn"，当前值: ${skillConfig.enforcement}`,
          suggestion: '将 enforcement 改为有效值',
          filePath,
        });
      }

      if (!skillConfig.priority) {
        results.push({
          id: `skill-rules-${skillName}-no-priority`,
          category: this.category,
          level: CheckLevel.Warning,
          title: `技能 ${skillName} 缺少 priority 字段`,
          message: 'priority 字段建议添加（critical, high, medium, low）',
          suggestion: '添加 "priority": "medium" 或其他值',
          filePath,
        });
      }

      // Check if at least one trigger is defined
      const hasPromptTriggers = skillConfig.promptTriggers &&
        (skillConfig.promptTriggers.keywords?.length || skillConfig.promptTriggers.intentPatterns?.length);
      const hasFileTriggers = skillConfig.fileTriggers &&
        (skillConfig.fileTriggers.pathPatterns?.length || skillConfig.fileTriggers.contentPatterns?.length);

      if (!hasPromptTriggers && !hasFileTriggers) {
        results.push({
          id: `skill-rules-${skillName}-no-triggers`,
          category: this.category,
          level: CheckLevel.Warning,
          title: `技能 ${skillName} 没有触发器`,
          message: '未定义任何触发条件，技能可能无法被激活',
          suggestion: '添加 promptTriggers 或 fileTriggers',
          filePath,
        });
      }
    }

    // Check for skills without rules
    for (const skillName of installedSkills) {
      if (!skillsConfig[skillName]) {
        results.push({
          id: `skill-rules-${skillName}-missing`,
          category: this.category,
          level: CheckLevel.Info,
          title: `技能 ${skillName} 未配置触发规则`,
          message: `已安装的技能 ${skillName} 在 skill-rules.json 的 skills 对象中没有配置`,
          suggestion: `在 skill-rules.json 的 "skills" 对象中添加 "${skillName}": {...} 配置`,
          filePath,
        });
      }
    }

    return results;
  }

  /**
   * Get list of installed skills
   */
  private async getInstalledSkills(context: CheckContext): Promise<string[]> {
    const skills: string[] = [];
    const skillsDir = path.join(context.claudeDir, 'skills');

    if (!(await fs.pathExists(skillsDir))) {
      return skills;
    }

    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        skills.push(entry.name);
      }
    }

    return skills;
  }
}
