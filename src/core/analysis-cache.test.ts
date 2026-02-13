/**
 * AnalysisCache Tests
 *
 * Comprehensive test suite for AnalysisCache class
 * Tests LRU eviction, mtime validation, memory limits, and statistics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { AnalysisCache } from './analysis-cache';

describe('AnalysisCache', () => {
  let cache: AnalysisCache<string>;
  let testDir: string;

  beforeEach(async () => {
    cache = new AnalysisCache<string>();
    testDir = resolve(__dirname, '../../test-fixtures/analysis-cache');
    await createTestDirectory();
  });

  afterEach(async () => {
    cache.clear();
    await cleanupTestDirectory();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', 'value1');
      const value = await cache.get('key1');
      expect(value).toBe('value1');
    });

    it('should return undefined for non-existent keys', async () => {
      const value = await cache.get('non-existent');
      expect(value).toBeUndefined();
    });

    it('should check if key exists', async () => {
      await cache.set('key1', 'value1');
      expect(await cache.has('key1')).toBe(true);
      expect(await cache.has('key2')).toBe(false);
    });

    it('should delete keys', async () => {
      await cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(await cache.get('key1')).toBeUndefined();
    });

    it('should return false when deleting non-existent key', () => {
      expect(cache.delete('non-existent')).toBe(false);
    });

    it('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entries when size limit reached', async () => {
      const smallCache = new AnalysisCache<string>({ maxSize: 3 });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');
      await smallCache.set('key4', 'value4'); // Should evict key1

      expect(await smallCache.get('key1')).toBeUndefined();
      expect(await smallCache.get('key2')).toBe('value2');
      expect(await smallCache.get('key3')).toBe('value3');
      expect(await smallCache.get('key4')).toBe('value4');
    });

    it('should update access order on get', async () => {
      const smallCache = new AnalysisCache<string>({ maxSize: 3 });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');

      // Access key1 to make it most recently used
      await smallCache.get('key1');

      // Add key4, should evict key2 (least recently used)
      await smallCache.set('key4', 'value4');

      expect(await smallCache.get('key1')).toBe('value1');
      expect(await smallCache.get('key2')).toBeUndefined();
      expect(await smallCache.get('key3')).toBe('value3');
      expect(await smallCache.get('key4')).toBe('value4');
    });

    it('should track eviction count', async () => {
      const smallCache = new AnalysisCache<string>({ maxSize: 2 });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3'); // Evicts key1
      await smallCache.set('key4', 'value4'); // Evicts key2

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(2);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTTLCache = new AnalysisCache<string>({ ttl: 100 }); // 100ms

      await shortTTLCache.set('key1', 'value1');
      expect(await shortTTLCache.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(await shortTTLCache.get('key1')).toBeUndefined();
    });

    it('should invalidate expired entries', async () => {
      const shortTTLCache = new AnalysisCache<string>({ ttl: 100 });

      await shortTTLCache.set('key1', 'value1');
      await shortTTLCache.set('key2', 'value2');

      await new Promise(resolve => setTimeout(resolve, 150));

      const invalidated = shortTTLCache.invalidateExpired();
      expect(invalidated).toBe(2);
      expect(shortTTLCache.size()).toBe(0);
    });
  });

  describe('File Modification Time Validation', () => {
    it('should track file mtime', async () => {
      const testFile = join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'content');

      await cache.set('key1', 'value1', testFile);
      expect(await cache.get('key1', testFile)).toBe('value1');
    });

    it('should invalidate when file is modified', async () => {
      const testFile = join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'content');

      await cache.set('key1', 'value1', testFile);

      // Modify file
      await new Promise(resolve => setTimeout(resolve, 10));
      await fs.writeFile(testFile, 'modified content');

      // Cache should be invalidated
      expect(await cache.get('key1', testFile)).toBeUndefined();
    });

    it('should work without mtime checking', async () => {
      const noMtimeCache = new AnalysisCache<string>({ checkMtime: false });
      const testFile = join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'content');

      await noMtimeCache.set('key1', 'value1', testFile);

      // Modify file
      await fs.writeFile(testFile, 'modified content');

      // Cache should still be valid
      expect(await noMtimeCache.get('key1', testFile)).toBe('value1');
    });

    it('should invalidate entries for specific file', async () => {
      const testFile = join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'content');

      await cache.set(`${testFile}:pattern1`, 'value1', testFile);
      await cache.set(`${testFile}:pattern2`, 'value2', testFile);
      await cache.set('other:pattern', 'value3');

      const invalidated = await cache.invalidateFile(testFile);
      expect(invalidated).toBe(2);
      expect(cache.size()).toBe(1);
    });
  });

  describe('Memory Management', () => {
    it('should respect memory limits', async () => {
      const smallMemoryCache = new AnalysisCache<string>({
        maxMemoryMB: 0.001, // Very small limit
        maxSize: 1000
      });

      // Add entries until memory limit is reached
      for (let i = 0; i < 10; i++) {
        await smallMemoryCache.set(`key${i}`, 'x'.repeat(1000));
      }

      const stats = smallMemoryCache.getStats();
      expect(stats.memoryUsageMB).toBeLessThan(0.001);
      expect(stats.evictions).toBeGreaterThan(0);
    });

    it('should report memory usage', async () => {
      await cache.set('key1', 'small');
      await cache.set('key2', 'x'.repeat(10000));

      const stats = cache.getStats();
      expect(stats.memoryUsageMB).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set('key1', 'value1');

      await cache.get('key1'); // Hit
      await cache.get('key2'); // Miss
      await cache.get('key1'); // Hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should track cache size', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
    });

    it('should track oldest and newest entries', async () => {
      await cache.set('key1', 'value1');
      await new Promise(resolve => setTimeout(resolve, 10));
      await cache.set('key2', 'value2');

      const stats = cache.getStats();
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
      expect(stats.newestEntry!).toBeGreaterThan(stats.oldestEntry!);
    });

    it('should reset stats on clear', async () => {
      await cache.set('key1', 'value1');
      await cache.get('key1');
      await cache.get('key2');

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  describe('Hot Entries', () => {
    it('should track access frequency', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      // Access key2 multiple times
      await cache.get('key2');
      await cache.get('key2');
      await cache.get('key2');
      await cache.get('key1');

      const hotEntries = cache.getHotEntries(2);
      expect(hotEntries[0].key).toBe('key2');
      expect(hotEntries[0].accessCount).toBe(4); // 1 set + 3 gets
    });

    it('should limit hot entries result', async () => {
      for (let i = 0; i < 10; i++) {
        await cache.set(`key${i}`, `value${i}`);
      }

      const hotEntries = cache.getHotEntries(5);
      expect(hotEntries).toHaveLength(5);
    });
  });

  describe('Utility Methods', () => {
    it('should get all keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const keys = cache.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('should get cache size', async () => {
      expect(cache.size()).toBe(0);

      await cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      await cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });
  });

  describe('Static Methods', () => {
    it('should create cache key from components', () => {
      const key = AnalysisCache.createKey('file.ts', 'pattern', 'option');
      expect(key).toBe('file.ts:pattern:option');
    });

    it('should create cache for file analysis', () => {
      const fileCache = AnalysisCache.forFileAnalysis();
      expect(fileCache).toBeInstanceOf(AnalysisCache);
    });

    it('should create cache for pattern matching', () => {
      const patternCache = AnalysisCache.forPatternMatching();
      expect(patternCache).toBeInstanceOf(AnalysisCache);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle concurrent operations', async () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(cache.set(`key${i}`, `value${i}`));
      }
      await Promise.all(promises);

      expect(cache.size()).toBeGreaterThan(0);
    });

    it('should handle large values', async () => {
      const largeValue = 'x'.repeat(1000000); // 1MB string
      await cache.set('large', largeValue);

      const retrieved = await cache.get('large');
      expect(retrieved).toBe(largeValue);
    });

    it('should handle complex objects', async () => {
      const complexObject = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        },
        date: new Date().toISOString()
      };

      await cache.set('complex', complexObject);
      const retrieved = await cache.get('complex');
      expect(retrieved).toEqual(complexObject);
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