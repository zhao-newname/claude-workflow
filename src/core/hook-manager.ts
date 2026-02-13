/**
 * HookManager - Manages hook registration and execution
 *
 * Features:
 * - Hook registration for different events
 * - Priority-based execution order
 * - Conditional execution (shouldExecute)
 * - Stop propagation support
 * - Custom executor registration
 * - Error handling
 *
 * Inspired by claude-code-infrastructure-showcase
 */

import type { HookEvent, HookContext, HookResult, IHook } from '../types/index.js';
import type { IHookManager, IHookExecutor } from '../types/interfaces.js';
import { logger } from '../utils/logger.js';

export class HookManager implements IHookManager {
  private hooks: Map<HookEvent, IHook[]> = new Map();
  private executors: Map<string, IHookExecutor> = new Map();

  /**
   * Register a hook for an event
   * Hooks are automatically sorted by priority (highest first)
   */
  register(event: HookEvent, hook: IHook): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }

    const hooks = this.hooks.get(event)!;
    hooks.push(hook);

    // Sort by priority (highest first)
    hooks.sort((a, b) => b.priority - a.priority);

    logger.debug(`Hook '${hook.name}' registered for event '${event}' with priority ${hook.priority}`);
  }

  /**
   * Unregister a hook by id
   */
  unregister(event: HookEvent, hookId: string): void {
    const hooks = this.hooks.get(event);
    if (!hooks) {
      return;
    }

    const index = hooks.findIndex((h) => h.id === hookId);
    if (index > -1) {
      hooks.splice(index, 1);
      logger.debug(`Hook '${hookId}' unregistered from event '${event}'`);
    }
  }

  /**
   * Execute all hooks for an event
   * Hooks are executed in priority order (highest first)
   * Execution stops if a hook returns stop=true
   */
  async execute(event: HookEvent, context: HookContext): Promise<HookResult> {
    const hooks = this.hooks.get(event) || [];

    if (hooks.length === 0) {
      logger.debug(`No hooks registered for event '${event}'`);
      return { success: true };
    }

    logger.debug(`Executing ${hooks.length} hooks for event '${event}'`);

    const results: HookResult[] = [];
    let stopped = false;

    for (const hook of hooks) {
      if (stopped) {
        break;
      }

      // Check if hook should execute
      if (hook.shouldExecute && !hook.shouldExecute(context)) {
        logger.debug(`Hook '${hook.name}' skipped (shouldExecute returned false)`);
        continue;
      }

      try {
        logger.debug(`Executing hook '${hook.name}'`);
        const result = await hook.execute(context);
        results.push(result);

        // Check if we should stop execution
        if (result.stop) {
          logger.debug(`Hook '${hook.name}' requested stop`);
          stopped = true;
        }
      } catch (error) {
        logger.error(`Hook '${hook.name}' failed:`, error);
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with next hook despite error
      }
    }

    // Merge results
    return this.mergeResults(results);
  }

  /**
   * Register a custom hook executor
   */
  registerExecutor(executor: IHookExecutor): void {
    this.executors.set(executor.type, executor);
    logger.debug(`Executor '${executor.type}' registered`);
  }

  /**
   * Get all hooks for an event
   */
  getHooks(event: HookEvent): IHook[] {
    return [...(this.hooks.get(event) || [])];
  }

  /**
   * Clear all hooks for an event
   */
  clear(event: HookEvent): void {
    this.hooks.delete(event);
    logger.debug(`All hooks cleared for event '${event}'`);
  }

  /**
   * Clear all hooks for all events
   */
  clearAll(): void {
    this.hooks.clear();
    logger.debug('All hooks cleared');
  }

  /**
   * Get executor by type
   */
  getExecutor(type: string): IHookExecutor | undefined {
    return this.executors.get(type);
  }

  /**
   * Merge multiple hook results into a single result
   */
  private mergeResults(results: HookResult[]): HookResult {
    if (results.length === 0) {
      return { success: true };
    }

    // Overall success if at least one hook succeeded
    const success = results.some((r) => r.success);

    // Collect all outputs
    const outputs = results
      .filter((r) => r.output)
      .map((r) => r.output)
      .join('\n');

    // Collect all errors
    const errors = results
      .filter((r) => r.error)
      .map((r) => r.error)
      .join('\n');

    return {
      success,
      output: outputs || undefined,
      error: errors || undefined,
      stop: results.some((r) => r.stop),
    };
  }
}

/**
 * Shell Hook - Executes shell commands
 */
export class ShellHook implements IHook {
  constructor(
    public id: string,
    public name: string,
    public priority: number,
    private command: string
  ) {}

  async execute(context: HookContext): Promise<HookResult> {
    try {
      // Import dynamically to avoid circular dependencies
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      logger.debug(`Executing shell command: ${this.command}`);

      const { stdout, stderr } = await execAsync(this.command, {
        timeout: 30000, // 30 second timeout
        env: {
          ...process.env,
          HOOK_EVENT: context.event,
          HOOK_DATA: JSON.stringify(context.data),
        },
      });

      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
      };
    } catch (error) {
      logger.error(`Shell hook '${this.name}' failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Function Hook - Executes a JavaScript function
 */
export class FunctionHook implements IHook {
  constructor(
    public id: string,
    public name: string,
    public priority: number,
    private fn: (context: HookContext) => Promise<HookResult> | HookResult,
    public shouldExecute?: (context: HookContext) => boolean
  ) {}

  async execute(context: HookContext): Promise<HookResult> {
    try {
      return await this.fn(context);
    } catch (error) {
      logger.error(`Function hook '${this.name}' failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
