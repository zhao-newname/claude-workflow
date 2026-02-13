/**
 * SingleAgentOrchestrator implementation
 *
 * Orchestrates a single agent workflow by:
 * - Initializing core components (SkillManager, ConfigManager, ContextManager)
 * - Creating and managing a single agent
 * - Delegating task execution to the agent
 */

import type {
  IAgentOrchestrator,
  IAgent,
  ISkillManager,
  IConfigManager,
  IContextManager,
} from '../types/interfaces.js';
import type { OrchestratorConfig, Task, Result } from '../types/index.js';
import { SkillManager } from '../core/skill-manager.js';
import { ConfigManager } from '../core/config-manager.js';
import { ContextManager } from '../core/context-manager.js';
import { SingleAgent } from '../agent/single-agent.js';
import { logger } from '../utils/logger.js';

/**
 * SingleAgentOrchestrator - Orchestrates a single-agent workflow
 *
 * This orchestrator:
 * - Initializes all core components
 * - Creates a single agent with these components
 * - Delegates all task execution to this agent
 */
export class SingleAgentOrchestrator implements IAgentOrchestrator {
  private agent: IAgent | null = null;

  /**
   * Initialize the orchestrator
   *
   * This method:
   * 1. Stores the configuration
   * 2. Initializes SkillManager, ConfigManager, and ContextManager
   * 3. Creates a SingleAgent with these components
   */
  async initialize(config: OrchestratorConfig): Promise<void> {
    logger.info('Initializing SingleAgentOrchestrator');

    try {
      // Initialize core components
      const skillManager = await this.initializeSkillManager(config);
      const configManager = await this.initializeConfigManager(config);
      const contextManager = await this.initializeContextManager(config);

      // Create agent
      this.agent = new SingleAgent(skillManager, configManager, contextManager, {
        id: 'main',
        role: 'executor',
      });

      logger.success('SingleAgentOrchestrator initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Failed to initialize orchestrator: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Execute a task
   *
   * Delegates task execution to the single agent.
   */
  async execute(task: Task): Promise<Result> {
    if (!this.agent) {
      const error = 'Orchestrator not initialized. Call initialize() first.';
      logger.error(error);
      return {
        success: false,
        error,
      };
    }

    logger.info(`Orchestrator executing task: ${task.id}`);
    return await this.agent.execute(task);
  }

  /**
   * Get all agents
   *
   * Returns an array containing the single agent.
   */
  getAgents(): IAgent[] {
    return this.agent ? [this.agent] : [];
  }

  /**
   * Get agent by ID
   *
   * Returns the agent if ID matches, otherwise null.
   */
  getAgent(id: string): IAgent | null {
    if (!this.agent) {
      return null;
    }
    return this.agent.id === id ? this.agent : null;
  }

  /**
   * Register an agent
   *
   * In single-agent mode, this replaces the existing agent.
   */
  registerAgent(agent: IAgent): void {
    logger.info(`Registering agent: ${agent.id}`);
    this.agent = agent;
  }

  /**
   * Initialize SkillManager
   */
  private async initializeSkillManager(
    config: OrchestratorConfig
  ): Promise<ISkillManager> {
    logger.debug('Initializing SkillManager');

    const skillManager = await SkillManager.create({
      projectDir: config.projectDir,
      workflowDir: config.workflowDir,
    });

    return skillManager;
  }

  /**
   * Initialize ConfigManager
   */
  private async initializeConfigManager(
    config: OrchestratorConfig
  ): Promise<IConfigManager> {
    logger.debug('Initializing ConfigManager');

    const configPath = `${config.workflowDir}/settings.json`;
    const configManager = await ConfigManager.load(configPath);

    return configManager;
  }

  /**
   * Initialize ContextManager
   */
  private async initializeContextManager(
    config: OrchestratorConfig
  ): Promise<IContextManager> {
    logger.debug('Initializing ContextManager');

    const contextPath = `${config.workflowDir}/context.json`;
    const contextManager = await ContextManager.load(contextPath);

    return contextManager;
  }
}
