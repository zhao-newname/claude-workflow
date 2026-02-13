/**
 * ContextManager Tests
 *
 * Tests for the ContextManager class that handles context management
 * Supports local context for single-agent and shared context for multi-agent
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ContextManager } from './context-manager.js';
import type { Context } from '../types/index.js';

// Mock fs-extra and utils
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    ensureDir: vi.fn(),
  },
  pathExists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  ensureDir: vi.fn(),
}));

vi.mock('../utils/fs.js', async () => {
  const actual = await vi.importActual('../utils/fs.js');
  return {
    ...actual,
    fileExists: vi.fn(),
    readJson: vi.fn(),
    writeJson: vi.fn(),
  };
});

import { fileExists, readJson, writeJson } from '../utils/fs.js';

describe('ContextManager', () => {
  let manager: ContextManager;
  const contextPath = '/test/project/.claude/context.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should load existing context on initialization', async () => {
      // Arrange
      const existingContext: Context = {
        currentTask: 'test-task',
        activeSkills: ['code-review', 'testing'],
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(existingContext);

      // Act
      manager = await ContextManager.load(contextPath);

      // Assert
      expect(manager.getAll()).toEqual(existingContext);
    });

    it('should create empty context when file does not exist', async () => {
      // Arrange
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeJson).mockResolvedValue(undefined);

      // Act
      manager = await ContextManager.load(contextPath);

      // Assert
      const context = manager.getAll();
      expect(context).toEqual({});
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      const context: Context = {
        currentTask: 'test-task',
        user: {
          name: 'John',
          preferences: {
            theme: 'dark',
          },
        },
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(context);
      manager = await ContextManager.load(contextPath);
    });

    it('should get top-level context value', () => {
      // Act
      const task = manager.get('currentTask');

      // Assert
      expect(task).toBe('test-task');
    });

    it('should get nested context value', () => {
      // Act
      const name = manager.get('user.name');

      // Assert
      expect(name).toBe('John');
    });

    it('should get deeply nested context value', () => {
      // Act
      const theme = manager.get('user.preferences.theme');

      // Assert
      expect(theme).toBe('dark');
    });

    it('should return undefined for non-existent key', () => {
      // Act
      const value = manager.get('non.existent.key');

      // Assert
      expect(value).toBeUndefined();
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeJson).mockResolvedValue(undefined);
      manager = await ContextManager.load(contextPath);
    });

    it('should set top-level context value', () => {
      // Act
      manager.set('currentTask', 'new-task');

      // Assert
      expect(manager.get('currentTask')).toBe('new-task');
    });

    it('should set nested context value', () => {
      // Act
      manager.set('user.name', 'Jane');

      // Assert
      expect(manager.get('user.name')).toBe('Jane');
    });

    it('should set deeply nested context value', () => {
      // Act
      manager.set('user.preferences.theme', 'light');

      // Assert
      expect(manager.get('user.preferences.theme')).toBe('light');
    });

    it('should create intermediate objects when setting nested value', () => {
      // Act
      manager.set('new.nested.value', 'test');

      // Assert
      expect(manager.get('new.nested.value')).toBe('test');
      expect(manager.get('new.nested')).toEqual({ value: 'test' });
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      const context: Context = {
        currentTask: 'test-task',
        activeSkills: ['code-review'],
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(context);
      manager = await ContextManager.load(contextPath);
    });

    it('should update context with partial updates', () => {
      // Arrange
      const updates: Partial<Context> = {
        currentTask: 'updated-task',
        newField: 'new-value',
      };

      // Act
      manager.update(updates);

      // Assert
      expect(manager.get('currentTask')).toBe('updated-task');
      expect(manager.get('newField')).toBe('new-value');
      expect(manager.get('activeSkills')).toEqual(['code-review']); // Preserved
    });

    it('should deep merge nested objects', () => {
      // Arrange
      manager.set('user', { name: 'John', age: 30 });

      const updates: Partial<Context> = {
        user: { age: 31, city: 'NYC' },
      };

      // Act
      manager.update(updates);

      // Assert
      expect(manager.get('user.name')).toBe('John'); // Preserved
      expect(manager.get('user.age')).toBe(31); // Updated
      expect(manager.get('user.city')).toBe('NYC'); // Added
    });
  });

  describe('delete', () => {
    beforeEach(async () => {
      const context: Context = {
        currentTask: 'test-task',
        activeSkills: ['code-review'],
        tempData: 'temporary',
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(context);
      manager = await ContextManager.load(contextPath);
    });

    it('should delete a context key', () => {
      // Act
      manager.delete('tempData');

      // Assert
      expect(manager.get('tempData')).toBeUndefined();
      expect(manager.get('currentTask')).toBe('test-task'); // Others preserved
    });

    it('should not throw error when deleting non-existent key', () => {
      // Act & Assert
      expect(() => manager.delete('non.existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    beforeEach(async () => {
      const context: Context = {
        currentTask: 'test-task',
        activeSkills: ['code-review'],
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(context);
      manager = await ContextManager.load(contextPath);
    });

    it('should clear all context', () => {
      // Act
      manager.clear();

      // Assert
      expect(manager.getAll()).toEqual({});
    });
  });

  describe('save', () => {
    beforeEach(async () => {
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeJson).mockResolvedValue(undefined);
      manager = await ContextManager.load(contextPath);
    });

    it('should save context to file', async () => {
      // Arrange
      manager.set('currentTask', 'test-task');

      // Act
      await manager.save();

      // Assert
      expect(writeJson).toHaveBeenCalledWith(
        contextPath,
        expect.objectContaining({ currentTask: 'test-task' })
      );
    });

    it('should handle save errors gracefully', async () => {
      // Arrange
      vi.mocked(writeJson).mockRejectedValue(new Error('Write failed'));
      manager.set('currentTask', 'test-task');

      // Act & Assert
      await expect(manager.save()).rejects.toThrow('Write failed');
    });
  });

  describe('load', () => {
    it('should load context from file', async () => {
      // Arrange
      const savedContext: Context = {
        currentTask: 'saved-task',
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(savedContext);

      // Act
      await manager.load();

      // Assert
      expect(manager.get('currentTask')).toBe('saved-task');
    });

    it('should handle load errors gracefully', async () => {
      // Arrange
      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockRejectedValue(new Error('Read failed'));

      // Act & Assert
      await expect(manager.load()).rejects.toThrow('Read failed');
    });
  });

  describe('share (multi-agent support)', () => {
    beforeEach(async () => {
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeJson).mockResolvedValue(undefined);
      manager = await ContextManager.load(contextPath);
    });

    it('should be a no-op for single-agent mode', () => {
      // Arrange
      manager.set('localData', 'test');

      // Act & Assert
      expect(() => manager.share('agent-b', ['localData'])).not.toThrow();
    });

    it('should not affect local context', () => {
      // Arrange
      manager.set('localData', 'test');

      // Act
      manager.share('agent-b', ['localData']);

      // Assert
      expect(manager.get('localData')).toBe('test');
    });
  });

  describe('has', () => {
    beforeEach(async () => {
      const context: Context = {
        currentTask: 'test-task',
        user: {
          name: 'John',
        },
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(context);
      manager = await ContextManager.load(contextPath);
    });

    it('should return true for existing key', () => {
      // Act & Assert
      expect(manager.has('currentTask')).toBe(true);
    });

    it('should return true for nested existing key', () => {
      // Act & Assert
      expect(manager.has('user.name')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      // Act & Assert
      expect(manager.has('nonExistent')).toBe(false);
    });

    it('should return false for nested non-existent key', () => {
      // Act & Assert
      expect(manager.has('user.age')).toBe(false);
    });
  });

  describe('keys', () => {
    beforeEach(async () => {
      const context: Context = {
        currentTask: 'test-task',
        activeSkills: ['code-review'],
        user: {
          name: 'John',
        },
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(context);
      manager = await ContextManager.load(contextPath);
    });

    it('should return all top-level keys', () => {
      // Act
      const keys = manager.keys();

      // Assert
      expect(keys).toEqual(['currentTask', 'activeSkills', 'user']);
    });
  });

  describe('size', () => {
    beforeEach(async () => {
      const context: Context = {
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(context);
      manager = await ContextManager.load(contextPath);
    });

    it('should return number of top-level keys', () => {
      // Act
      const size = manager.size();

      // Assert
      expect(size).toBe(3);
    });

    it('should return 0 for empty context', async () => {
      // Arrange
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeJson).mockResolvedValue(undefined);
      const emptyManager = await ContextManager.load(contextPath);

      // Act
      const size = emptyManager.size();

      // Assert
      expect(size).toBe(0);
    });
  });
});
