/**
 * PatternMatcher Tests
 *
 * Comprehensive test suite for PatternMatcher class
 * Tests all glob patterns, edge cases, and performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PatternMatcher, PatternMatcherOptions } from './pattern-matcher';

describe('PatternMatcher', () => {
  let matcher: PatternMatcher;

  beforeEach(() => {
    matcher = new PatternMatcher();
  });

  afterEach(() => {
    matcher.clearCache();
  });

  describe('Basic Pattern Matching', () => {
    it('should match exact file names', () => {
      const result = matcher.match('test.js', 'test.js');
      expect(result.matched).toBe(true);
      expect(result.pattern).toBe('test.js');
      expect(result.filePath).toBe('test.js');
      expect(result.matchTime).toBeGreaterThan(0);
    });

    it('should not match different file names', () => {
      const result = matcher.match('test.js', 'other.js');
      expect(result.matched).toBe(false);
    });

    it('should match with wildcard *', () => {
      expect(matcher.match('test.js', '*.js').matched).toBe(true);
      expect(matcher.match('app.ts', '*.js').matched).toBe(false);
      expect(matcher.match('index.html', '*').matched).toBe(true);
    });

    it('should match with question mark ?', () => {
      expect(matcher.match('a.js', '?.js').matched).toBe(true);
      expect(matcher.match('ab.js', '?.js').matched).toBe(false);
      expect(matcher.match('test.js', 'tes?.js').matched).toBe(true);
    });

    it('should match with character classes []', () => {
      expect(matcher.match('a.js', '[abc].js').matched).toBe(true);
      expect(matcher.match('d.js', '[abc].js').matched).toBe(false);
      expect(matcher.match('1.js', '[0-9].js').matched).toBe(true);
    });

    it('should match with braces {}', () => {
      expect(matcher.match('test.js', 'test.{js,ts}').matched).toBe(true);
      expect(matcher.match('test.ts', 'test.{js,ts}').matched).toBe(true);
      expect(matcher.match('test.py', 'test.{js,ts}').matched).toBe(false);
    });
  });

  describe('Globstar Pattern Matching', () => {
    it('should match with globstar **', () => {
      expect(matcher.match('src/components/Button.tsx', 'src/**/*.tsx').matched).toBe(true);
      expect(matcher.match('src/deep/nested/Component.tsx', 'src/**/*.tsx').matched).toBe(true);
      expect(matcher.match('lib/Component.tsx', 'src/**/*.tsx').matched).toBe(false);
    });

    it('should match nested directories with **', () => {
      expect(matcher.match('a/b/c/d/file.js', '**/file.js').matched).toBe(true);
      expect(matcher.match('file.js', '**/file.js').matched).toBe(true);
      expect(matcher.match('a/file.js', '**/file.js').matched).toBe(true);
    });

    it('should match complex globstar patterns', () => {
      const pattern = 'src/**/components/**/*.{tsx,ts}';
      expect(matcher.match('src/components/Button.tsx', pattern).matched).toBe(true);
      expect(matcher.match('src/pages/components/Modal.ts', pattern).matched).toBe(true);
      expect(matcher.match('src/utils/helper.js', pattern).matched).toBe(false);
    });
  });

  describe('Case Sensitivity', () => {
    it('should be case insensitive by default', () => {
      expect(matcher.match('Test.JS', '*.js').matched).toBe(true);
      expect(matcher.match('TEST.js', 'test.js').matched).toBe(true);
    });

    it('should respect case sensitivity when enabled', () => {
      const caseSensitiveMatcher = new PatternMatcher({ caseSensitive: true });
      expect(caseSensitiveMatcher.match('Test.JS', '*.js').matched).toBe(false);
      expect(caseSensitiveMatcher.match('test.js', '*.js').matched).toBe(true);
    });
  });

  describe('Dot Files', () => {
    it('should not match dot files by default', () => {
      expect(matcher.match('.hidden', '*').matched).toBe(false);
      expect(matcher.match('src/.env', 'src/*').matched).toBe(false);
    });

    it('should match dot files when dot option is enabled', () => {
      const dotMatcher = new PatternMatcher({ dot: true });
      expect(dotMatcher.match('.hidden', '*').matched).toBe(true);
      expect(dotMatcher.match('src/.env', 'src/*').matched).toBe(true);
    });
  });

  describe('Multiple Pattern Matching', () => {
    it('should match against multiple patterns', () => {
      const patterns = ['*.js', '*.ts', '*.tsx'];
      const results = matcher.matchMultiple('component.tsx', patterns);

      expect(results).toHaveLength(3);
      expect(results[0].matched).toBe(false); // *.js
      expect(results[1].matched).toBe(false); // *.ts
      expect(results[2].matched).toBe(true);  // *.tsx
    });

    it('should check if matches any pattern', () => {
      const patterns = ['*.js', '*.ts', '*.tsx'];
      expect(matcher.matchesAny('component.tsx', patterns)).toBe(true);
      expect(matcher.matchesAny('style.css', patterns)).toBe(false);
    });

    it('should check if matches all patterns', () => {
      const patterns = ['src/**/*', '*.tsx'];
      expect(matcher.matchesAll('src/Component.tsx', patterns)).toBe(true);
      expect(matcher.matchesAll('Component.tsx', patterns)).toBe(false);
    });
  });

  describe('Filtering', () => {
    const testFiles = [
      'src/components/Button.tsx',
      'src/components/Modal.js',
      'src/utils/helper.ts',
      'tests/Button.test.tsx',
      'README.md',
      '.env'
    ];

    it('should filter files by single pattern', () => {
      const result = matcher.filter(testFiles, '*.tsx');
      expect(result).toEqual(['src/components/Button.tsx', 'tests/Button.test.tsx']);
    });

    it('should filter files by multiple patterns (OR logic)', () => {
      const patterns = ['*.tsx', '*.ts'];
      const result = matcher.filterAny(testFiles, patterns);
      expect(result).toEqual([
        'src/components/Button.tsx',
        'src/utils/helper.ts',
        'tests/Button.test.tsx'
      ]);
    });

    it('should filter with inclusions and exclusions', () => {
      const includePatterns = ['src/**/*'];
      const excludePatterns = ['**/*.test.*'];
      const result = matcher.filterWithExclusions(testFiles, includePatterns, excludePatterns);
      expect(result).toEqual([
        'src/components/Button.tsx',
        'src/components/Modal.js',
        'src/utils/helper.ts'
      ]);
    });

    it('should handle empty include patterns', () => {
      const excludePatterns = ['*.md', '.*'];
      const result = matcher.filterWithExclusions(testFiles, [], excludePatterns);
      expect(result).toEqual([
        'src/components/Button.tsx',
        'src/components/Modal.js',
        'src/utils/helper.ts',
        'tests/Button.test.tsx'
      ]);
    });
  });

  describe('Caching', () => {
    it('should cache compiled patterns', () => {
      const pattern = '**/*.tsx';

      // First match - should compile and cache
      const result1 = matcher.match('test.tsx', pattern);
      expect(result1.matched).toBe(true);

      // Second match - should use cache
      const result2 = matcher.match('other.tsx', pattern);
      expect(result2.matched).toBe(true);

      const stats = matcher.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.patterns).toContain(pattern);
    });

    it('should respect cache option', () => {
      const noCacheMatcher = new PatternMatcher({ cache: false });

      noCacheMatcher.match('test.tsx', '*.tsx');
      noCacheMatcher.match('other.tsx', '*.tsx');

      const stats = noCacheMatcher.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should clear cache', () => {
      matcher.match('test.tsx', '*.tsx');
      expect(matcher.getCacheStats().size).toBe(1);

      matcher.clearCache();
      expect(matcher.getCacheStats().size).toBe(0);
    });

    it('should generate different cache keys for different options', () => {
      matcher.match('test.tsx', '*.tsx', { caseSensitive: true });
      matcher.match('test.tsx', '*.tsx', { caseSensitive: false });

      const stats = matcher.getCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty patterns', () => {
      const result = matcher.match('test.js', '');
      expect(result.matched).toBe(false);
    });

    it('should handle empty file paths', () => {
      const result = matcher.match('', '*.js');
      expect(result.matched).toBe(false);
    });

    it('should handle invalid patterns gracefully', () => {
      const result = matcher.match('test.js', '[');
      expect(result.matched).toBe(false);
      expect(result.matchTime).toBeGreaterThan(0);
    });

    it('should handle special characters in file paths', () => {
      expect(matcher.match('file with spaces.js', '*.js').matched).toBe(true);
      expect(matcher.match('file-with-dashes.js', '*-with-*.js').matched).toBe(true);
      expect(matcher.match('file_with_underscores.js', '*_with_*.js').matched).toBe(true);
    });

    it('should handle very long file paths', () => {
      const longPath = 'a/'.repeat(100) + 'file.js';
      const result = matcher.match(longPath, '**/file.js');
      expect(result.matched).toBe(true);
    });
  });

  describe('Static Methods', () => {
    it('should validate patterns', () => {
      expect(PatternMatcher.isValidPattern('*.js')).toBe(true);
      expect(PatternMatcher.isValidPattern('**/*.tsx')).toBe(true);
      expect(PatternMatcher.isValidPattern('src/{js,ts}/**/*')).toBe(true);
      expect(PatternMatcher.isValidPattern('[')).toBe(false);
    });

    it('should escape special characters', () => {
      expect(PatternMatcher.escape('file[1].js')).toBe('file\\[1\\].js');
      expect(PatternMatcher.escape('file*.js')).toBe('file\\*.js');
      expect(PatternMatcher.escape('file?.js')).toBe('file\\?.js');
      expect(PatternMatcher.escape('file{a,b}.js')).toBe('file\\{a,b\\}.js');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should compile patterns quickly', () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        matcher.match('test.js', `pattern${i}*.js`);
      }

      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / 100;

      // Target: <1ms pattern compilation
      expect(avgTime).toBeLessThan(1);
    });

    it('should match patterns quickly', () => {
      const pattern = 'src/**/*.{tsx,ts,js}';
      const testFiles = Array.from({ length: 1000 }, (_, i) => `src/component${i}.tsx`);

      const startTime = performance.now();

      testFiles.forEach(file => {
        matcher.match(file, pattern);
      });

      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / 1000;

      // Target: <10ms per operation
      expect(avgTime).toBeLessThan(10);
    });

    it('should benefit from caching', () => {
      const pattern = 'src/**/*.tsx';
      const testFile = 'src/components/Button.tsx';

      // First run - compile and cache
      const startTime1 = performance.now();
      matcher.match(testFile, pattern);
      const firstRunTime = performance.now() - startTime1;

      // Second run - use cache
      const startTime2 = performance.now();
      matcher.match(testFile, pattern);
      const secondRunTime = performance.now() - startTime2;

      // Cached run should be faster
      expect(secondRunTime).toBeLessThan(firstRunTime);
    });

    it('should handle large numbers of patterns efficiently', () => {
      const patterns = Array.from({ length: 100 }, (_, i) => `**/*.${i}.js`);
      const testFile = 'src/test.50.js';

      const startTime = performance.now();
      const hasMatch = matcher.matchesAny(testFile, patterns);
      const totalTime = performance.now() - startTime;

      expect(hasMatch).toBe(true);
      expect(totalTime).toBeLessThan(100); // Should complete in <100ms
    });
  });

  describe('Real-world Patterns', () => {
    const realWorldFiles = [
      'src/components/Button/Button.tsx',
      'src/components/Button/Button.test.tsx',
      'src/components/Button/Button.stories.tsx',
      'src/components/Button/index.ts',
      'src/utils/helpers.ts',
      'src/utils/helpers.test.ts',
      'src/types/index.ts',
      'src/hooks/useAuth.ts',
      'src/hooks/useAuth.test.ts',
      'tests/e2e/login.spec.ts',
      'tests/unit/utils.test.ts',
      'docs/README.md',
      'package.json',
      '.env',
      '.gitignore',
      'node_modules/react/index.js'
    ];

    it('should match TypeScript files', () => {
      const result = matcher.filter(realWorldFiles, '**/*.{ts,tsx}');
      expect(result).toHaveLength(9);
      expect(result).toContain('src/components/Button/Button.tsx');
      expect(result).toContain('src/types/index.ts');
    });

    it('should exclude test files', () => {
      const includePatterns = ['src/**/*.{ts,tsx}'];
      const excludePatterns = ['**/*.test.*', '**/*.spec.*', '**/*.stories.*'];
      const result = matcher.filterWithExclusions(realWorldFiles, includePatterns, excludePatterns);

      expect(result).toEqual([
        'src/components/Button/Button.tsx',
        'src/components/Button/index.ts',
        'src/utils/helpers.ts',
        'src/types/index.ts',
        'src/hooks/useAuth.ts'
      ]);
    });

    it('should match backend API files', () => {
      const backendFiles = [
        'backend/src/routes/auth.ts',
        'backend/src/controllers/userController.ts',
        'backend/src/models/User.ts',
        'backend/src/middleware/auth.ts',
        'backend/tests/auth.test.ts'
      ];

      const pattern = 'backend/src/**/*.ts';
      const excludePattern = '**/*.test.*';

      const result = matcher.filterWithExclusions(backendFiles, [pattern], [excludePattern]);
      expect(result).toHaveLength(4);
      expect(result).not.toContain('backend/tests/auth.test.ts');
    });
  });
});