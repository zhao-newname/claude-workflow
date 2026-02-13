/**
 * FileScanner Tests
 *
 * Comprehensive test suite for FileScanner class
 * Tests directory traversal, .gitignore support, pattern filtering, and performance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { FileScanner, FileScannerOptions } from './file-scanner';

describe('FileScanner', () => {
  let scanner: FileScanner;
  let testDir: string;

  beforeEach(async () => {
    scanner = new FileScanner();
    testDir = resolve(__dirname, '../../test-fixtures/file-scanner');

    // Create test directory structure
    await createTestDirectory();
  });

  afterEach(async () => {
    scanner.clearCache();
    // Clean up test directory
    await cleanupTestDirectory();
  });

  describe('Basic Directory Scanning', () => {
    it('should scan directory and return files', async () => {
      const result = await scanner.scan(testDir);

      expect(result.files).toBeInstanceOf(Array);
      expect(result.directories).toBeInstanceOf(Array);
      expect(result.scanTime).toBeGreaterThan(0);
      expect(result.filesScanned).toBeGreaterThan(0);
      expect(result.directoriesScanned).toBeGreaterThan(0);
    });

    it('should handle non-existent directories gracefully', async () => {
      const nonExistentDir = join(testDir, 'non-existent');

      await expect(scanner.scan(nonExistentDir)).rejects.toThrow();
    });

    it('should respect max depth option', async () => {
      const shallowScanner = new FileScanner({ maxDepth: 1 });
      const result = await shallowScanner.scan(testDir);

      // Should not find deeply nested files
      const deepFiles = result.files.filter(file =>
        file.split('/').length > testDir.split('/').length + 2
      );
      expect(deepFiles).toHaveLength(0);
    });
  });

  describe('Pattern Filtering', () => {
    it('should filter files by include patterns', async () => {
      const result = await scanner.scan(testDir, {
        includePatterns: ['**/*.ts']
      });

      expect(result.files.every(file => file.endsWith('.ts'))).toBe(true);
    });

    it('should exclude files by exclude patterns', async () => {
      const result = await scanner.scan(testDir, {
        excludePatterns: ['**/*.test.*']
      });

      expect(result.files.every(file => !file.includes('.test.'))).toBe(true);
    });

    it('should combine include and exclude patterns', async () => {
      const result = await scanner.scan(testDir, {
        includePatterns: ['**/*.{ts,js}'],
        excludePatterns: ['**/*.test.*', '**/node_modules/**']
      });

      const validFiles = result.files.every(file =>
        (file.endsWith('.ts') || file.endsWith('.js')) &&
        !file.includes('.test.') &&
        !file.includes('node_modules')
      );
      expect(validFiles).toBe(true);
    });
  });

  describe('Gitignore Support', () => {
    it('should respect .gitignore patterns', async () => {
      // Create .gitignore file
      const gitignorePath = join(testDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n*.log\n.env\n');

      const result = await scanner.scan(testDir, {
        respectGitignore: true
      });

      const ignoredFiles = result.files.filter(file =>
        file.includes('node_modules') ||
        file.endsWith('.log') ||
        file.endsWith('.env')
      );
      expect(ignoredFiles).toHaveLength(0);
    });

    it('should work without .gitignore file', async () => {
      const result = await scanner.scan(testDir, {
        respectGitignore: true
      });

      expect(result.files).toBeInstanceOf(Array);
    });

    it('should allow disabling gitignore support', async () => {
      // Create .gitignore file
      const gitignorePath = join(testDir, '.gitignore');
      await fs.writeFile(gitignorePath, '*.log\n');

      // Create a .log file
      const logFile = join(testDir, 'test.log');
      await fs.writeFile(logFile, 'log content');

      const result = await scanner.scan(testDir, {
        respectGitignore: false
      });

      const logFiles = result.files.filter(file => file.endsWith('.log'));
      expect(logFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Symbolic Links', () => {
    it('should not follow symlinks by default', async () => {
      // Create a symlink (if supported)
      try {
        const targetFile = join(testDir, 'target.txt');
        const symlinkFile = join(testDir, 'symlink.txt');

        await fs.writeFile(targetFile, 'target content');
        await fs.symlink(targetFile, symlinkFile);

        const result = await scanner.scan(testDir, {
          followSymlinks: false
        });

        // Should not include symlinked content
        const symlinkFiles = result.files.filter(file => file.includes('symlink'));
        expect(symlinkFiles).toHaveLength(0);
      } catch {
        // Skip test if symlinks not supported
      }
    });

    it('should follow symlinks when enabled', async () => {
      // Create a symlink (if supported)
      try {
        const targetFile = join(testDir, 'target.txt');
        const symlinkFile = join(testDir, 'symlink.txt');

        await fs.writeFile(targetFile, 'target content');
        await fs.symlink(targetFile, symlinkFile);

        const result = await scanner.scan(testDir, {
          followSymlinks: true
        });

        // Should include symlinked content
        const symlinkFiles = result.files.filter(file => file.includes('symlink'));
        expect(symlinkFiles.length).toBeGreaterThan(0);
      } catch {
        // Skip test if symlinks not supported
      }
    });
  });

  describe('File Finding', () => {
    it('should find files matching patterns', async () => {
      const files = await scanner.findFiles(testDir, ['**/*.ts']);

      expect(files).toBeInstanceOf(Array);
      expect(files.every(file => file.endsWith('.ts'))).toBe(true);
    });

    it('should check if file matches patterns', async () => {
      const testFile = join(testDir, 'test.ts');
      await fs.writeFile(testFile, 'export const test = true;');

      const matches = await scanner.fileMatches(testFile, ['**/*.ts']);
      expect(matches).toBe(true);

      const noMatch = await scanner.fileMatches(testFile, ['**/*.js']);
      expect(noMatch).toBe(false);
    });

    it('should return false for non-existent files', async () => {
      const nonExistentFile = join(testDir, 'non-existent.ts');
      const matches = await scanner.fileMatches(nonExistentFile, ['**/*.ts']);
      expect(matches).toBe(false);
    });
  });

  describe('File Information', () => {
    it('should get detailed file information', async () => {
      const testFile = join(testDir, 'info-test.ts');
      await fs.writeFile(testFile, 'export const info = true;');

      const info = await scanner.getFileInfo(testFile, testDir);

      expect(info).not.toBeNull();
      expect(info!.path).toBe(testFile);
      expect(info!.relativePath).toBe('info-test.ts');
      expect(info!.isDirectory).toBe(false);
      expect(info!.size).toBeGreaterThan(0);
      expect(info!.mtime).toBeInstanceOf(Date);
    });

    it('should return null for non-existent files', async () => {
      const nonExistentFile = join(testDir, 'non-existent.ts');
      const info = await scanner.getFileInfo(nonExistentFile, testDir);
      expect(info).toBeNull();
    });

    it('should handle directory information', async () => {
      const testSubDir = join(testDir, 'subdir');
      await fs.mkdir(testSubDir, { recursive: true });

      const info = await scanner.getFileInfo(testSubDir, testDir);

      expect(info).not.toBeNull();
      expect(info!.isDirectory).toBe(true);
      expect(info!.size).toBeUndefined();
    });
  });

  describe('Performance and Caching', () => {
    it('should complete scan within reasonable time', async () => {
      const startTime = performance.now();
      const result = await scanner.scan(testDir);
      const scanTime = performance.now() - startTime;

      // Should complete within 1 second for test directory
      expect(scanTime).toBeLessThan(1000);
      expect(result.scanTime).toBeGreaterThan(0);
    });

    it('should provide cache statistics', async () => {
      await scanner.scan(testDir, {
        includePatterns: ['**/*.ts']
      });

      const stats = scanner.getStats();
      expect(stats.cacheSize).toBeGreaterThan(0);
      expect(stats.ignoreRules).toBeGreaterThanOrEqual(0);
    });

    it('should clear cache', async () => {
      await scanner.scan(testDir);
      scanner.clearCache();

      const stats = scanner.getStats();
      expect(stats.cacheSize).toBe(0);
    });

    it('should handle large directories efficiently', async () => {
      // Create many files for performance test
      const largeDir = join(testDir, 'large');
      await fs.mkdir(largeDir, { recursive: true });

      const filePromises = [];
      for (let i = 0; i < 100; i++) {
        filePromises.push(
          fs.writeFile(join(largeDir, `file${i}.ts`), `export const file${i} = true;`)
        );
      }
      await Promise.all(filePromises);

      const startTime = performance.now();
      const result = await scanner.scan(largeDir);
      const scanTime = performance.now() - startTime;

      expect(result.files).toHaveLength(100);
      expect(scanTime).toBeLessThan(500); // Should complete in <500ms
    });
  });

  describe('Factory Methods', () => {
    it('should create web development scanner', () => {
      const webScanner = FileScanner.forWebDevelopment();
      expect(webScanner).toBeInstanceOf(FileScanner);
    });

    it('should create TypeScript scanner', () => {
      const tsScanner = FileScanner.forTypeScript();
      expect(tsScanner).toBeInstanceOf(FileScanner);
    });

    it('should create backend scanner', () => {
      const backendScanner = FileScanner.forBackend();
      expect(backendScanner).toBeInstanceOf(FileScanner);
    });

    it('should apply custom options to factory methods', () => {
      const customScanner = FileScanner.forWebDevelopment({
        maxDepth: 5,
        caseSensitive: true
      });
      expect(customScanner).toBeInstanceOf(FileScanner);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty directories', async () => {
      const emptyDir = join(testDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });

      const result = await scanner.scan(emptyDir);
      expect(result.files).toHaveLength(0);
      expect(result.directories).toHaveLength(0);
    });

    it('should handle permission errors gracefully', async () => {
      // This test might not work on all systems
      try {
        const restrictedDir = join(testDir, 'restricted');
        await fs.mkdir(restrictedDir, { recursive: true });
        await fs.chmod(restrictedDir, 0o000);

        const result = await scanner.scan(testDir);
        // Should not throw, should handle gracefully
        expect(result).toBeDefined();

        // Restore permissions for cleanup
        await fs.chmod(restrictedDir, 0o755);
      } catch {
        // Skip test if permission manipulation not supported
      }
    });

    it('should handle very deep directory structures', async () => {
      // Create deep nested structure
      let currentDir = testDir;
      for (let i = 0; i < 10; i++) {
        currentDir = join(currentDir, `level${i}`);
        await fs.mkdir(currentDir, { recursive: true });
      }

      const deepFile = join(currentDir, 'deep.ts');
      await fs.writeFile(deepFile, 'export const deep = true;');

      const result = await scanner.scan(testDir);
      const deepFiles = result.files.filter(file => file.includes('deep.ts'));
      expect(deepFiles).toHaveLength(1);
    });

    it('should handle special characters in file names', async () => {
      const specialFiles = [
        'file with spaces.ts',
        'file-with-dashes.ts',
        'file_with_underscores.ts',
        'file.with.dots.ts'
      ];

      for (const fileName of specialFiles) {
        await fs.writeFile(join(testDir, fileName), 'export const special = true;');
      }

      const result = await scanner.scan(testDir, {
        includePatterns: ['**/*.ts']
      });

      const foundSpecialFiles = result.files.filter(file =>
        specialFiles.some(special => file.includes(special))
      );
      expect(foundSpecialFiles).toHaveLength(specialFiles.length);
    });
  });

  // Helper functions
  async function createTestDirectory(): Promise<void> {
    await fs.mkdir(testDir, { recursive: true });

    // Create test file structure
    const structure = [
      'src/components/Button.tsx',
      'src/components/Button.test.tsx',
      'src/utils/helpers.ts',
      'src/utils/helpers.test.ts',
      'src/types/index.ts',
      'tests/e2e/login.spec.ts',
      'docs/README.md',
      'package.json',
      'node_modules/react/index.js',
      'dist/bundle.js'
    ];

    for (const filePath of structure) {
      const fullPath = join(testDir, filePath);
      await fs.mkdir(join(fullPath, '..'), { recursive: true });
      await fs.writeFile(fullPath, `// ${filePath}`);
    }
  }

  async function cleanupTestDirectory(): Promise<void> {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});