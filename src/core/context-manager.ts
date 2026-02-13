/**
 * ContextManager - Manages context (state) for agents
 *
 * Features:
 * - Local context management for single-agent
 * - Persistent storage (save/load)
 * - Nested key access with dot notation
 * - Deep merge for updates
 * - Reserved interface for shared context (multi-agent)
 *
 * Single-agent mode: All context is local
 * Multi-agent mode (future): Support shared context between agents
 */

import type { Context } from '../types/index.js';
import type { IContextManager } from '../types/interfaces.js';
import { get, set, deepMerge, readJson, writeJson, fileExists } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

export class ContextManager implements IContextManager {
  private context: Context = {};

  private constructor(private contextPath: string) {}

  /**
   * Load context from file or create empty
   */
  static async load(contextPath: string): Promise<ContextManager> {
    const manager = new ContextManager(contextPath);

    if (await fileExists(contextPath)) {
      try {
        manager.context = await readJson<Context>(contextPath);
        logger.debug(`Context loaded from ${contextPath}`);
      } catch (error) {
        logger.error(`Failed to load context from ${contextPath}:`, error);
        manager.context = {};
      }
    } else {
      manager.context = {};
      logger.debug('Created empty context');
    }

    return manager;
  }

  /**
   * Get context value by key (supports dot notation)
   */
  get(key: string): unknown {
    return get(this.context as Record<string, unknown>, key);
  }

  /**
   * Get all context
   */
  getAll(): Context {
    return { ...this.context };
  }

  /**
   * Set context value by key (supports dot notation)
   */
  set(key: string, value: unknown): void {
    set(this.context as Record<string, unknown>, key, value);
    logger.debug(`Context updated: ${key}`);
  }

  /**
   * Update context with partial updates (deep merge)
   */
  update(updates: Partial<Context>): void {
    this.context = deepMerge(
      this.context as Record<string, unknown>,
      updates as Record<string, unknown>
    ) as Context;
    logger.debug('Context updated with partial updates');
  }

  /**
   * Delete a context key
   */
  delete(key: string): void {
    const keys = key.split('.');
    const lastKey = keys.pop()!;

    if (keys.length === 0) {
      // Top-level key
      delete this.context[lastKey];
    } else {
      // Nested key
      const parent = get<Record<string, unknown>>(this.context as Record<string, unknown>, keys.join('.'));
      if (parent && typeof parent === 'object') {
        delete parent[lastKey];
      }
    }

    logger.debug(`Context key deleted: ${key}`);
  }

  /**
   * Clear all context
   */
  clear(): void {
    this.context = {};
    logger.debug('Context cleared');
  }

  /**
   * Check if a key exists in context
   */
  has(key: string): boolean {
    return get(this.context as Record<string, unknown>, key) !== undefined;
  }

  /**
   * Get all top-level keys
   */
  keys(): string[] {
    return Object.keys(this.context);
  }

  /**
   * Get number of top-level keys
   */
  size(): number {
    return Object.keys(this.context).length;
  }

  /**
   * Share context with another agent (multi-agent only)
   * In single-agent mode, this is a no-op
   */
  share(agentId: string, keys: string[]): void {
    // No-op for single-agent mode
    // In multi-agent mode, this would copy specified keys to shared context
    logger.debug(`share() called for agent '${agentId}' with keys: ${keys.join(', ')} (no-op in single-agent mode)`);
  }

  /**
   * Save context to file
   */
  async save(): Promise<void> {
    try {
      await writeJson(this.contextPath, this.context);
      logger.debug(`Context saved to ${this.contextPath}`);
    } catch (error) {
      logger.error(`Failed to save context to ${this.contextPath}:`, error);
      throw error;
    }
  }

  /**
   * Load context from file
   */
  async load(): Promise<void> {
    try {
      if (await fileExists(this.contextPath)) {
        this.context = await readJson<Context>(this.contextPath);
        logger.debug(`Context loaded from ${this.contextPath}`);
      } else {
        logger.debug('Context file does not exist, keeping current context');
      }
    } catch (error) {
      logger.error(`Failed to load context from ${this.contextPath}:`, error);
      throw error;
    }
  }

  /**
   * Get context file path
   */
  getContextPath(): string {
    return this.contextPath;
  }

  /**
   * Create a snapshot of current context
   */
  snapshot(): Context {
    return JSON.parse(JSON.stringify(this.context));
  }

  /**
   * Restore context from a snapshot
   */
  restore(snapshot: Context): void {
    this.context = JSON.parse(JSON.stringify(snapshot));
    logger.debug('Context restored from snapshot');
  }
}
