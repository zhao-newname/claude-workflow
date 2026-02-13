/**
 * SkillManager Tests
 *
 * Tests for the SkillManager class that handles skill loading and management
 * with three-layer priority: Project → Tech Stack → Universal
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SkillManager } from './skill-manager.js';
import type { Skill, SkillQuery } from '../types/index.js';
import type { IConfigManager } from '../types/interfaces.js';

// Mock fs-extra and utils
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
    readdir: vi.fn(),
  },
  pathExists: vi.fn(),
  readFile: vi.fn(),
  readdir: vi.fn(),
}));

vi.mock('../utils/fs.js', async () => {
  const actual = await vi.importActual('../utils/fs.js');
  return {
    ...actual,
    fileExists: vi.fn(),
  };
});

import fs from 'fs-extra';
import { fileExists } from '../utils/fs.js';

describe('SkillManager', () => {
  let manager: SkillManager;
  let mockConfig: IConfigManager;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock config
    mockConfig = {
      get: vi.fn(),
      getAll: vi.fn(),
      set: vi.fn(),
      merge: vi.fn(),
      validate: vi.fn(),
      registerValidator: vi.fn(),
      registerTransformer: vi.fn(),
    };

    // Mock config to return project directory
    (mockConfig.get as any).mockReturnValue('/test/project');

    manager = new SkillManager(mockConfig, '/test/project', '/test/workflow');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('should load skill from project directory first', async () => {
      // Arrange
      const skillContent = `---
name: test-skill
description: Test skill
version: 1.0.0
---

# Test Skill

This is a test skill.`;

      vi.mocked(fileExists).mockImplementation(async (path: string) => {
        return path === '/test/project/.claude/skills/test-skill/SKILL.md';
      });

      vi.mocked(fs.readFile).mockResolvedValue(skillContent as any);

      // Act
      const skill = await manager.get('test-skill');

      // Assert
      expect(skill).toBeDefined();
      expect(skill?.metadata.name).toBe('test-skill');
      expect(skill?.metadata.description).toBe('Test skill');
      expect(skill?.metadata.version).toBe('1.0.0');
      expect(skill?.content).toContain('This is a test skill');
    });

    it('should fallback to tech-stack directory when not found in project', async () => {
      // Arrange
      const skillContent = `---
name: nodejs-backend
description: Node.js backend skill
version: 1.0.0
---

# Node.js Backend`;

      vi.mocked(fileExists).mockImplementation(async (path: string) => {
        return path === '/test/workflow/skills/tech-stack/nodejs-backend/SKILL.md';
      });

      vi.mocked(fs.readFile).mockResolvedValue(skillContent as any);

      // Act
      const skill = await manager.get('nodejs-backend');

      // Assert
      expect(skill).toBeDefined();
      expect(skill?.metadata.name).toBe('nodejs-backend');
    });

    it('should fallback to universal directory when not found in tech-stack', async () => {
      // Arrange
      const skillContent = `---
name: code-review
description: Code review skill
version: 1.0.0
---

# Code Review`;

      vi.mocked(fileExists).mockImplementation(async (path: string) => {
        return path === '/test/workflow/skills/universal/code-review/SKILL.md';
      });

      vi.mocked(fs.readFile).mockResolvedValue(skillContent as any);

      // Act
      const skill = await manager.get('code-review');

      // Assert
      expect(skill).toBeDefined();
      expect(skill?.metadata.name).toBe('code-review');
    });

    it('should return null when skill not found in any directory', async () => {
      // Arrange
      vi.mocked(fileExists).mockResolvedValue(false);

      // Act
      const skill = await manager.get('non-existent');

      // Assert
      expect(skill).toBeNull();
    });

    it('should cache loaded skills', async () => {
      // Arrange
      const skillContent = `---
name: test-skill
description: Test skill
version: 1.0.0
---

# Test Skill`;

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(skillContent as any);

      // Act
      const skill1 = await manager.get('test-skill');
      const skill2 = await manager.get('test-skill');

      // Assert
      expect(skill1).toBe(skill2); // Same instance
      expect(fs.readFile).toHaveBeenCalledTimes(1); // Only read once
    });
  });

  describe('list', () => {
    it('should list all skills from all directories', async () => {
      // Arrange
      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(fs.readdir).mockImplementation(async (path: string) => {
        const entries = [];
        if ((path as string).includes('project')) {
          entries.push({ name: 'project-skill', isDirectory: () => true });
        } else if ((path as string).includes('tech-stack')) {
          entries.push({ name: 'nodejs-backend', isDirectory: () => true });
        } else if ((path as string).includes('universal')) {
          entries.push({ name: 'code-review', isDirectory: () => true });
          entries.push({ name: 'testing', isDirectory: () => true });
        }
        return entries as any;
      });

      const skillContent = `---
name: test
description: test
version: 1.0.0
---
# Test`;

      vi.mocked(fs.readFile).mockResolvedValue(skillContent as any);

      // Act
      const skills = await manager.list();

      // Assert
      expect(skills.length).toBeGreaterThan(0);
    });

    it('should return empty array when no skills found', async () => {
      // Arrange
      vi.mocked(fileExists).mockResolvedValue(false);

      // Act
      const skills = await manager.list();

      // Assert
      expect(skills).toEqual([]);
    });
  });

  describe('find', () => {
    it('should find skills by keywords', async () => {
      // Arrange
      const query: SkillQuery = {
        keywords: ['review', 'code'],
      };

      // Mock list to return some skills
      vi.spyOn(manager, 'list').mockResolvedValue([
        {
          metadata: {
            name: 'code-review',
            description: 'Code review guidelines',
            version: '1.0.0',
          },
          config: {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
          content: 'Code review content',
        },
        {
          metadata: {
            name: 'testing',
            description: 'Testing guidelines',
            version: '1.0.0',
          },
          config: {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
          content: 'Testing content',
        },
      ] as Skill[]);

      // Act
      const skills = await manager.find(query);

      // Assert
      expect(skills.length).toBeGreaterThan(0);
      expect(skills[0].metadata.name).toBe('code-review');
    });

    it('should find skills by source', async () => {
      // Arrange
      const query: SkillQuery = {
        source: 'universal',
      };

      vi.spyOn(manager, 'list').mockResolvedValue([
        {
          metadata: {
            name: 'code-review',
            description: 'Code review',
            version: '1.0.0',
          },
          config: {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
          content: 'Content',
        },
      ] as Skill[]);

      // Act
      const skills = await manager.find(query);

      // Assert
      expect(skills.length).toBe(1);
      expect(skills[0].config.source).toBe('universal');
    });
  });

  describe('search', () => {
    it('should search skills by keyword in name or description', async () => {
      // Arrange
      vi.spyOn(manager, 'list').mockResolvedValue([
        {
          metadata: {
            name: 'code-review',
            description: 'Code review guidelines',
            version: '1.0.0',
          },
          config: {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
          content: 'Content',
        },
        {
          metadata: {
            name: 'testing',
            description: 'Testing guidelines',
            version: '1.0.0',
          },
          config: {
            source: 'universal',
            type: 'domain',
            enforcement: 'suggest',
            priority: 'high',
          },
          content: 'Content',
        },
      ] as Skill[]);

      // Act
      const skills = await manager.search('review');

      // Assert
      expect(skills.length).toBe(1);
      expect(skills[0].metadata.name).toBe('code-review');
    });
  });

  describe('activate/deactivate', () => {
    it('should activate a skill', async () => {
      // Arrange
      const skillContent = `---
name: test-skill
description: Test skill
version: 1.0.0
---
# Test`;

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(skillContent as any);

      // Act
      await manager.activate('test-skill');

      // Assert
      // Verify skill is loaded (cached)
      const skill = await manager.get('test-skill');
      expect(skill).toBeDefined();
      expect(manager.getActiveSkills()).toContain('test-skill');
    });

    it('should deactivate a skill', async () => {
      // Arrange
      const skillContent = `---
name: test-skill
description: Test skill
version: 1.0.0
---
# Test`;

      vi.mocked(fileExists).mockResolvedValue(true);
      vi.mocked(fs.readFile).mockResolvedValue(skillContent as any);

      await manager.activate('test-skill');

      // Act
      await manager.deactivate('test-skill');

      // Assert
      expect(manager.getActiveSkills()).not.toContain('test-skill');
    });
  });

  describe('registerLoader', () => {
    it('should allow registering custom loaders', () => {
      // Arrange
      const customLoader = {
        load: vi.fn(),
        list: vi.fn(),
      };

      // Act
      manager.registerLoader(customLoader);

      // Assert
      // Verify loader is registered (implementation detail)
      expect(() => manager.registerLoader(customLoader)).not.toThrow();
    });
  });
});
