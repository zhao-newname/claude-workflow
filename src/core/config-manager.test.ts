/**
 * ConfigManager Tests
 *
 * Tests for the ConfigManager class that handles configuration management
 * with JSON Schema validation and migration support
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigManager } from './config-manager.js';
import type { WorkflowConfig, ValidationResult } from '../types/index.js';
import type { IConfigValidator, IConfigTransformer } from '../types/interfaces.js';

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

import fs from 'fs-extra';
import { fileExists, readJson, writeJson } from '../utils/fs.js';

describe('ConfigManager', () => {
  let manager: ConfigManager;
  const configPath = '/test/project/.claude/settings.json';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should load existing config on initialization', async () => {
      // Arrange
      const existingConfig: WorkflowConfig = {
        version: '1.0',
        mode: 'single-agent',
        skills: {
          'code-review': {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
        },
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(existingConfig);

      // Act
      manager = await ConfigManager.load(configPath);

      // Assert
      expect(manager.getAll()).toEqual(existingConfig);
    });

    it('should create default config when file does not exist', async () => {
      // Arrange
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeJson).mockResolvedValue(undefined);

      // Act
      manager = await ConfigManager.load(configPath);

      // Assert
      const config = manager.getAll();
      expect(config.version).toBe('1.0');
      expect(config.mode).toBe('single-agent');
      expect(writeJson).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      const config: WorkflowConfig = {
        version: '1.0',
        mode: 'single-agent',
        skills: {
          'code-review': {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
        },
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(config);
      manager = await ConfigManager.load(configPath);
    });

    it('should get top-level config value', () => {
      // Act
      const mode = manager.get<string>('mode');

      // Assert
      expect(mode).toBe('single-agent');
    });

    it('should get nested config value using dot notation', () => {
      // Act
      const source = manager.get<string>('skills.code-review.source');

      // Assert
      expect(source).toBe('universal');
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
      manager = await ConfigManager.load(configPath);
    });

    it('should set top-level config value', () => {
      // Act
      manager.set('mode', 'multi-agent');

      // Assert
      expect(manager.get('mode')).toBe('multi-agent');
    });

    it('should set nested config value using dot notation', () => {
      // Act
      manager.set('skills.testing.priority', 'critical');

      // Assert
      expect(manager.get('skills.testing.priority')).toBe('critical');
    });

    it('should mark config as dirty when value is set', () => {
      // Act
      manager.set('mode', 'multi-agent');

      // Assert
      expect(manager.isDirty()).toBe(true);
    });
  });

  describe('merge', () => {
    beforeEach(async () => {
      const config: WorkflowConfig = {
        version: '1.0',
        mode: 'single-agent',
        skills: {
          'code-review': {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
        },
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(config);
      manager = await ConfigManager.load(configPath);
    });

    it('should merge partial config', () => {
      // Arrange
      const partial: Partial<WorkflowConfig> = {
        mode: 'multi-agent',
        skills: {
          testing: {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
        },
      };

      // Act
      manager.merge(partial);

      // Assert
      expect(manager.get('mode')).toBe('multi-agent');
      expect(manager.get('skills.testing')).toBeDefined();
      expect(manager.get('skills.code-review')).toBeDefined(); // Original preserved
    });

    it('should deep merge nested objects', () => {
      // Arrange
      const partial: Partial<WorkflowConfig> = {
        skills: {
          'code-review': {
            source: 'universal',
            type: 'domain',
            enforcement: 'block', // Changed
            priority: 'critical', // Changed
          },
        },
      };

      // Act
      manager.merge(partial);

      // Assert
      expect(manager.get('skills.code-review.enforcement')).toBe('block');
      expect(manager.get('skills.code-review.priority')).toBe('critical');
    });
  });

  describe('save', () => {
    beforeEach(async () => {
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeJson).mockResolvedValue(undefined);
      manager = await ConfigManager.load(configPath);
    });

    it('should save config to file', async () => {
      // Arrange
      manager.set('mode', 'multi-agent');

      // Act
      await manager.save();

      // Assert
      expect(writeJson).toHaveBeenCalledWith(
        configPath,
        expect.objectContaining({ mode: 'multi-agent' })
      );
    });

    it('should not save if config is not dirty', async () => {
      // Arrange
      vi.mocked(writeJson).mockClear();

      // Act
      await manager.save();

      // Assert
      expect(writeJson).not.toHaveBeenCalled();
    });

    it('should mark config as clean after save', async () => {
      // Arrange
      manager.set('mode', 'multi-agent');
      expect(manager.isDirty()).toBe(true);

      // Act
      await manager.save();

      // Assert
      expect(manager.isDirty()).toBe(false);
    });
  });

  describe('validate', () => {
    beforeEach(async () => {
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeJson).mockResolvedValue(undefined);
      manager = await ConfigManager.load(configPath);
    });

    it('should validate config with default validator', () => {
      // Act
      const result = manager.validate();

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect invalid config', () => {
      // Arrange
      manager.set('mode', 'invalid-mode' as any);

      // Act
      const result = manager.validate();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should use custom validators', () => {
      // Arrange
      const customValidator: IConfigValidator = {
        validate: vi.fn().mockReturnValue({
          valid: false,
          errors: [{ path: 'custom', message: 'Custom error' }],
        }),
      };

      manager.registerValidator(customValidator);

      // Act
      const result = manager.validate();

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({ path: 'custom', message: 'Custom error' });
    });
  });

  describe('registerValidator', () => {
    beforeEach(async () => {
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeJson).mockResolvedValue(undefined);
      manager = await ConfigManager.load(configPath);
    });

    it('should register custom validator', () => {
      // Arrange
      const validator: IConfigValidator = {
        validate: vi.fn().mockReturnValue({ valid: true, errors: [] }),
      };

      // Act
      manager.registerValidator(validator);
      manager.validate();

      // Assert
      expect(validator.validate).toHaveBeenCalled();
    });
  });

  describe('registerTransformer', () => {
    beforeEach(async () => {
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeJson).mockResolvedValue(undefined);
      manager = await ConfigManager.load(configPath);
    });

    it('should register config transformer', () => {
      // Arrange
      const transformer: IConfigTransformer = {
        from: '1.0',
        to: '2.0',
        transform: vi.fn((config) => ({ ...config, version: '2.0' })),
      };

      // Act & Assert
      expect(() => manager.registerTransformer(transformer)).not.toThrow();
    });
  });

  describe('migrate', () => {
    it('should migrate config from old version to new version', async () => {
      // Arrange
      const oldConfig: WorkflowConfig = {
        version: '1.0',
        mode: 'single-agent',
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(oldConfig);
      vi.mocked(writeJson).mockResolvedValue(undefined);

      manager = await ConfigManager.load(configPath);

      const transformer: IConfigTransformer = {
        from: '1.0',
        to: '2.0',
        transform: (config) => ({
          ...config,
          version: '2.0',
          newField: 'added',
        }),
      };

      manager.registerTransformer(transformer);

      // Act
      await manager.migrate('2.0');

      // Assert
      expect(manager.get('version')).toBe('2.0');
      expect(manager.get('newField')).toBe('added');
    });

    it('should throw error when no migration path exists', async () => {
      // Arrange
      vi.mocked(fileExists).mockResolvedValue(false);
      vi.mocked(writeJson).mockResolvedValue(undefined);
      manager = await ConfigManager.load(configPath);

      // Act & Assert
      await expect(manager.migrate('3.0')).rejects.toThrow();
    });
  });

  describe('reset', () => {
    beforeEach(async () => {
      const config: WorkflowConfig = {
        version: '1.0',
        mode: 'multi-agent',
        skills: {
          'code-review': {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
        },
      };

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(readJson).mockResolvedValue(config);
      manager = await ConfigManager.load(configPath);
    });

    it('should reset config to default', () => {
      // Act
      manager.reset();

      // Assert
      expect(manager.get('mode')).toBe('single-agent');
      expect(manager.get('skills')).toEqual({});
    });
  });
});
