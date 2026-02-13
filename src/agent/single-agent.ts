/**
 * SingleAgent implementation
 *
 * A single-agent implementation that coordinates skills, config, and context
 * to execute tasks. This is the simplest form of agent and serves as the
 * foundation for multi-agent systems.
 */

import type {
  IAgent,
  ISkillManager,
  IConfigManager,
  IContextManager,
} from '../types/interfaces.js';
import type { AgentRole, Task, Result, Message } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface SingleAgentOptions {
  id?: string;
  role?: AgentRole;
}

/**
 * SingleAgent - A single-agent implementation
 *
 * This agent:
 * - Manages skills, config, and context
 * - Executes tasks by coordinating these components
 * - Does not communicate with other agents (sendMessage/receiveMessage are no-ops)
 */
export class SingleAgent implements IAgent {
  public readonly id: string;
  public readonly role: AgentRole;
  public readonly skills: ISkillManager;
  public readonly config: IConfigManager;
  public readonly context: IContextManager;

  constructor(
    skills: ISkillManager,
    config: IConfigManager,
    context: IContextManager,
    options: SingleAgentOptions = {}
  ) {
    this.id = options.id ?? 'main';
    this.role = options.role ?? 'executor';
    this.skills = skills;
    this.config = config;
    this.context = context;

    logger.debug(`SingleAgent created: id=${this.id}, role=${this.role}`);
  }

  /**
   * Execute a task
   *
   * This method:
   * 1. Finds relevant skills based on task keywords and files
   * 2. Updates context with current task and active skills
   * 3. Returns success result
   *
   * Note: The actual task execution is done by Claude Code.
   * This method only coordinates the workflow components.
   */
  async execute(task: Task): Promise<Result> {
    logger.info(`Executing task: ${task.id} - ${task.description}`);

    try {
      // 1. Find relevant skills
      const relevantSkills = await this.skills.find({
        keywords: task.keywords,
        files: task.files,
      });

      logger.debug(
        `Found ${relevantSkills.length} relevant skills for task ${task.id}`
      );

      // 2. Update context
      this.context.set('currentTask', {
        id: task.id,
        description: task.description,
        startedAt: Date.now(),
      });

      this.context.set(
        'activeSkills',
        relevantSkills.map((s) => s.metadata.name)
      );

      // 3. Save context
      await this.context.save();

      logger.success(`Task ${task.id} prepared successfully`);

      // 4. Return result
      return {
        success: true,
        data: {
          task,
          skills: relevantSkills.map((s) => ({
            name: s.metadata.name,
            description: s.metadata.description,
            source: s.config.source,
          })),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Failed to execute task ${task.id}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send message to another agent (no-op for single-agent)
   *
   * This method is reserved for multi-agent communication.
   * In single-agent mode, it does nothing.
   */
  async sendMessage(_to: string, _message: Message): Promise<void> {
    logger.debug('sendMessage called but ignored (single-agent mode)');
    // no-op
  }

  /**
   * Receive message from another agent (no-op for single-agent)
   *
   * This method is reserved for multi-agent communication.
   * In single-agent mode, it does nothing.
   */
  async receiveMessage(_from: string, _message: Message): Promise<void> {
    logger.debug('receiveMessage called but ignored (single-agent mode)');
    // no-op
  }
}
