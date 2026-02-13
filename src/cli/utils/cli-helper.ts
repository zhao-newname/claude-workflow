/**
 * CLI Helper - Manages orchestrator and common CLI operations
 */

import path from 'path';
import fs from 'fs-extra';
import { SingleAgentOrchestrator } from '../../orchestration/index.js';
import type { IAgentOrchestrator } from '../../types/interfaces.js';
import type { OrchestratorConfig } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export class CLIHelper {
  private static orchestrator: IAgentOrchestrator | null = null;

  /**
   * Get the .claude directory path
   */
  static getClaudeDir(cwd: string = process.cwd()): string {
    return path.join(cwd, '.claude');
  }

  /**
   * Get the settings.json path
   */
  static getSettingsPath(cwd: string = process.cwd()): string {
    return path.join(this.getClaudeDir(cwd), 'settings.json');
  }

  /**
   * Get the context.json path
   */
  static getContextPath(cwd: string = process.cwd()): string {
    return path.join(this.getClaudeDir(cwd), 'context.json');
  }

  /**
   * Check if workflow is initialized
   */
  static async isInitialized(cwd: string = process.cwd()): Promise<boolean> {
    const settingsPath = this.getSettingsPath(cwd);
    return await fs.pathExists(settingsPath);
  }

  /**
   * Ensure workflow is initialized
   */
  static async ensureInitialized(cwd: string = process.cwd()): Promise<void> {
    if (!(await this.isInitialized(cwd))) {
      logger.error('Not initialized. Run "cw init" first.');
      process.exit(1);
    }
  }

  /**
   * Get or create orchestrator
   */
  static async getOrchestrator(cwd: string = process.cwd()): Promise<IAgentOrchestrator> {
    // Return cached orchestrator if available
    if (this.orchestrator) {
      return this.orchestrator;
    }

    // Ensure initialized
    await this.ensureInitialized(cwd);

    // Read config
    const settingsPath = this.getSettingsPath(cwd);
    const config = await fs.readJson(settingsPath);

    // Get claude-workflow global directory
    // Global skills are always stored in ~/.claude-workflow/
    // regardless of where the CLI is installed
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      throw new Error('Cannot determine home directory');
    }
    const workflowGlobalDir = path.join(homeDir, '.claude-workflow');

    // Create orchestrator config
    const orchestratorConfig: OrchestratorConfig = {
      mode: config.mode || 'single-agent',
      projectDir: cwd,
      workflowDir: workflowGlobalDir,
    };

    // Create and initialize orchestrator
    const orchestrator = new SingleAgentOrchestrator();
    await orchestrator.initialize(orchestratorConfig);

    // Cache orchestrator
    this.orchestrator = orchestrator;

    return orchestrator;
  }

  /**
   * Read workflow config
   */
  static async readConfig(cwd: string = process.cwd()): Promise<any> {
    await this.ensureInitialized(cwd);
    const settingsPath = this.getSettingsPath(cwd);
    return await fs.readJson(settingsPath);
  }

  /**
   * Write workflow config
   */
  static async writeConfig(config: any, cwd: string = process.cwd()): Promise<void> {
    const settingsPath = this.getSettingsPath(cwd);
    await fs.writeJson(settingsPath, config, { spaces: 2 });
    logger.success('Configuration updated');
  }

  /**
   * Get skills directory paths
   */
  static getSkillsPaths(cwd: string = process.cwd()): {
    project: string;
    techStack: string;
    universal: string;
  } {
    const claudeDir = this.getClaudeDir(cwd);
    return {
      project: path.join(claudeDir, 'skills'),
      techStack: path.join(claudeDir, 'skills-global', 'tech-stack'),
      universal: path.join(claudeDir, 'skills-global', 'universal'),
    };
  }

  /**
   * Clear cached orchestrator
   */
  static clearCache(): void {
    this.orchestrator = null;
  }
}
