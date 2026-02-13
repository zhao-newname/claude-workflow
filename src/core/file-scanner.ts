/**
 * FileScanner - High-performance directory traversal with .gitignore support
 *
 * Features:
 * - Recursive directory scanning
 * - .gitignore pattern support
 * - Include/exclude pattern combinations
 * - Symbolic link handling
 * - Performance optimization with batching
 */

import { promises as fs } from 'fs';
import { join, relative, resolve, sep } from 'path';
import ignore from 'ignore';
import { PatternMatcher } from './pattern-matcher';

export interface FileScannerOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  respectGitignore?: boolean;
  followSymlinks?: boolean;
  maxDepth?: number;
  batchSize?: number;
  caseSensitive?: boolean;
}

export interface ScanResult {
  files: string[];
  directories: string[];
  scanTime: number;
  filesScanned: number;
  directoriesScanned: number;
}

export interface FileInfo {
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  mtime?: Date;
}

/**
 * FileScanner provides high-performance directory traversal with pattern matching
 */
export class FileScanner {
  private patternMatcher: PatternMatcher;
  private ignoreFilter?: ReturnType<typeof ignore>;
  private readonly defaultOptions: FileScannerOptions = {
    includePatterns: [],
    excludePatterns: [],
    respectGitignore: true,
    followSymlinks: false,
    maxDepth: 50,
    batchSize: 100,
    caseSensitive: false
  };

  constructor(private options: FileScannerOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
    this.patternMatcher = new PatternMatcher({
      caseSensitive: this.options.caseSensitive
    });
  }

  /**
   * Scan a directory and return matching files
   * @param rootPath - Root directory to scan
   * @param options - Optional override options
   * @returns ScanResult with matched files and statistics
   */
  async scan(rootPath: string, options?: FileScannerOptions): Promise<ScanResult> {
    const startTime = performance.now();
    const effectiveOptions = { ...this.options, ...options };
    const resolvedRoot = resolve(rootPath);

    // Initialize .gitignore filter if needed
    if (effectiveOptions.respectGitignore) {
      await this.initializeGitignoreFilter(resolvedRoot);
    }

    const files: string[] = [];
    const directories: string[] = [];
    let filesScanned = 0;
    let directoriesScanned = 0;

    try {
      await this.scanDirectory(
        resolvedRoot,
        resolvedRoot,
        files,
        directories,
        effectiveOptions,
        0,
        { filesScanned: () => filesScanned++, directoriesScanned: () => directoriesScanned++ }
      );
    } catch (error) {
      // Handle permission errors gracefully
      if ((error as NodeJS.ErrnoException).code !== 'EACCES') {
        throw error;
      }
    }

    const scanTime = performance.now() - startTime;

    return {
      files: this.applyPatternFilters(files, resolvedRoot, effectiveOptions),
      directories,
      scanTime,
      filesScanned,
      directoriesScanned
    };
  }

  /**
   * Scan for files matching specific patterns
   * @param rootPath - Root directory to scan
   * @param patterns - Glob patterns to match
   * @param options - Optional override options
   * @returns Array of matching file paths
   */
  async findFiles(rootPath: string, patterns: string[], options?: FileScannerOptions): Promise<string[]> {
    const scanOptions = {
      ...options,
      includePatterns: patterns
    };

    const result = await this.scan(rootPath, scanOptions);
    return result.files;
  }

  /**
   * Check if a file exists and matches patterns
   * @param filePath - File path to check
   * @param patterns - Patterns to match against
   * @returns True if file exists and matches
   */
  async fileMatches(filePath: string, patterns: string[]): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return false;
      }

      return this.patternMatcher.matchesAny(filePath, patterns);
    } catch {
      return false;
    }
  }

  /**
   * Get detailed file information
   * @param filePath - Path to the file
   * @param rootPath - Root path for relative path calculation
   * @returns FileInfo object with details
   */
  async getFileInfo(filePath: string, rootPath: string): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      const relativePath = relative(rootPath, filePath);

      return {
        path: filePath,
        relativePath,
        isDirectory: stats.isDirectory(),
        size: stats.isFile() ? stats.size : undefined,
        mtime: stats.mtime
      };
    } catch {
      return null;
    }
  }

  /**
   * Recursively scan a directory
   * @private
   */
  private async scanDirectory(
    currentPath: string,
    rootPath: string,
    files: string[],
    directories: string[],
    options: FileScannerOptions,
    depth: number,
    counters: { filesScanned: () => void; directoriesScanned: () => void }
  ): Promise<void> {
    if (depth > (options.maxDepth || 50)) {
      return;
    }

    let entries: string[];
    try {
      entries = await fs.readdir(currentPath);
    } catch (error) {
      // Skip directories we can't read
      return;
    }

    // Process entries in batches for better performance
    const batchSize = options.batchSize || 100;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (entry) => {
          const fullPath = join(currentPath, entry);
          const relativePath = relative(rootPath, fullPath);

          // Skip if ignored by .gitignore
          if (this.ignoreFilter && this.ignoreFilter.ignores(relativePath)) {
            return;
          }

          try {
            const stats = await fs.lstat(fullPath);

            if (stats.isSymbolicLink() && !options.followSymlinks) {
              return;
            }

            if (stats.isDirectory()) {
              directories.push(fullPath);
              counters.directoriesScanned();

              // Recursively scan subdirectory
              await this.scanDirectory(
                fullPath,
                rootPath,
                files,
                directories,
                options,
                depth + 1,
                counters
              );
            } else if (stats.isFile()) {
              files.push(fullPath);
              counters.filesScanned();
            }
          } catch {
            // Skip files/directories we can't access
          }
        })
      );
    }
  }

  /**
   * Initialize .gitignore filter
   * @private
   */
  private async initializeGitignoreFilter(rootPath: string): Promise<void> {
    const gitignorePath = join(rootPath, '.gitignore');

    try {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      this.ignoreFilter = ignore().add(gitignoreContent);
    } catch {
      // No .gitignore file or can't read it
      this.ignoreFilter = ignore();
    }

    // Add common ignore patterns
    this.ignoreFilter.add([
      'node_modules',
      '.git',
      '.DS_Store',
      'Thumbs.db',
      '*.tmp',
      '*.temp'
    ]);
  }

  /**
   * Apply include/exclude pattern filters
   * @private
   */
  private applyPatternFilters(
    files: string[],
    rootPath: string,
    options: FileScannerOptions
  ): string[] {
    const { includePatterns = [], excludePatterns = [] } = options;

    // Convert absolute paths to relative for pattern matching
    const relativeFiles = files.map(file => relative(rootPath, file));

    return this.patternMatcher.filterWithExclusions(
      relativeFiles,
      includePatterns,
      excludePatterns
    ).map(relativePath => join(rootPath, relativePath));
  }

  /**
   * Clear internal caches
   */
  clearCache(): void {
    this.patternMatcher.clearCache();
    this.ignoreFilter = undefined;
  }

  /**
   * Get scanner statistics
   */
  getStats(): { cacheSize: number; ignoreRules: number } {
    return {
      cacheSize: this.patternMatcher.getCacheStats().size,
      ignoreRules: this.ignoreFilter ? this.ignoreFilter.filter([]).length : 0
    };
  }

  /**
   * Create a FileScanner with common web development patterns
   */
  static forWebDevelopment(options: Partial<FileScannerOptions> = {}): FileScanner {
    return new FileScanner({
      includePatterns: [
        '**/*.{js,jsx,ts,tsx,vue,svelte}',
        '**/*.{css,scss,sass,less}',
        '**/*.{html,htm,md,mdx}',
        '**/*.{json,yaml,yml,toml}'
      ],
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.next/**',
        '.nuxt/**',
        'coverage/**',
        '**/*.test.*',
        '**/*.spec.*'
      ],
      ...options
    });
  }

  /**
   * Create a FileScanner for TypeScript projects
   */
  static forTypeScript(options: Partial<FileScannerOptions> = {}): FileScanner {
    return new FileScanner({
      includePatterns: [
        '**/*.{ts,tsx}',
        '**/*.d.ts'
      ],
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '**/*.test.*',
        '**/*.spec.*'
      ],
      ...options
    });
  }

  /**
   * Create a FileScanner for backend development
   */
  static forBackend(options: Partial<FileScannerOptions> = {}): FileScanner {
    return new FileScanner({
      includePatterns: [
        '**/*.{js,ts}',
        '**/*.{json,yaml,yml}',
        '**/*.sql',
        '**/Dockerfile*',
        '**/*.env*'
      ],
      excludePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        'logs/**',
        'tmp/**',
        '**/*.test.*',
        '**/*.spec.*'
      ],
      ...options
    });
  }
}

export default FileScanner;