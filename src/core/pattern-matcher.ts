/**
 * PatternMatcher - High-performance glob pattern matching with caching
 *
 * Supports common glob patterns: **, *, ?, [], {}
 * Includes pattern compilation caching for performance
 * Target: <10ms per operation, <1ms pattern compilation
 */

import { minimatch } from 'minimatch';

export interface PatternMatcherOptions {
  caseSensitive?: boolean;
  dot?: boolean;
  ignore?: string[];
  cache?: boolean;
}

export interface PatternMatchResult {
  matched: boolean;
  pattern: string;
  filePath: string;
  matchTime: number;
}

export interface CompiledPattern {
  pattern: string;
  matcher: (path: string) => boolean;
  compiledAt: number;
  options: PatternMatcherOptions;
}

/**
 * PatternMatcher provides high-performance glob pattern matching with intelligent caching
 */
export class PatternMatcher {
  private patternCache = new Map<string, CompiledPattern>();
  private readonly defaultOptions: PatternMatcherOptions = {
    caseSensitive: false,
    dot: false,
    ignore: [],
    cache: true
  };

  constructor(private options: PatternMatcherOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Match a single file path against a pattern
   * @param filePath - The file path to test
   * @param pattern - The glob pattern to match against
   * @param options - Optional override options
   * @returns PatternMatchResult with timing information
   */
  match(filePath: string, pattern: string, options?: PatternMatcherOptions): PatternMatchResult {
    const startTime = performance.now();
    const effectiveOptions = { ...this.options, ...options };

    try {
      const compiledPattern = this.getCompiledPattern(pattern, effectiveOptions);
      const matched = compiledPattern.matcher(filePath);
      const matchTime = performance.now() - startTime;

      return {
        matched,
        pattern,
        filePath,
        matchTime
      };
    } catch (error) {
      const matchTime = performance.now() - startTime;
      return {
        matched: false,
        pattern,
        filePath,
        matchTime
      };
    }
  }

  /**
   * Match a file path against multiple patterns
   * @param filePath - The file path to test
   * @param patterns - Array of glob patterns
   * @param options - Optional override options
   * @returns Array of PatternMatchResult, one for each pattern
   */
  matchMultiple(filePath: string, patterns: string[], options?: PatternMatcherOptions): PatternMatchResult[] {
    return patterns.map(pattern => this.match(filePath, pattern, options));
  }

  /**
   * Check if a file path matches any of the provided patterns
   * @param filePath - The file path to test
   * @param patterns - Array of glob patterns
   * @param options - Optional override options
   * @returns True if any pattern matches
   */
  matchesAny(filePath: string, patterns: string[], options?: PatternMatcherOptions): boolean {
    for (const pattern of patterns) {
      if (this.match(filePath, pattern, options).matched) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a file path matches all of the provided patterns
   * @param filePath - The file path to test
   * @param patterns - Array of glob patterns
   * @param options - Optional override options
   * @returns True if all patterns match
   */
  matchesAll(filePath: string, patterns: string[], options?: PatternMatcherOptions): boolean {
    for (const pattern of patterns) {
      if (!this.match(filePath, pattern, options).matched) {
        return false;
      }
    }
    return true;
  }

  /**
   * Filter an array of file paths using a pattern
   * @param filePaths - Array of file paths to filter
   * @param pattern - Glob pattern to match against
   * @param options - Optional override options
   * @returns Array of matching file paths
   */
  filter(filePaths: string[], pattern: string, options?: PatternMatcherOptions): string[] {
    const compiledPattern = this.getCompiledPattern(pattern, { ...this.options, ...options });
    return filePaths.filter(filePath => compiledPattern.matcher(filePath));
  }

  /**
   * Filter an array of file paths using multiple patterns (OR logic)
   * @param filePaths - Array of file paths to filter
   * @param patterns - Array of glob patterns
   * @param options - Optional override options
   * @returns Array of file paths that match any pattern
   */
  filterAny(filePaths: string[], patterns: string[], options?: PatternMatcherOptions): string[] {
    return filePaths.filter(filePath => this.matchesAny(filePath, patterns, options));
  }

  /**
   * Apply exclusion patterns to filter out unwanted matches
   * @param filePaths - Array of file paths
   * @param includePatterns - Patterns to include
   * @param excludePatterns - Patterns to exclude
   * @param options - Optional override options
   * @returns Filtered array of file paths
   */
  filterWithExclusions(
    filePaths: string[],
    includePatterns: string[],
    excludePatterns: string[] = [],
    options?: PatternMatcherOptions
  ): string[] {
    // First apply include patterns
    const included = includePatterns.length > 0
      ? this.filterAny(filePaths, includePatterns, options)
      : filePaths;

    // Then apply exclude patterns
    if (excludePatterns.length === 0) {
      return included;
    }

    return included.filter(filePath => !this.matchesAny(filePath, excludePatterns, options));
  }

  /**
   * Get or create a compiled pattern with caching
   * @param pattern - The glob pattern to compile
   * @param options - Pattern matching options
   * @returns Compiled pattern with matcher function
   */
  private getCompiledPattern(pattern: string, options: PatternMatcherOptions): CompiledPattern {
    const cacheKey = this.getCacheKey(pattern, options);

    if (options.cache !== false && this.patternCache.has(cacheKey)) {
      return this.patternCache.get(cacheKey)!;
    }

    const compiledPattern = this.compilePattern(pattern, options);

    if (options.cache !== false) {
      this.patternCache.set(cacheKey, compiledPattern);
    }

    return compiledPattern;
  }

  /**
   * Compile a glob pattern into a matcher function
   * @param pattern - The glob pattern to compile
   * @param options - Pattern matching options
   * @returns Compiled pattern object
   */
  private compilePattern(pattern: string, options: PatternMatcherOptions): CompiledPattern {
    const minimatchOptions = {
      nocase: !options.caseSensitive,
      dot: options.dot || false,
      matchBase: false,
      nobrace: false,
      noext: false,
      noglobstar: false,
      nonegate: false
    };

    // Create the matcher function
    const matcher = (filePath: string): boolean => {
      return minimatch(filePath, pattern, minimatchOptions);
    };

    return {
      pattern,
      matcher,
      compiledAt: Date.now(),
      options
    };
  }

  /**
   * Generate a cache key for pattern and options combination
   * @param pattern - The glob pattern
   * @param options - Pattern matching options
   * @returns Cache key string
   */
  private getCacheKey(pattern: string, options: PatternMatcherOptions): string {
    const optionsKey = JSON.stringify({
      caseSensitive: options.caseSensitive,
      dot: options.dot,
      ignore: options.ignore?.sort() // Sort for consistent key
    });
    return `${pattern}:${optionsKey}`;
  }

  /**
   * Clear the pattern cache
   */
  clearCache(): void {
    this.patternCache.clear();
  }

  /**
   * Get cache statistics
   * @returns Object with cache size and hit information
   */
  getCacheStats(): { size: number; patterns: string[] } {
    return {
      size: this.patternCache.size,
      patterns: Array.from(this.patternCache.keys()).map(key => key.split(':')[0])
    };
  }

  /**
   * Validate a glob pattern
   * @param pattern - The pattern to validate
   * @returns True if pattern is valid
   */
  static isValidPattern(pattern: string): boolean {
    try {
      minimatch('test', pattern);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Escape special glob characters in a string
   * @param str - String to escape
   * @returns Escaped string safe for use as literal pattern
   */
  static escape(str: string): string {
    return str.replace(/[*?[\]{}()!]/g, '\\$&');
  }
}

export default PatternMatcher;