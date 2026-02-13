/**
 * Skills Checker - Checks skills system integrity
 *
 * Checks:
 * - SKILL.md files exist for all skills
 * - Skill metadata is valid
 * - Skills can be loaded
 * - Three-layer skill system works
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
import { parseFrontmatter } from '../../utils/fs.js';

export class SkillsChecker implements IHealthChecker {
  name = 'skills-checker';
  category = CheckCategory.Skills;
  priority = 1 as const; // P1
  description = '检查技能系统完整性';

  async check(context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];

    // Get all skill directories
    const skillDirs = await this.findSkillDirectories(context);

    if (skillDirs.length === 0) {
      results.push({
        id: 'skills-no-skills',
        category: this.category,
        level: CheckLevel.Info,
        title: '未找到技能',
        message: '项目中没有安装技能',
        suggestion: '运行 "cw skills add <skill-name>" 添加技能',
      });
      return results;
    }

    // Check each skill
    for (const skillDir of skillDirs) {
      const skillResults = await this.checkSkill(skillDir, context);
      results.push(...skillResults);
    }

    // Summary
    const errorCount = results.filter(r => r.level === CheckLevel.Error).length;
    const warningCount = results.filter(r => r.level === CheckLevel.Warning).length;

    if (errorCount === 0 && warningCount === 0) {
      results.push({
        id: 'skills-summary',
        category: this.category,
        level: CheckLevel.Success,
        title: '技能系统正常',
        message: `检查了 ${skillDirs.length} 个技能，全部正常`,
      });
    }

    return results;
  }

  /**
   * Find all skill directories
   */
  private async findSkillDirectories(context: CheckContext): Promise<string[]> {
    const skillDirs: string[] = [];
    const projectSkillsDir = path.join(context.claudeDir, 'skills');

    // Check project skills
    if (await fs.pathExists(projectSkillsDir)) {
      const entries = await fs.readdir(projectSkillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          skillDirs.push(path.join(projectSkillsDir, entry.name));
        }
      }
    }

    return skillDirs;
  }

  /**
   * Check a single skill
   */
  private async checkSkill(skillDir: string, context: CheckContext): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const skillName = path.basename(skillDir);
    const skillMdPath = path.join(skillDir, 'SKILL.md');

    // Check if SKILL.md exists
    const exists = await fs.pathExists(skillMdPath);

    if (!exists) {
      results.push({
        id: `skills-${skillName}-no-skill-md`,
        category: this.category,
        level: CheckLevel.Error,
        title: `技能 ${skillName} 缺少 SKILL.md`,
        message: `${skillName}/SKILL.md 不存在`,
        suggestion: `创建 ${skillMdPath}`,
        filePath: skillMdPath,
      });
      return results;
    }

    // Try to read and parse SKILL.md
    try {
      const content = await fs.readFile(skillMdPath, 'utf-8');

      // Parse frontmatter
      const { frontmatter, body } = parseFrontmatter(content);

      // Check required frontmatter fields
      if (!frontmatter.name) {
        results.push({
          id: `skills-${skillName}-no-name`,
          category: this.category,
          level: CheckLevel.Error,
          title: `技能 ${skillName} 缺少 name 字段`,
          message: 'SKILL.md frontmatter 缺少 name 字段',
          suggestion: '在 YAML frontmatter 中添加 name 字段',
          filePath: skillMdPath,
        });
      }

      if (!frontmatter.description) {
        results.push({
          id: `skills-${skillName}-no-description`,
          category: this.category,
          level: CheckLevel.Warning,
          title: `技能 ${skillName} 缺少 description`,
          message: 'SKILL.md frontmatter 缺少 description 字段',
          suggestion: '在 YAML frontmatter 中添加 description 字段',
          filePath: skillMdPath,
        });
      }

      // Check for trigger configuration
      const hasKeywords = frontmatter.keywords &&
        (Array.isArray(frontmatter.keywords) ? frontmatter.keywords.length > 0 : true);
      const hasIntentPatterns = frontmatter.intentPatterns &&
        (Array.isArray(frontmatter.intentPatterns) ? frontmatter.intentPatterns.length > 0 : true);
      const hasPathPatterns = frontmatter.pathPatterns &&
        (Array.isArray(frontmatter.pathPatterns) ? frontmatter.pathPatterns.length > 0 : true);
      const hasContentPatterns = frontmatter.contentPatterns &&
        (Array.isArray(frontmatter.contentPatterns) ? frontmatter.contentPatterns.length > 0 : true);

      const hasTriggers = hasKeywords || hasIntentPatterns || hasPathPatterns || hasContentPatterns;

      if (!hasTriggers) {
        results.push({
          id: `skills-${skillName}-no-triggers`,
          category: this.category,
          level: CheckLevel.Warning,
          title: `技能 ${skillName} 缺少触发器配置`,
          message: 'SKILL.md frontmatter 中未定义任何触发条件（keywords, intentPatterns, pathPatterns, contentPatterns）',
          suggestion: '在 YAML frontmatter 中添加触发器配置：\n' +
            '   • keywords: 关键词列表，用于显式匹配\n' +
            '   • intentPatterns: 意图模式（正则表达式），用于隐式匹配\n' +
            '   • pathPatterns: 文件路径模式（glob），用于文件触发\n' +
            '   • contentPatterns: 文件内容模式（正则表达式），用于内容检测\n' +
            '   参考：.claude/skills/skill-developer/SKILL.md',
          filePath: skillMdPath,
        });
      }

      // Check if body is empty
      if (!body || body.trim().length === 0) {
        results.push({
          id: `skills-${skillName}-empty-content`,
          category: this.category,
          level: CheckLevel.Warning,
          title: `技能 ${skillName} 内容为空`,
          message: `技能 ${skillName} 的 SKILL.md 仅有 frontmatter，缺少实际内容`,
          suggestion: '根据 Anthropic 最佳实践，SKILL.md 必须包含：\n' +
            '   • ## Purpose - 说明技能用途（Claude 需要理解这个技能做什么）\n' +
            '   • ## When to Use - 使用场景（帮助 Claude 判断何时激活）\n' +
            '   • ## Key Information - 具体指导内容（实际的知识和最佳实践）\n' +
            '   参考：.claude/skills/skill-developer/SKILL.md',
          filePath: skillMdPath,
        });
      }

      // If no errors, add success result
      if (results.length === 0) {
        results.push({
          id: `skills-${skillName}-valid`,
          category: this.category,
          level: CheckLevel.Success,
          title: `技能 ${skillName} 有效`,
          message: 'SKILL.md 格式正确',
        });
      }
    } catch (error) {
      results.push({
        id: `skills-${skillName}-read-error`,
        category: this.category,
        level: CheckLevel.Error,
        title: `技能 ${skillName} 读取失败`,
        message: `无法读取 SKILL.md: ${error instanceof Error ? error.message : '未知错误'}`,
        filePath: skillMdPath,
      });
    }

    return results;
  }
}
