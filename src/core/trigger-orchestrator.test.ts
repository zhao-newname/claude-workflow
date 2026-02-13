/**
 * TriggerOrchestrator Tests
 *
 * Comprehensive test suite for TriggerOrchestrator
 * Tests skill evaluation, priority ordering, caching, and performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { TriggerOrchestrator } from './trigger-orchestrator';
import { Skill } from '../types';

describe('TriggerOrchestrator', () => {
  let orchestrator: TriggerOrchestrator;
  let testDir: string;

  beforeEach(async () => {
    orchestrator = new TriggerOrchestrator();
    testDir = resolve(__dirname, '../../test-fixtures/trigger-orchestrator');
    await createTestDirectory();
  });

  afterEach(async () => {
    orchestrator.clearCache();
    await cleanupTestDirectory();
  });

  describe('Single File Evaluation', () => {
    it('should evaluate file against skill with path patterns', async () => {
      const testFile = join(testDir, 'src/component.tsx');
      await fs.writeFile(testFile, 'export const Component = () => {};');

      const skill = createMockSkill('react-dev', {
        pathPatterns: ['**/*.tsx']
      });

      const result = await orchestrator.evaluateFile(testFile, skill);

      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('path');
      expect(result.matchedPatterns.pathPatterns).toContain('**/*.tsx');
    });

    it('should evaluate file against skill with content patterns', async () => {
      const testFile = join(testDir, 'routes.ts');
      await fs.writeFile(testFile, 'app.get("/users", handler);');

      const skill = createMockSkill('express-dev', {
        contentPatterns: ['app\\.(get|post|put|delete)']
      });

      const result = await orchestrator.evaluateFile(testFile, skill);

      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('content');
      expect(result.matchedPatterns.contentPatterns.length).toBeGreaterThan(0);
    });

    it('should match both path and content patterns', async () => {
      const testFile = join(testDir, 'src/routes.ts');
      await fs.writeFile(testFile, 'router.get("/api", handler);');

      const skill = createMockSkill('backend-dev', {
        pathPatterns: ['src/**/*.ts'],
        contentPatterns: ['router\\.']
      });

      const result = await orchestrator.evaluateFile(testFile, skill);

      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('both');
    });

    it('should not match when patterns do not match', async () => {
      const testFile = join(testDir, 'test.js');
      await fs.writeFile(testFile, 'const test = true;');

      const skill = createMockSkill('typescript-dev', {
        pathPatterns: ['**/*.ts'],
        contentPatterns: ['interface\\s+']
      });

      const result = await orchestrator.evaluateFile(testFile, skill);

      expect(result.matched).toBe(false);
      expect(result.matchType).toBe('none');
    });
  });

  describe('Multiple Skills Evaluation', () => {
    it('should evaluate file against multiple skills', async () => {
      const testFile = join(testDir, 'src/component.tsx');
      await fs.writeFile(testFile, 'export interface Props {}');

      const skills = [
        createMockSkill('react-dev', { pathPatterns: ['**/*.tsx'] }),
        createMockSkill('typescript-dev', { contentPatterns: ['interface\\s+'] }),
        createMockSkill('python-dev', { pathPatterns: ['**/*.py'] })
      ];

      const summary = await orchestrator.evaluateFileAgainstSkills(testFile, skills);

      expect(summary.matchedSkills.length).toBe(2);
      expect(summary.results.length).toBe(3);
      expect(summary.totalTime).toBeGreaterThan(0);
    });

    it('should order matched skills by priority', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const test = true;');

      const skills = [
        createMockSkill('low-priority', { pathPatterns: ['**/*.ts'] }, 'low'),
        createMockSkill('critical-priority', { pathPatterns: ['**/*.ts'] }, 'critical'),
        createMockSkill('high-priority', { pathPatterns: ['**/*.ts'] }, 'high')
      ];

      const summary = await orchestrator.evaluateFileAgainstSkills(testFile, skills);

      expect(summary.matchedSkills[0].metadata.name).toBe('critical-priority');
      expect(summary.matchedSkills[1].metadata.name).toBe('high-priority');
      expect(summary.matchedSkills[2].metadata.name).toBe('low-priority');
    });
  });

  describe('Caching', () => {
    it('should cache evaluation results', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const test = true;');

      const skill = createMockSkill('test-skill', {
        pathPatterns: ['**/*.ts']
      });

      // First evaluation - not cached
      const result1 = await orchestrator.evaluateFile(testFile, skill);
      expect(result1.cached).toBe(false);

      // Second evaluation - should be cached
      const result2 = await orchestrator.evaluateFile(testFile, skill);
      expect(result2.cached).toBe(true);
      expect(result2.matched).toBe(result1.matched);
    });

    it('should invalidate cache when file is modified', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const test = true;');

      const skill = createMockSkill('test-skill', {
        pathPatterns: ['**/*.ts']
      });

      await orchestrator.evaluateFile(testFile, skill);

      // Modify file
      await new Promise(resolve => setTimeout(resolve, 10));
      await fs.writeFile(testFile, 'const modified = true;');

      const result = await orchestrator.evaluateFile(testFile, skill);
      expect(result.cached).toBe(false);
    });

    it('should report cache hit rate', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const test = true;');

      const skills = [
        createMockSkill('skill1', { pathPatterns: ['**/*.ts'] }),
        createMockSkill('skill2', { pathPatterns: ['**/*.ts'] })
      ];

      // First evaluation
      await orchestrator.evaluateFileAgainstSkills(testFile, skills);

      // Second evaluation - should have cache hits
      const summary = await orchestrator.evaluateFileAgainstSkills(testFile, skills);
      expect(summary.cacheHitRate).toBeGreaterThan(0);
    });
  });

  describe('Directory Scanning', () => {
    it('should find matching files in directory', async () => {
      // Create test files
      await fs.writeFile(join(testDir, 'component.tsx'), 'export const C = () => {};');
      await fs.writeFile(join(testDir, 'utils.ts'), 'export const util = () => {};');
      await fs.writeFile(join(testDir, 'style.css'), '.class {}');

      const skills = [
        createMockSkill('react-dev', { pathPatterns: ['**/*.tsx'] }),
        createMockSkill('typescript-dev', { pathPatterns: ['**/*.ts'] })
      ];

      const fileSkillMap = await orchestrator.findMatchingFiles(testDir, skills);

      expect(fileSkillMap.size).toBeGreaterThan(0);

      const tsxFile = Array.from(fileSkillMap.keys()).find(f => f.endsWith('.tsx'));
      expect(tsxFile).toBeDefined();
      expect(fileSkillMap.get(tsxFile!)?.some(s => s.metadata.name === 'react-dev')).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should evaluate files quickly', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const test = true;');

      const skill = createMockSkill('test-skill', {
        pathPatterns: ['**/*.ts']
      });

      const startTime = performance.now();
      await orchestrator.evaluateFile(testFile, skill);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Target: <100ms
    });

    it('should handle multiple skills efficiently', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const test = true;');

      const skills = Array.from({ length: 10 }, (_, i) =>
        createMockSkill(`skill${i}`, { pathPatterns: ['**/*.ts'] })
      );

      const startTime = performance.now();
      await orchestrator.evaluateFileAgainstSkills(testFile, skills);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });
  });

  describe('Statistics', () => {
    it('should provide orchestrator statistics', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const test = true;');

      const skill = createMockSkill('test-skill', {
        pathPatterns: ['**/*.ts']
      });

      await orchestrator.evaluateFile(testFile, skill);

      const stats = orchestrator.getStats();
      expect(stats.patternCache).toBeGreaterThanOrEqual(0);
      expect(stats.analysisCache).toBeGreaterThanOrEqual(0);
      expect(stats.contentStats).toBeDefined();
    });

    it('should clear all caches', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const test = true;');

      const skill = createMockSkill('test-skill', {
        pathPatterns: ['**/*.ts']
      });

      await orchestrator.evaluateFile(testFile, skill);
      orchestrator.clearCache();

      const stats = orchestrator.getStats();
      expect(stats.analysisCache).toBe(0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should match TypeScript backend files', async () => {
      const testFile = join(testDir, 'backend/routes/users.ts');
      await fs.writeFile(testFile, 'router.get("/users", async (req, res) => {});');

      const skill = createMockSkill('backend-dev', {
        pathPatterns: ['backend/**/*.ts'],
        contentPatterns: ['router\\.(get|post|put|delete)']
      });

      const result = await orchestrator.evaluateFile(testFile, skill);

      expect(result.matched).toBe(true);
      expect(result.matchType).toBe('both');
    });

    it('should match React components', async () => {
      const testFile = join(testDir, 'src/components/Button.tsx');
      const content = `
import React from 'react';

export const Button: React.FC = () => {
  return <button>Click me</button>;
};
`;
      await fs.writeFile(testFile, content);

      const skill = createMockSkill('react-dev', {
        pathPatterns: ['src/components/**/*.tsx'],
        contentPatterns: ['React\\.FC', 'export\\s+const\\s+\\w+']
      });

      const result = await orchestrator.evaluateFile(testFile, skill);

      expect(result.matched).toBe(true);
    });
  });

  // Helper functions
  function createMockSkill(
    name: string,
    fileTriggers: { pathPatterns?: string[]; contentPatterns?: string[] },
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium'
  ): Skill {
    return {
      metadata: {
        name,
        description: `Test skill ${name}`,
        version: '1.0.0'
      },
      config: {
        source: 'project',
        type: 'domain',
        enforcement: 'suggest',
        priority,
        triggers: {
          fileTriggers
        }
      },
      content: `# ${name}\n\nTest skill content`
    };
  }

  async function createTestDirectory(): Promise<void> {
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(join(testDir, 'src'), { recursive: true });
    await fs.mkdir(join(testDir, 'backend/routes'), { recursive: true });
    await fs.mkdir(join(testDir, 'src/components'), { recursive: true });
  }

  async function cleanupTestDirectory(): Promise<void> {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});