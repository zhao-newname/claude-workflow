/**
 * ContentAnalyzer Tests
 *
 * Comprehensive test suite for ContentAnalyzer class
 * Tests regex matching, binary detection, streaming, and performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { ContentAnalyzer, ContentAnalyzerOptions } from './content-analyzer';

describe('ContentAnalyzer', () => {
  let analyzer: ContentAnalyzer;
  let testDir: string;

  beforeEach(async () => {
    analyzer = new ContentAnalyzer();
    testDir = resolve(__dirname, '../../test-fixtures/content-analyzer');
    await createTestDirectory();
  });

  afterEach(async () => {
    analyzer.resetStats();
    await cleanupTestDirectory();
  });

  describe('Basic Pattern Matching', () => {
    it('should find matches in file content', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'export const test = true;\nexport const value = 42;');

      const result = await analyzer.analyze(testFile, /export/);

      expect(result.matched).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.analysisTime).toBeGreaterThan(0);
      expect(result.isBinary).toBe(false);
    });

    it('should return no matches when pattern not found', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const test = true;');

      const result = await analyzer.analyze(testFile, /import/);

      expect(result.matched).toBe(false);
      expect(result.matches).toHaveLength(0);
    });

    it('should handle string patterns', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'function test() { return true; }');

      const result = await analyzer.analyze(testFile, 'function');

      expect(result.matched).toBe(true);
      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should handle RegExp patterns', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const value1 = 1;\nconst value2 = 2;');

      const result = await analyzer.analyze(testFile, /value\d+/g);

      expect(result.matched).toBe(true);
      expect(result.matches.length).toBe(2);
    });
  });

  describe('Match Details', () => {
    it('should provide line and column information', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const test = true;\nconst value = 42;');

      const result = await analyzer.analyze(testFile, /const/);

      expect(result.matches[0].line).toBe(1);
      expect(result.matches[0].column).toBeGreaterThan(0);
      expect(result.matches[0].text).toContain('const test');
      expect(result.matches[0].matchedText).toBe('const');
    });

    it('should find multiple matches on same line', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'const test = const value;');

      const result = await analyzer.analyze(testFile, /const/g);

      expect(result.matches.length).toBe(2);
      expect(result.matches[0].line).toBe(1);
      expect(result.matches[1].line).toBe(1);
    });

    it('should find matches across multiple lines', async () => {
      const testFile = join(testDir, 'test.ts');
      const content = 'line 1: test\nline 2: test\nline 3: test';
      await fs.writeFile(testFile, content);

      const result = await analyzer.analyze(testFile, /test/g);

      expect(result.matches.length).toBe(3);
      expect(result.matches[0].line).toBe(1);
      expect(result.matches[1].line).toBe(2);
      expect(result.matches[2].line).toBe(3);
    });
  });

  describe('Case Sensitivity', () => {
    it('should be case insensitive by default', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'CONST TEST = TRUE;');

      const result = await analyzer.analyze(testFile, 'const');

      expect(result.matched).toBe(true);
    });

    it('should respect case sensitivity when enabled', async () => {
      const caseSensitiveAnalyzer = new ContentAnalyzer({ caseSensitive: true });
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'CONST TEST = TRUE;');

      const result = await caseSensitiveAnalyzer.analyze(testFile, 'const');

      expect(result.matched).toBe(false);
    });
  });

  describe('Binary File Detection', () => {
    it('should detect and skip binary files', async () => {
      const binaryFile = join(testDir, 'binary.bin');
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE]);
      await fs.writeFile(binaryFile, binaryContent);

      const result = await analyzer.analyze(binaryFile, /test/);

      expect(result.isBinary).toBe(true);
      expect(result.matched).toBe(false);
    });

    it('should not skip binary files when disabled', async () => {
      const noBinarySkipAnalyzer = new ContentAnalyzer({ skipBinary: false });
      const binaryFile = join(testDir, 'binary.bin');
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      await fs.writeFile(binaryFile, binaryContent);

      const result = await noBinarySkipAnalyzer.analyze(binaryFile, /test/);

      expect(result.isBinary).toBe(false);
    });

    it('should handle text files correctly', async () => {
      const textFile = join(testDir, 'text.txt');
      await fs.writeFile(textFile, 'This is a text file with normal content.');

      const result = await analyzer.analyze(textFile, /text/);

      expect(result.isBinary).toBe(false);
      expect(result.matched).toBe(true);
    });
  });

  describe('Large File Handling', () => {
    it('should handle large files with streaming', async () => {
      const largeFile = join(testDir, 'large.txt');
      const lines = Array.from({ length: 10000 }, (_, i) => `Line ${i}: test content`);
      await fs.writeFile(largeFile, lines.join('\n'));

      const result = await analyzer.analyze(largeFile, /test/);

      expect(result.matched).toBe(true);
      expect(result.fileSize).toBeGreaterThan(100000);
    });

    it('should respect max file size limit', async () => {
      const smallLimitAnalyzer = new ContentAnalyzer({ maxFileSize: 100 });
      const largeFile = join(testDir, 'large.txt');
      await fs.writeFile(largeFile, 'x'.repeat(1000));

      const result = await smallLimitAnalyzer.analyze(largeFile, /test/);

      expect(result.matched).toBe(false);
      expect(result.fileSize).toBeGreaterThan(100);
    });

    it('should limit matches to prevent memory issues', async () => {
      const testFile = join(testDir, 'many-matches.txt');
      const content = 'test '.repeat(2000);
      await fs.writeFile(testFile, content);

      const result = await analyzer.analyze(testFile, /test/g);

      expect(result.matches.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Multiple File Analysis', () => {
    it('should analyze multiple files', async () => {
      const files = [
        join(testDir, 'file1.ts'),
        join(testDir, 'file2.ts'),
        join(testDir, 'file3.ts')
      ];

      for (const file of files) {
        await fs.writeFile(file, 'export const test = true;');
      }

      const results = await analyzer.analyzeMultiple(files, /export/);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.matched)).toBe(true);
    });

    it('should check if any file matches', async () => {
      const files = [
        join(testDir, 'file1.ts'),
        join(testDir, 'file2.ts')
      ];

      await fs.writeFile(files[0], 'const test = true;');
      await fs.writeFile(files[1], 'export const value = 42;');

      const hasMatch = await analyzer.matchesAny(files, /export/);

      expect(hasMatch).toBe(true);
    });

    it('should filter files by pattern', async () => {
      const files = [
        join(testDir, 'file1.ts'),
        join(testDir, 'file2.ts'),
        join(testDir, 'file3.ts')
      ];

      await fs.writeFile(files[0], 'export const test = true;');
      await fs.writeFile(files[1], 'const value = 42;');
      await fs.writeFile(files[2], 'export const other = false;');

      const matching = await analyzer.filter(files, /export/);

      expect(matching).toHaveLength(2);
      expect(matching).toContain(files[0]);
      expect(matching).toContain(files[2]);
    });
  });

  describe('Statistics', () => {
    it('should track analysis statistics', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'export const test = true;');

      await analyzer.analyze(testFile, /export/);

      const stats = analyzer.getStats();
      expect(stats.filesAnalyzed).toBe(1);
      expect(stats.bytesProcessed).toBeGreaterThan(0);
      expect(stats.averageAnalysisTime).toBeGreaterThan(0);
    });

    it('should track binary files skipped', async () => {
      const binaryFile = join(testDir, 'binary.bin');
      await fs.writeFile(binaryFile, Buffer.from([0x00, 0x01, 0x02]));

      await analyzer.analyze(binaryFile, /test/);

      const stats = analyzer.getStats();
      expect(stats.binaryFilesSkipped).toBe(1);
    });

    it('should reset statistics', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'test content');

      await analyzer.analyze(testFile, /test/);
      analyzer.resetStats();

      const stats = analyzer.getStats();
      expect(stats.filesAnalyzed).toBe(0);
      expect(stats.bytesProcessed).toBe(0);
    });
  });

  describe('Static Methods', () => {
    it('should validate patterns', () => {
      expect(ContentAnalyzer.isValidPattern('test')).toBe(true);
      expect(ContentAnalyzer.isValidPattern('\\d+')).toBe(true);
      expect(ContentAnalyzer.isValidPattern('[a-z]+')).toBe(true);
      expect(ContentAnalyzer.isValidPattern('[')).toBe(false);
    });

    it('should escape special characters', () => {
      expect(ContentAnalyzer.escape('test.js')).toBe('test\\.js');
      expect(ContentAnalyzer.escape('file[1].js')).toBe('file\\[1\\]\\.js');
      expect(ContentAnalyzer.escape('a*b+c?')).toBe('a\\*b\\+c\\?');
    });
  });

  describe('Factory Methods', () => {
    it('should create analyzer for code patterns', () => {
      const codeAnalyzer = ContentAnalyzer.forCodePatterns();
      expect(codeAnalyzer).toBeInstanceOf(ContentAnalyzer);
    });

    it('should create analyzer for text search', () => {
      const textAnalyzer = ContentAnalyzer.forTextSearch();
      expect(textAnalyzer).toBeInstanceOf(ContentAnalyzer);
    });
  });

  describe('Real-world Patterns', () => {
    it('should find TypeScript interfaces', async () => {
      const testFile = join(testDir, 'types.ts');
      const content = `
interface User {
  name: string;
  age: number;
}

interface Product {
  id: string;
  price: number;
}
`;
      await fs.writeFile(testFile, content);

      const result = await analyzer.analyze(testFile, /interface\s+\w+/g);

      expect(result.matched).toBe(true);
      expect(result.matches.length).toBe(2);
    });

    it('should find function declarations', async () => {
      const testFile = join(testDir, 'functions.ts');
      const content = `
function test() { return true; }
function getValue() { return 42; }
const arrow = () => {};
`;
      await fs.writeFile(testFile, content);

      const result = await analyzer.analyze(testFile, /function\s+\w+/g);

      expect(result.matched).toBe(true);
      expect(result.matches.length).toBe(2);
    });

    it('should find import statements', async () => {
      const testFile = join(testDir, 'imports.ts');
      const content = `
import { test } from './test';
import React from 'react';
import type { User } from './types';
`;
      await fs.writeFile(testFile, content);

      const result = await analyzer.analyze(testFile, /import\s+.*from/g);

      expect(result.matched).toBe(true);
      expect(result.matches.length).toBe(3);
    });

    it('should find Express route definitions', async () => {
      const testFile = join(testDir, 'routes.ts');
      const content = `
app.get('/users', handler);
app.post('/users', handler);
router.put('/users/:id', handler);
`;
      await fs.writeFile(testFile, content);

      const result = await analyzer.analyze(testFile, /\.(get|post|put|delete)\(/g);

      expect(result.matched).toBe(true);
      expect(result.matches.length).toBe(3);
    });
  });

  describe('Performance', () => {
    it('should analyze files quickly', async () => {
      const testFile = join(testDir, 'perf.ts');
      await fs.writeFile(testFile, 'export const test = true;'.repeat(100));

      const startTime = performance.now();
      await analyzer.analyze(testFile, /export/);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(50); // Target: <50ms per file
    });

    it('should handle multiple files efficiently', async () => {
      const files = Array.from({ length: 10 }, (_, i) => join(testDir, `file${i}.ts`));

      for (const file of files) {
        await fs.writeFile(file, 'export const test = true;');
      }

      const startTime = performance.now();
      await analyzer.analyzeMultiple(files, /export/);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });
  });

  // Helper functions
  async function createTestDirectory(): Promise<void> {
    await fs.mkdir(testDir, { recursive: true });
  }

  async function cleanupTestDirectory(): Promise<void> {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});