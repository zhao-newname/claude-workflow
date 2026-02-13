/**
 * Tests for SingleAgentOrchestrator
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SingleAgentOrchestrator } from '../src/orchestration/single-agent-orchestrator.js';
import type { OrchestratorConfig, Task } from '../src/types/index.js';

// Mock fs-extra
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

// Mock core modules
vi.mock('../src/core/skill-manager.js', () => ({
  SkillManager: {
    create: vi.fn().mockResolvedValue({
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      find: vi.fn().mockResolvedValue([]),
      search: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      registerLoader: vi.fn(),
    }),
  },
}));

vi.mock('../src/core/config-manager.js', () => ({
  ConfigManager: {
    load: vi.fn().mockResolvedValue({
      get: vi.fn(),
      getAll: vi.fn().mockReturnValue({ version: '1.0', mode: 'single-agent' }),
      set: vi.fn(),
      merge: vi.fn(),
      validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      registerValidator: vi.fn(),
      registerTransformer: vi.fn(),
    }),
  },
}));

vi.mock('../src/core/context-manager.js', () => ({
  ContextManager: {
    load: vi.fn().mockResolvedValue({
      get: vi.fn(),
      getAll: vi.fn().mockReturnValue({}),
      set: vi.fn(),
      update: vi.fn(),
      share: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      load: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('SingleAgentOrchestrator', () => {
  let orchestrator: SingleAgentOrchestrator;
  let config: OrchestratorConfig;

  beforeEach(() => {
    orchestrator = new SingleAgentOrchestrator();
    config = {
      mode: 'single-agent',
      projectDir: '/test/project',
      workflowDir: '/test/project/.claude',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(orchestrator.initialize(config)).resolves.toBeUndefined();

      const agents = orchestrator.getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('main');
      expect(agents[0].role).toBe('executor');
    });

    it('should initialize core components', async () => {
      const { SkillManager } = await import(
        '../src/core/skill-manager.js'
      );
      const { ConfigManager } = await import(
        '../src/core/config-manager.js'
      );
      const { ContextManager } = await import(
        '../src/core/context-manager.js'
      );

      await orchestrator.initialize(config);

      expect(SkillManager.create).toHaveBeenCalledWith({
        projectDir: config.projectDir,
        workflowDir: config.workflowDir,
      });

      expect(ConfigManager.load).toHaveBeenCalledWith(
        `${config.workflowDir}/settings.json`
      );

      expect(ContextManager.load).toHaveBeenCalledWith(
        `${config.workflowDir}/context.json`
      );
    });

    it('should handle initialization errors', async () => {
      const { SkillManager } = await import(
        '../src/core/skill-manager.js'
      );
      const error = new Error('Initialization failed');
      vi.mocked(SkillManager.create).mockRejectedValueOnce(error);

      await expect(orchestrator.initialize(config)).rejects.toThrow(
        'Initialization failed'
      );
    });
  });

  describe('execute', () => {
    it('should execute task successfully', async () => {
      await orchestrator.initialize(config);

      const task: Task = {
        id: 'task-1',
        description: 'Test task',
        keywords: ['test'],
      };

      const result = await orchestrator.execute(task);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return error if not initialized', async () => {
      const task: Task = {
        id: 'task-2',
        description: 'Test task',
      };

      const result = await orchestrator.execute(task);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not initialized');
    });

    it('should delegate to agent', async () => {
      await orchestrator.initialize(config);

      const task: Task = {
        id: 'task-3',
        description: 'Test task',
        keywords: ['review'],
        files: ['src/test.ts'],
      };

      const result = await orchestrator.execute(task);

      expect(result.success).toBe(true);
    });
  });

  describe('getAgents', () => {
    it('should return empty array before initialization', () => {
      const agents = orchestrator.getAgents();
      expect(agents).toEqual([]);
    });

    it('should return single agent after initialization', async () => {
      await orchestrator.initialize(config);

      const agents = orchestrator.getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('main');
    });
  });

  describe('getAgent', () => {
    it('should return null before initialization', () => {
      const agent = orchestrator.getAgent('main');
      expect(agent).toBeNull();
    });

    it('should return agent by id after initialization', async () => {
      await orchestrator.initialize(config);

      const agent = orchestrator.getAgent('main');
      expect(agent).not.toBeNull();
      expect(agent?.id).toBe('main');
    });

    it('should return null for non-existent agent', async () => {
      await orchestrator.initialize(config);

      const agent = orchestrator.getAgent('non-existent');
      expect(agent).toBeNull();
    });
  });

  describe('registerAgent', () => {
    it('should register a new agent', async () => {
      await orchestrator.initialize(config);

      const { SkillManager } = await import(
        '../src/core/skill-manager.js'
      );
      const { ConfigManager } = await import(
        '../src/core/config-manager.js'
      );
      const { ContextManager } = await import(
        '../src/core/context-manager.js'
      );
      const { SingleAgent } = await import('../src/agent/single-agent.js');

      const mockSkillManager = await SkillManager.create({
        projectDir: '/test',
        workflowDir: '/test/.claude',
      });
      const mockConfigManager = await ConfigManager.load('/test/config.json');
      const mockContextManager = await ContextManager.load(
        '/test/context.json'
      );

      const customAgent = new SingleAgent(
        mockSkillManager,
        mockConfigManager,
        mockContextManager,
        { id: 'custom', role: 'planner' }
      );

      orchestrator.registerAgent(customAgent);

      const agents = orchestrator.getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('custom');
      expect(agents[0].role).toBe('planner');
    });

    it('should replace existing agent', async () => {
      await orchestrator.initialize(config);

      const originalAgents = orchestrator.getAgents();
      expect(originalAgents[0].id).toBe('main');

      const { SkillManager } = await import(
        '../src/core/skill-manager.js'
      );
      const { ConfigManager } = await import(
        '../src/core/config-manager.js'
      );
      const { ContextManager } = await import(
        '../src/core/context-manager.js'
      );
      const { SingleAgent } = await import('../src/agent/single-agent.js');

      const mockSkillManager = await SkillManager.create({
        projectDir: '/test',
        workflowDir: '/test/.claude',
      });
      const mockConfigManager = await ConfigManager.load('/test/config.json');
      const mockContextManager = await ContextManager.load(
        '/test/context.json'
      );

      const newAgent = new SingleAgent(
        mockSkillManager,
        mockConfigManager,
        mockContextManager,
        { id: 'replacement', role: 'reviewer' }
      );

      orchestrator.registerAgent(newAgent);

      const agents = orchestrator.getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe('replacement');
    });
  });
});
