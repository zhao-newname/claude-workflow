/**
 * SkillManager - Manages skill loading and caching
 *
 * Implements three-layer skill loading priority:
 * 1. Project skills (.claude/skills/)
 * 2. Tech-stack skills (global/tech-stack/)
 * 3. Universal skills (global/universal/)
 *
 * Inspired by claude-code-infrastructure-showcase
 */

import path from 'path';
import fs from 'fs-extra';
import type { Skill, SkillQuery } from '../types/index.js';
import type { ISkillManager, ISkillLoader, IConfigManager, SkillStatus } from '../types/interfaces.js';
import { parseFrontmatter, fileExists } from '../utils/fs.js';
import { logger } from '../utils/logger.js';
import { TriggerOrchestrator, TriggerEvaluationSummary } from './trigger-orchestrator.js';

export class SkillManager implements ISkillManager {
  private cache: Map<string, Skill> = new Map();
  private loaders: ISkillLoader[] = [];
  private activeSkills: Set<string> = new Set();
  private triggerOrchestrator: TriggerOrchestrator;

  constructor(
    _config: IConfigManager,
    projectDir: string,
    workflowDir: string
  ) {
    // Register default loaders (in priority order)
    this.registerLoader(new ProjectSkillLoader(projectDir));
    this.registerLoader(new TechStackSkillLoader(workflowDir));
    this.registerLoader(new UniversalSkillLoader(workflowDir));
    this.registerLoader(new CustomSkillLoader(workflowDir));

    // Register user skills loader (~/.claude/skills/)
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (homeDir) {
      const userSkillsDir = path.join(homeDir, '.claude', 'skills');
      this.registerLoader(new UserSkillLoader(userSkillsDir));

      // Register plugin skills loader (~/.claude/plugins/)
      const pluginDir = path.join(homeDir, '.claude', 'plugins');
      this.registerLoader(new PluginSkillLoader(pluginDir));
    }

    // Initialize trigger orchestrator
    this.triggerOrchestrator = new TriggerOrchestrator();
  }

  /**
   * Create a SkillManager instance
   */
  static async create(options: {
    projectDir: string;
    workflowDir: string;
    config?: IConfigManager;
  }): Promise<SkillManager> {
    // Create a dummy config manager if not provided
    const config = options.config || ({} as IConfigManager);
    return new SkillManager(config, options.projectDir, options.workflowDir);
  }

  /**
   * Get a skill by name
   * Uses three-layer priority: Project → Tech Stack → Universal
   */
  async get(name: string): Promise<Skill | null> {
    // Check cache first
    if (this.cache.has(name)) {
      logger.debug(`Skill '${name}' loaded from cache`);
      return this.cache.get(name)!;
    }

    // Try each loader in order
    for (const loader of this.loaders) {
      try {
        const skill = await loader.load(name);
        if (skill) {
          // Cache the skill
          this.cache.set(name, skill);
          logger.debug(`Skill '${name}' loaded from ${skill.config.source}`);
          return skill;
        }
      } catch (error) {
        logger.error(`Failed to load skill '${name}' from loader:`, error);
      }
    }

    logger.debug(`Skill '${name}' not found`);
    return null;
  }

  /**
   * List all available skills from all loaders
   */
  async list(): Promise<Skill[]> {
    const allSkills: Skill[] = [];
    const seenNames = new Set<string>();

    // Collect skills from all loaders (respecting priority)
    for (const loader of this.loaders) {
      try {
        const skills = await loader.list();
        for (const skill of skills) {
          // Only add if not already seen (priority)
          if (!seenNames.has(skill.metadata.name)) {
            allSkills.push(skill);
            seenNames.add(skill.metadata.name);
          }
        }
      } catch (error) {
        logger.error('Failed to list skills from loader:', error);
      }
    }

    return allSkills;
  }

  /**
   * Add a skill (not implemented - skills are file-based)
   */
  async add(_skill: Skill): Promise<void> {
    throw new Error('add() not implemented - skills are managed as files');
  }

  /**
   * Remove a skill (not implemented - skills are file-based)
   */
  async remove(_name: string): Promise<void> {
    throw new Error('remove() not implemented - skills are managed as files');
  }

  /**
   * Find skills matching a query
   */
  async find(query: SkillQuery): Promise<Skill[]> {
    const allSkills = await this.list();

    return allSkills.filter((skill) => {
      // Filter by source
      if (query.source && skill.config.source !== query.source) {
        return false;
      }

      // Filter by type
      if (query.type && skill.config.type !== query.type) {
        return false;
      }

      // Filter by keywords (match in name or description)
      if (query.keywords && query.keywords.length > 0) {
        const searchText = `${skill.metadata.name} ${skill.metadata.description}`.toLowerCase();
        const hasKeyword = query.keywords.some((keyword) =>
          searchText.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Search skills by keyword
   */
  async search(keyword: string): Promise<Skill[]> {
    return this.find({ keywords: [keyword] });
  }

  /**
   * Find skills that match a specific file based on file triggers
   * @param filePath - Path to the file to evaluate
   * @param options - Optional evaluation options
   * @returns Array of matching skills ordered by priority
   */
  async findByFile(filePath: string, options?: { useCache?: boolean; timeout?: number }): Promise<Skill[]> {
    const startTime = performance.now();

    try {
      // Get all skills that have file triggers
      const allSkills = await this.list();
      const skillsWithFileTriggers = allSkills.filter(skill =>
        skill.config.triggers?.fileTriggers &&
        (skill.config.triggers.fileTriggers.pathPatterns?.length ||
         skill.config.triggers.fileTriggers.contentPatterns?.length)
      );

      if (skillsWithFileTriggers.length === 0) {
        logger.debug(`No skills with file triggers found`);
        return [];
      }

      // Evaluate file against skills with triggers
      const summary = await this.triggerOrchestrator.evaluateFileAgainstSkills(
        filePath,
        skillsWithFileTriggers,
        options
      );

      const evaluationTime = performance.now() - startTime;
      logger.debug(
        `File trigger evaluation completed in ${evaluationTime.toFixed(2)}ms. ` +
        `Found ${summary.matchedSkills.length} matching skills. ` +
        `Cache hit rate: ${(summary.cacheHitRate * 100).toFixed(1)}%`
      );

      return summary.matchedSkills;
    } catch (error) {
      const evaluationTime = performance.now() - startTime;
      logger.error(`File trigger evaluation failed after ${evaluationTime.toFixed(2)}ms:`, error);
      return [];
    }
  }

  /**
   * Find all files in a directory that match any skill's triggers
   * @param rootPath - Root directory to scan
   * @param options - Optional evaluation options
   * @returns Map of file paths to matched skills
   */
  async findMatchingFiles(rootPath: string, options?: { useCache?: boolean; timeout?: number }): Promise<Map<string, Skill[]>> {
    const startTime = performance.now();

    try {
      const allSkills = await this.list();
      const skillsWithFileTriggers = allSkills.filter(skill =>
        skill.config.triggers?.fileTriggers &&
        (skill.config.triggers.fileTriggers.pathPatterns?.length ||
         skill.config.triggers.fileTriggers.contentPatterns?.length)
      );

      if (skillsWithFileTriggers.length === 0) {
        logger.debug(`No skills with file triggers found`);
        return new Map();
      }

      const fileSkillMap = await this.triggerOrchestrator.findMatchingFiles(
        rootPath,
        skillsWithFileTriggers,
        options
      );

      const evaluationTime = performance.now() - startTime;
      logger.debug(
        `Directory scan completed in ${evaluationTime.toFixed(2)}ms. ` +
        `Found ${fileSkillMap.size} matching files across ${skillsWithFileTriggers.length} skills.`
      );

      return fileSkillMap;
    } catch (error) {
      const evaluationTime = performance.now() - startTime;
      logger.error(`Directory scan failed after ${evaluationTime.toFixed(2)}ms:`, error);
      return new Map();
    }
  }

  /**
   * Get detailed evaluation results for a file
   * @param filePath - Path to the file to evaluate
   * @param options - Optional evaluation options
   * @returns Detailed evaluation summary
   */
  async evaluateFile(filePath: string, options?: { useCache?: boolean; timeout?: number }): Promise<TriggerEvaluationSummary | null> {
    try {
      const allSkills = await this.list();
      const skillsWithFileTriggers = allSkills.filter(skill =>
        skill.config.triggers?.fileTriggers &&
        (skill.config.triggers.fileTriggers.pathPatterns?.length ||
         skill.config.triggers.fileTriggers.contentPatterns?.length)
      );

      if (skillsWithFileTriggers.length === 0) {
        return null;
      }

      return await this.triggerOrchestrator.evaluateFileAgainstSkills(
        filePath,
        skillsWithFileTriggers,
        options
      );
    } catch (error) {
      logger.error(`File evaluation failed:`, error);
      return null;
    }
  }

  /**
   * Activate a skill (load it into cache)
   */
  async activate(name: string): Promise<void> {
    const skill = await this.get(name);
    if (!skill) {
      throw new Error(`Skill '${name}' not found`);
    }

    this.activeSkills.add(name);
    logger.info(`Skill '${name}' activated`);
  }

  /**
   * Deactivate a skill (remove from cache)
   */
  async deactivate(name: string): Promise<void> {
    this.cache.delete(name);
    this.activeSkills.delete(name);
    logger.info(`Skill '${name}' deactivated`);
  }

  /**
   * Register a custom skill loader
   */
  registerLoader(loader: ISkillLoader): void {
    this.loaders.push(loader);
  }

  /**
   * Get list of active skills
   */
  getActiveSkills(): string[] {
    return Array.from(this.activeSkills);
  }

  /**
   * Get skill status (installed in project/user or only in global)
   *
   * Installed: Exists in project (.claude/skills/) or user directory (~/.claude/skills/)
   * Available: Only exists in global directory (~/.claude-workflow/skills/)
   */
  async getSkillStatus(name: string): Promise<SkillStatus> {
    const projectLoader = this.loaders[0] as ProjectSkillLoader;
    const projectPath = projectLoader.getSkillPath(name);
    const projectExists = await fileExists(projectPath);

    // Check user directory (~/.claude/skills/)
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    let userExists = false;
    let userPath: string | undefined;
    if (homeDir) {
      userPath = path.join(homeDir, '.claude/skills', name, 'SKILL.md');
      userExists = await fileExists(userPath);
    }

    // Check if skill exists in global loaders (tech-stack, universal, custom, plugin, user)
    let globalExists = false;
    let globalSource: 'tech-stack' | 'universal' | 'custom' | 'plugin' | undefined;

    for (let i = 1; i < this.loaders.length; i++) {
      const loader = this.loaders[i];
      const loaderPath = loader.getSkillPath(name);

      if (await fileExists(loaderPath)) {
        globalExists = true;
        const source = loader.getSource();
        // Map user loader source to undefined (it's handled separately)
        if (source === 'universal' && loaderPath.includes('/.claude/skills/')) {
          // This is the user loader, skip it
          continue;
        }
        globalSource = source as 'tech-stack' | 'universal' | 'custom' | 'plugin';
        break;
      }
    }

    // Determine installation status
    // Installed: exists in project OR user directory
    // Available: only exists in global directory
    const installed = projectExists || userExists;

    // Determine location
    let location: 'project' | 'user' | 'global' | 'both' | 'none';
    if (projectExists && (globalExists || userExists)) {
      location = 'both';
    } else if (projectExists) {
      location = 'project';
    } else if (userExists) {
      location = 'user';
    } else if (globalExists) {
      location = 'global';
    } else {
      location = 'none';
    }

    // Calculate size (prefer project, then user)
    let size: number | undefined;
    if (projectExists) {
      const skillDir = path.dirname(projectPath);
      size = await this.getDirectorySize(skillDir);
    } else if (userExists && userPath) {
      const skillDir = path.dirname(userPath);
      size = await this.getDirectorySize(skillDir);
    }

    return {
      name,
      installed,
      location,
      source: globalSource,
      size,
    };
  }

  /**
   * List all skills with their installation status
   */
  async listAllSkills(): Promise<SkillStatus[]> {
    const allSkills = await this.list();
    const statuses = await Promise.all(
      allSkills.map(skill => this.getSkillStatus(skill.metadata.name))
    );
    return statuses;
  }

  /**
   * Clear all caches (including trigger orchestrator caches)
   */
  clearCache(): void {
    this.cache.clear();
    this.triggerOrchestrator.clearCache();
    logger.debug('All caches cleared');
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    skillCache: number;
    activeSkills: number;
    triggerStats: any;
  } {
    return {
      skillCache: this.cache.size,
      activeSkills: this.activeSkills.size,
      triggerStats: this.triggerOrchestrator.getStats()
    };
  }

  /**
   * Get directory size in bytes
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath);
        } else {
          const stats = await fs.stat(fullPath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      logger.error(`Failed to get directory size for ${dirPath}:`, error);
    }

    return totalSize;
  }
}

/**
 * Skill status information
 */

// ============================================================================
// Skill Loaders
// ============================================================================

/**
 * Base class for skill loaders
 */
abstract class BaseSkillLoader implements ISkillLoader {
  constructor(protected basePath: string) {}

  abstract getSkillPath(name: string): string;
  abstract getSkillsDir(): string;
  abstract getSource(): 'universal' | 'tech-stack' | 'project';

  async load(name: string): Promise<Skill | null> {
    const skillPath = this.getSkillPath(name);

    if (!(await fileExists(skillPath))) {
      return null;
    }

    try {
      const content = await fs.readFile(skillPath, 'utf-8');
      return this.parseSkill(content);
    } catch (error) {
      logger.error(`Failed to load skill from ${skillPath}:`, error);
      return null;
    }
  }

  async list(): Promise<Skill[]> {
    const skillsDir = this.getSkillsDir();

    if (!(await fileExists(skillsDir))) {
      return [];
    }

    try {
      const entries = await fs.readdir(skillsDir, { withFileTypes: true });
      const skills: Skill[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skill = await this.load(entry.name);
          if (skill) {
            skills.push(skill);
          }
        }
      }

      return skills;
    } catch (error) {
      logger.error(`Failed to list skills from ${skillsDir}:`, error);
      return [];
    }
  }

  protected parseSkill(content: string): Skill {
    const { frontmatter, body } = parseFrontmatter(content);

    // Validate required fields
    if (!frontmatter.name || !frontmatter.description) {
      throw new Error('Skill must have name and description in frontmatter');
    }

    return {
      metadata: {
        name: frontmatter.name as string,
        description: frontmatter.description as string,
        version: (frontmatter.version as string) || '1.0.0',
        author: frontmatter.author as string | undefined,
        tags: frontmatter.tags as string[] | undefined,
      },
      config: {
        source: this.getSource(),
        type: (frontmatter.type as any) || 'domain',
        enforcement: (frontmatter.enforcement as any) || 'suggest',
        priority: (frontmatter.priority as any) || 'medium',
      },
      content: body.trim(),
    };
  }

}

/**
 * Loads skills from project directory
 */
class ProjectSkillLoader extends BaseSkillLoader {
  getSkillPath(name: string): string {
    return path.join(this.basePath, '.claude', 'skills', name, 'SKILL.md');
  }

  getSkillsDir(): string {
    return path.join(this.basePath, '.claude', 'skills');
  }

  getSource(): 'project' {
    return 'project';
  }
}

/**
 * Loads skills from tech-stack directory
 */
class TechStackSkillLoader extends BaseSkillLoader {
  getSkillPath(name: string): string {
    return path.join(this.basePath, 'skills', 'tech-stack', name, 'SKILL.md');
  }

  getSkillsDir(): string {
    return path.join(this.basePath, 'skills', 'tech-stack');
  }

  getSource(): 'tech-stack' {
    return 'tech-stack';
  }
}

/**
 * Loads skills from universal directory
 */
class UniversalSkillLoader extends BaseSkillLoader {
  getSkillPath(name: string): string {
    return path.join(this.basePath, 'skills', 'universal', name, 'SKILL.md');
  }

  getSkillsDir(): string {
    return path.join(this.basePath, 'skills', 'universal');
  }

  getSource(): 'universal' {
    return 'universal';
  }
}

/**
 * Loads skills from custom directory
 */
class CustomSkillLoader extends BaseSkillLoader {
  getSkillPath(name: string): string {
    return path.join(this.basePath, 'skills', 'custom', name, 'SKILL.md');
  }

  getSkillsDir(): string {
    return path.join(this.basePath, 'skills', 'custom');
  }

  getSource(): 'universal' {
    return 'universal';
  }
}

/**
 * Loads skills from user's ~/.claude/skills/ directory
 */
class UserSkillLoader extends BaseSkillLoader {
  getSkillPath(name: string): string {
    return path.join(this.basePath, name, 'SKILL.md');
  }

  getSkillsDir(): string {
    return this.basePath;
  }

  getSource(): 'universal' {
    return 'universal';
  }
}

/**
 * Plugin skill loader - loads skills from Claude Code plugins
 * Reads from ~/.claude/plugins/installed_plugins.json and scans plugin directories
 */
class PluginSkillLoader implements ISkillLoader {
  private pluginSkillsCache: Map<string, string> = new Map(); // name -> path

  constructor(private pluginDir: string) {}

  getSkillPath(name: string): string {
    // Return cached path or construct default path
    return this.pluginSkillsCache.get(name) || path.join(this.pluginDir, 'cache', name, 'SKILL.md');
  }

  getSource(): 'plugin' {
    return 'plugin'; // Plugin skills have their own source type
  }

  async load(name: string): Promise<Skill | null> {
    // Ensure cache is populated
    await this.populateCache();

    const skillPath = this.pluginSkillsCache.get(name);
    if (!skillPath || !(await fileExists(skillPath))) {
      return null;
    }

    try {
      const content = await fs.readFile(skillPath, 'utf-8');
      return this.parseSkill(content, name);
    } catch (error) {
      logger.error(`Failed to load plugin skill from ${skillPath}:`, error);
      return null;
    }
  }

  async list(): Promise<Skill[]> {
    await this.populateCache();

    const skills: Skill[] = [];
    for (const [name, skillPath] of this.pluginSkillsCache.entries()) {
      try {
        const content = await fs.readFile(skillPath, 'utf-8');
        const skill = this.parseSkill(content, name);
        if (skill) {
          skills.push(skill);
        }
      } catch (error) {
        logger.debug(`Failed to load plugin skill ${name}:`, error);
      }
    }

    return skills;
  }

  private async populateCache(): Promise<void> {
    if (this.pluginSkillsCache.size > 0) {
      return; // Already populated
    }

    const installedPluginsPath = path.join(this.pluginDir, 'installed_plugins.json');
    if (!(await fileExists(installedPluginsPath))) {
      return;
    }

    try {
      const pluginsData = await fs.readJSON(installedPluginsPath);

      // Parse installed_plugins.json structure
      if (pluginsData.plugins) {
        for (const [pluginKey, installations] of Object.entries(pluginsData.plugins)) {
          if (!Array.isArray(installations)) continue;

          for (const installation of installations) {
            const installPath = installation.installPath;
            if (!installPath) continue;

            // Look for skills directory in plugin
            const skillsDir = path.join(installPath, 'skills');
            if (await fileExists(skillsDir)) {
              await this.scanSkillsDirectory(skillsDir, pluginKey);
            }
          }
        }
      }
    } catch (error) {
      logger.debug('Failed to read installed_plugins.json:', error);
    }
  }

  private async scanSkillsDirectory(skillsDir: string, _pluginKey: string): Promise<void> {
    try {
      const entries = await fs.readdir(skillsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
          if (await fileExists(skillPath)) {
            // Store with plugin prefix to avoid conflicts
            const skillName = entry.name;
            this.pluginSkillsCache.set(skillName, skillPath);
          }
        }
      }
    } catch (error) {
      logger.debug(`Failed to scan skills directory ${skillsDir}:`, error);
    }
  }

  private parseSkill(content: string, name: string): Skill {
    const { frontmatter, body } = parseFrontmatter(content);

    // Use name from frontmatter or fallback to directory name
    const skillName = (frontmatter.name as string) || name;
    const description = frontmatter.description as string;

    if (!description) {
      throw new Error('Skill must have description in frontmatter');
    }

    return {
      metadata: {
        name: skillName,
        description: description,
        version: (frontmatter.version as string) || '1.0.0',
        author: frontmatter.author as string | undefined,
        tags: frontmatter.tags as string[] | undefined,
      },
      config: {
        source: 'plugin', // Plugin skills have their own source type
        type: (frontmatter.type as any) || 'domain',
        enforcement: (frontmatter.enforcement as any) || 'suggest',
        priority: (frontmatter.priority as any) || 'medium',
      },
      content: body.trim(),
    };
  }
}
