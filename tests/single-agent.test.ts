/**
 * Tests for SingleAgent
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SingleAgent } from '../src/agent/single-agent.js';
import type {
  ISkillManager,
  IConfigManager,
  IContextManager,
} from '../src/types/interfaces.js';
import type { Task, Skill, Message } from '../src/types/index.js';

describe('SingleAgent', () => {
  let mockSkillManager: ISkillManager;
  let mockConfigManager: IConfigManager;
  let mockContextManager: IContextManager;
  let agent: SingleAgent;

  beforeEach(() => {
    // Mock SkillManager
    mockSkillManager = {
      list: vi.fn(),
      get: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      find: vi.fn(),
      search: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      registerLoader: vi.fn(),
    };

    // Mock ConfigManager
    mockConfigManager = {
      get: vi.fn(),
      getAll: vi.fn(),
      set: vi.fn(),
      merge: vi.fn(),
      validate: vi.fn(),
      registerValidator: vi.fn(),
      registerTransformer: vi.fn(),
    };

    // Mock ContextManager
    mockContextManager = {
      get: vi.fn(),
      getAll: vi.fn(),
      set: vi.fn(),
      update: vi.fn(),
      share: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(undefined),
    };

    // Create agent
    agent = new SingleAgent(
      mockSkillManager,
      mockConfigManager,
      mockContextManager
    );
  });

  describe('constructor', () => {
    it('should create agent with default id and role', () => {
      expect(agent.id).toBe('main');
      expect(agent.role).toBe('executor');
    });

    it('should create agent with custom id and role', () => {
      const customAgent = new SingleAgent(
        mockSkillManager,
        mockConfigManager,
        mockContextManager,
        { id: 'custom', role: 'planner' }
      );

      expect(customAgent.id).toBe('custom');
      expect(customAgent.role).toBe('planner');
    });

    it('should store references to managers', () => {
      expect(agent.skills).toBe(mockSkillManager);
      expect(agent.config).toBe(mockConfigManager);
      expect(agent.context).toBe(mockContextManager);
    });
  });

  describe('execute', () => {
    it('should execute task successfully', async () => {
      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        keywords: ['test', 'review'],
        files: ['src/test.ts'],
      };

      const mockSkills: Skill[] = [
        {
          metadata: {
            name: 'code-review',
            description: 'Code review skill',
            version: '1.0.0',
          },
          config: {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
          content: 'Skill content',
        },
      ];

      vi.mocked(mockSkillManager.find).mockResolvedValue(mockSkills);

      const result = await agent.execute(task);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockSkillManager.find).toHaveBeenCalledWith({
        keywords: task.keywords,
        files: task.files,
      });
      expect(mockContextManager.set).toHaveBeenCalledWith(
        'currentTask',
        expect.objectContaining({
          id: task.id,
          description: task.description,
        })
      );
      expect(mockContextManager.set).toHaveBeenCalledWith('activeSkills', [
        'code-review',
      ]);
      expect(mockContextManager.save).toHaveBeenCalled();
    });

    it('should handle task with no keywords or files', async () => {
      const task: Task = {
        id: 'task-2',
        description: 'Simple task',
      };

      vi.mocked(mockSkillManager.find).mockResolvedValue([]);

      const result = await agent.execute(task);

      expect(result.success).toBe(true);
      expect(mockSkillManager.find).toHaveBeenCalledWith({
        keywords: undefined,
        files: undefined,
      });
    });

    it('should handle errors during execution', async () => {
      const task: Task = {
        id: 'task-3',
        description: 'Failing task',
      };

      const error = new Error('Skill manager error');
      vi.mocked(mockSkillManager.find).mockRejectedValue(error);

      const result = await agent.execute(task);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Skill manager error');
    });

    it('should return skill information in result', async () => {
      const task: Task = {
        id: 'task-4',
        description: 'Task with skills',
        keywords: ['test'],
      };

      const mockSkills: Skill[] = [
        {
          metadata: {
            name: 'skill-1',
            description: 'First skill',
            version: '1.0.0',
          },
          config: {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
          content: 'Content 1',
        },
        {
          metadata: {
            name: 'skill-2',
            description: 'Second skill',
            version: '1.0.0',
          },
          config: {
            source: 'tech-stack',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'medium',
          },
          content: 'Content 2',
        },
      ];

      vi.mocked(mockSkillManager.find).mockResolvedValue(mockSkills);

      const result = await agent.execute(task);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        task,
        skills: [
          {
            name: 'skill-1',
            description: 'First skill',
            source: 'universal',
          },
          {
            name: 'skill-2',
            description: 'Second skill',
            source: 'tech-stack',
          },
        ],
      });
    });
  });

  describe('sendMessage', () => {
    it('should be a no-op in single-agent mode', async () => {
      const message: Message = {
        id: 'msg-1',
        from: 'main',
        to: 'other',
        type: 'task',
        payload: { test: 'data' },
        timestamp: Date.now(),
      };

      await expect(agent.sendMessage('other', message)).resolves.toBeUndefined();
    });
  });

  describe('receiveMessage', () => {
    it('should be a no-op in single-agent mode', async () => {
      const message: Message = {
        id: 'msg-2',
        from: 'other',
        to: 'main',
        type: 'result',
        payload: { test: 'data' },
        timestamp: Date.now(),
      };

      await expect(
        agent.receiveMessage('other', message)
      ).resolves.toBeUndefined();
    });
  });
});
