/**
 * HookManager Tests
 *
 * Tests for the HookManager class that handles hook registration and execution
 * Supports Shell and TypeScript hooks with priority sorting
 * Inspired by claude-code-infrastructure-showcase
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { HookManager } from './hook-manager.js';
import type { HookEvent, HookContext, HookResult, IHook } from '../types/index.js';
import type { IHookExecutor } from '../types/interfaces.js';

describe('HookManager', () => {
  let manager: HookManager;

  beforeEach(() => {
    manager = new HookManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('should register a hook for an event', () => {
      // Arrange
      const hook: IHook = {
        id: 'test-hook',
        name: 'Test Hook',
        priority: 10,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      // Act
      manager.register('UserPromptSubmit', hook);

      // Assert
      const hooks = manager.getHooks('UserPromptSubmit');
      expect(hooks).toHaveLength(1);
      expect(hooks[0].id).toBe('test-hook');
    });

    it('should sort hooks by priority (highest first)', () => {
      // Arrange
      const hook1: IHook = {
        id: 'hook-1',
        name: 'Hook 1',
        priority: 5,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      const hook2: IHook = {
        id: 'hook-2',
        name: 'Hook 2',
        priority: 10,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      const hook3: IHook = {
        id: 'hook-3',
        name: 'Hook 3',
        priority: 7,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      // Act
      manager.register('UserPromptSubmit', hook1);
      manager.register('UserPromptSubmit', hook2);
      manager.register('UserPromptSubmit', hook3);

      // Assert
      const hooks = manager.getHooks('UserPromptSubmit');
      expect(hooks[0].id).toBe('hook-2'); // priority 10
      expect(hooks[1].id).toBe('hook-3'); // priority 7
      expect(hooks[2].id).toBe('hook-1'); // priority 5
    });

    it('should allow multiple hooks for the same event', () => {
      // Arrange
      const hook1: IHook = {
        id: 'hook-1',
        name: 'Hook 1',
        priority: 10,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      const hook2: IHook = {
        id: 'hook-2',
        name: 'Hook 2',
        priority: 5,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      // Act
      manager.register('UserPromptSubmit', hook1);
      manager.register('UserPromptSubmit', hook2);

      // Assert
      const hooks = manager.getHooks('UserPromptSubmit');
      expect(hooks).toHaveLength(2);
    });
  });

  describe('unregister', () => {
    it('should unregister a hook by id', () => {
      // Arrange
      const hook: IHook = {
        id: 'test-hook',
        name: 'Test Hook',
        priority: 10,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      manager.register('UserPromptSubmit', hook);

      // Act
      manager.unregister('UserPromptSubmit', 'test-hook');

      // Assert
      const hooks = manager.getHooks('UserPromptSubmit');
      expect(hooks).toHaveLength(0);
    });

    it('should not throw error when unregistering non-existent hook', () => {
      // Act & Assert
      expect(() => manager.unregister('UserPromptSubmit', 'non-existent')).not.toThrow();
    });
  });

  describe('execute', () => {
    it('should execute all hooks for an event', async () => {
      // Arrange
      const hook1: IHook = {
        id: 'hook-1',
        name: 'Hook 1',
        priority: 10,
        execute: vi.fn().mockResolvedValue({ success: true, output: 'output1' }),
      };

      const hook2: IHook = {
        id: 'hook-2',
        name: 'Hook 2',
        priority: 5,
        execute: vi.fn().mockResolvedValue({ success: true, output: 'output2' }),
      };

      manager.register('UserPromptSubmit', hook1);
      manager.register('UserPromptSubmit', hook2);

      const context: HookContext = {
        event: 'UserPromptSubmit',
        data: { prompt: 'test prompt' },
        timestamp: Date.now(),
      };

      // Act
      const result = await manager.execute('UserPromptSubmit', context);

      // Assert
      expect(hook1.execute).toHaveBeenCalledWith(context);
      expect(hook2.execute).toHaveBeenCalledWith(context);
      expect(result.success).toBe(true);
    });

    it('should execute hooks in priority order', async () => {
      // Arrange
      const executionOrder: string[] = [];

      const hook1: IHook = {
        id: 'hook-1',
        name: 'Hook 1',
        priority: 5,
        execute: vi.fn().mockImplementation(async () => {
          executionOrder.push('hook-1');
          return { success: true };
        }),
      };

      const hook2: IHook = {
        id: 'hook-2',
        name: 'Hook 2',
        priority: 10,
        execute: vi.fn().mockImplementation(async () => {
          executionOrder.push('hook-2');
          return { success: true };
        }),
      };

      manager.register('UserPromptSubmit', hook1);
      manager.register('UserPromptSubmit', hook2);

      const context: HookContext = {
        event: 'UserPromptSubmit',
        data: {},
        timestamp: Date.now(),
      };

      // Act
      await manager.execute('UserPromptSubmit', context);

      // Assert
      expect(executionOrder).toEqual(['hook-2', 'hook-1']); // Higher priority first
    });

    it('should stop execution when hook returns stop=true', async () => {
      // Arrange
      const hook1: IHook = {
        id: 'hook-1',
        name: 'Hook 1',
        priority: 10,
        execute: vi.fn().mockResolvedValue({ success: true, stop: true }),
      };

      const hook2: IHook = {
        id: 'hook-2',
        name: 'Hook 2',
        priority: 5,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      manager.register('UserPromptSubmit', hook1);
      manager.register('UserPromptSubmit', hook2);

      const context: HookContext = {
        event: 'UserPromptSubmit',
        data: {},
        timestamp: Date.now(),
      };

      // Act
      await manager.execute('UserPromptSubmit', context);

      // Assert
      expect(hook1.execute).toHaveBeenCalled();
      expect(hook2.execute).not.toHaveBeenCalled(); // Should not execute
    });

    it('should skip hook when shouldExecute returns false', async () => {
      // Arrange
      const hook: IHook = {
        id: 'conditional-hook',
        name: 'Conditional Hook',
        priority: 10,
        execute: vi.fn().mockResolvedValue({ success: true }),
        shouldExecute: vi.fn().mockReturnValue(false),
      };

      manager.register('UserPromptSubmit', hook);

      const context: HookContext = {
        event: 'UserPromptSubmit',
        data: {},
        timestamp: Date.now(),
      };

      // Act
      await manager.execute('UserPromptSubmit', context);

      // Assert
      expect(hook.shouldExecute).toHaveBeenCalledWith(context);
      expect(hook.execute).not.toHaveBeenCalled();
    });

    it('should handle hook execution errors gracefully', async () => {
      // Arrange
      const hook1: IHook = {
        id: 'failing-hook',
        name: 'Failing Hook',
        priority: 10,
        execute: vi.fn().mockRejectedValue(new Error('Hook failed')),
      };

      const hook2: IHook = {
        id: 'success-hook',
        name: 'Success Hook',
        priority: 5,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      manager.register('UserPromptSubmit', hook1);
      manager.register('UserPromptSubmit', hook2);

      const context: HookContext = {
        event: 'UserPromptSubmit',
        data: {},
        timestamp: Date.now(),
      };

      // Act
      const result = await manager.execute('UserPromptSubmit', context);

      // Assert
      expect(hook2.execute).toHaveBeenCalled(); // Should continue despite error
      expect(result.success).toBe(true); // Overall success if at least one succeeds
    });

    it('should return empty result when no hooks registered', async () => {
      // Arrange
      const context: HookContext = {
        event: 'UserPromptSubmit',
        data: {},
        timestamp: Date.now(),
      };

      // Act
      const result = await manager.execute('UserPromptSubmit', context);

      // Assert
      expect(result.success).toBe(true);
      expect(result.output).toBeUndefined();
    });
  });

  describe('registerExecutor', () => {
    it('should register custom hook executor', () => {
      // Arrange
      const executor: IHookExecutor = {
        type: 'custom',
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      // Act & Assert
      expect(() => manager.registerExecutor(executor)).not.toThrow();
    });

    it('should use custom executor for hooks', async () => {
      // Arrange
      const executor: IHookExecutor = {
        type: 'custom',
        execute: vi.fn().mockResolvedValue({ success: true, output: 'custom output' }),
      };

      manager.registerExecutor(executor);

      const hook: IHook = {
        id: 'custom-hook',
        name: 'Custom Hook',
        priority: 10,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      manager.register('UserPromptSubmit', hook);

      const context: HookContext = {
        event: 'UserPromptSubmit',
        data: {},
        timestamp: Date.now(),
      };

      // Act
      await manager.execute('UserPromptSubmit', context);

      // Assert
      expect(hook.execute).toHaveBeenCalled();
    });
  });

  describe('getHooks', () => {
    it('should return all hooks for an event', () => {
      // Arrange
      const hook1: IHook = {
        id: 'hook-1',
        name: 'Hook 1',
        priority: 10,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      const hook2: IHook = {
        id: 'hook-2',
        name: 'Hook 2',
        priority: 5,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      manager.register('UserPromptSubmit', hook1);
      manager.register('UserPromptSubmit', hook2);

      // Act
      const hooks = manager.getHooks('UserPromptSubmit');

      // Assert
      expect(hooks).toHaveLength(2);
    });

    it('should return empty array when no hooks registered', () => {
      // Act
      const hooks = manager.getHooks('UserPromptSubmit');

      // Assert
      expect(hooks).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all hooks for an event', () => {
      // Arrange
      const hook: IHook = {
        id: 'test-hook',
        name: 'Test Hook',
        priority: 10,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      manager.register('UserPromptSubmit', hook);
      manager.register('PostToolUse', hook);

      // Act
      manager.clear('UserPromptSubmit');

      // Assert
      expect(manager.getHooks('UserPromptSubmit')).toHaveLength(0);
      expect(manager.getHooks('PostToolUse')).toHaveLength(1); // Other events unaffected
    });
  });

  describe('clearAll', () => {
    it('should clear all hooks for all events', () => {
      // Arrange
      const hook: IHook = {
        id: 'test-hook',
        name: 'Test Hook',
        priority: 10,
        execute: vi.fn().mockResolvedValue({ success: true }),
      };

      manager.register('UserPromptSubmit', hook);
      manager.register('PostToolUse', hook);

      // Act
      manager.clearAll();

      // Assert
      expect(manager.getHooks('UserPromptSubmit')).toHaveLength(0);
      expect(manager.getHooks('PostToolUse')).toHaveLength(0);
    });
  });
});
