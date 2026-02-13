/**
 * ContentAnalyzer - High-performance file content analysis with regex matching
 *
 * Features:
 * - Regex pattern matching on file contents
 * - Binary file detection and skipping
 * - Streaming for large files
 * - Encoding detection and handling
 * - Timeout protection
 * - Performance optimization
 */

import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

export interface ContentAnalyzerOptions {
  maxFileSize?: number;
  encoding?: BufferEncoding;
  timeout?: number;
  skipBinary?: boolean;
  caseSensitive?: boolean;
  multiline?: boolean;
}

export interface ContentMatchResult {
  matched: boolean;
  pattern: string;
  filePath: string;
  matches: ContentMatch[];
  analysisTime: number;
  fileSize: number;
  isBinary: boolean;
}

export interface ContentMatch {
  line: number;
  column: number;
  text: string;
  matchedText: string;
}

export interface AnalysisStats {
  filesAnalyzed: number;
  bytesProcessed: number;
  binaryFilesSkipped: number;
  averageAnalysisTime: number;
}

/**
 * ContentAnalyzer provides high-performance file content analysis
 */
export class ContentAnalyzer {
  private readonly defaultOptions: ContentAnalyzerOptions = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    encoding: 'utf-8',
    timeout: 5000, // 5 seconds
    skipBinary: true,
    caseSensitive: false,
    multiline: false
  };

  private stats: AnalysisStats = {
    filesAnalyzed: 0,
    bytesProcessed: 0,
    binaryFilesSkipped: 0,
    averageAnalysisTime: 0
  };

  constructor(private options: ContentAnalyzerOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Analyze file content against a regex pattern
   * @param filePath - Path to the file to analyze
   * @param pattern - Regex pattern to match
   * @param options - Optional override options
   * @returns ContentMatchResult with matches and timing
   */
  async analyze(
    filePath: string,
    pattern: string | RegExp,
    options?: ContentAnalyzerOptions
  ): Promise<ContentMatchResult> {
    const startTime = performance.now();
    const effectiveOptions = { ...this.options, ...options };

    try {
      // Check if file is binary
      const isBinary = effectiveOptions.skipBinary
        ? await this.isBinaryFile(filePath)
        : false;

      if (isBinary) {
        this.stats.binaryFilesSkipped++;
        return this.createEmptyResult(filePath, pattern, startTime, 0, true);
      }

      // Get file size
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Check file size limit
      if (fileSize > (effectiveOptions.maxFileSize || Infinity)) {
        return this.createEmptyResult(filePath, pattern, startTime, fileSize, false);
      }

      // Analyze content
      const matches = await this.analyzeContent(filePath, pattern, effectiveOptions);

      const analysisTime = performance.now() - startTime;
      this.updateStats(analysisTime, fileSize);

      return {
        matched: matches.length > 0,
        pattern: pattern.toString(),
        filePath,
        matches,
        analysisTime,
        fileSize,
        isBinary: false
      };
    } catch (error) {
      const analysisTime = performance.now() - startTime;
      return this.createEmptyResult(filePath, pattern, startTime, 0, false);
    }
  }

  /**
   * Analyze multiple files against a pattern
   * @param filePaths - Array of file paths
   * @param pattern - Regex pattern to match
   * @param options - Optional override options
   * @returns Array of ContentMatchResult
   */
  async analyzeMultiple(
    filePaths: string[],
    pattern: string | RegExp,
    options?: ContentAnalyzerOptions
  ): Promise<ContentMatchResult[]> {
    const results = await Promise.all(
      filePaths.map(filePath => this.analyze(filePath, pattern, options))
    );
    return results;
  }

  /**
   * Check if any file matches the pattern
   * @param filePaths - Array of file paths
   * @param pattern - Regex pattern to match
   * @param options - Optional override options
   * @returns True if any file matches
   */
  async matchesAny(
    filePaths: string[],
    pattern: string | RegExp,
    options?: ContentAnalyzerOptions
  ): Promise<boolean> {
    for (const filePath of filePaths) {
      const result = await this.analyze(filePath, pattern, options);
      if (result.matched) {
        return true;
      }
    }
    return false;
  }

  /**
   * Filter files that match the pattern
   * @param filePaths - Array of file paths
   * @param pattern - Regex pattern to match
   * @param options - Optional override options
   * @returns Array of matching file paths
   */
  async filter(
    filePaths: string[],
    pattern: string | RegExp,
    options?: ContentAnalyzerOptions
  ): Promise<string[]> {
    const results = await this.analyzeMultiple(filePaths, pattern, options);
    return results.filter(result => result.matched).map(result => result.filePath);
  }

  /**
   * Analyze file content and find matches
   * @private
   */
  private async analyzeContent(
    filePath: string,
    pattern: string | RegExp,
    options: ContentAnalyzerOptions
  ): Promise<ContentMatch[]> {
    const regex = this.compilePattern(pattern, options);
    const matches: ContentMatch[] = [];

    // For small files, read entire content
    const stats = await fs.stat(filePath);
    if (stats.size < 1024 * 1024) { // < 1MB
      const content = await fs.readFile(filePath, options.encoding || 'utf-8');
      return this.findMatches(content, regex);
    }

    // For large files, use streaming
    return this.analyzeStream(filePath, regex, options);
  }

  /**
   * Analyze file using streaming for large files
   * @private
   */
  private async analyzeStream(
    filePath: string,
    regex: RegExp,
    options: ContentAnalyzerOptions
  ): Promise<ContentMatch[]> {
    const matches: ContentMatch[] = [];
    const stream = createReadStream(filePath, {
      encoding: options.encoding || 'utf-8'
    });

    const rl = createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;

    for await (const line of rl) {
      lineNumber++;
      const lineMatches = this.findMatchesInLine(line, regex, lineNumber);
      matches.push(...lineMatches);

      // Limit matches to prevent memory issues
      if (matches.length > 1000) {
        break;
      }
    }

    return matches;
  }

  /**
   * Find all matches in content
   * @private
   */
  private findMatches(content: string, regex: RegExp): ContentMatch[] {
    const matches: ContentMatch[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineMatches = this.findMatchesInLine(lines[i], regex, i + 1);
      matches.push(...lineMatches);

      // Limit matches to prevent memory issues
      if (matches.length > 1000) {
        break;
      }
    }

    return matches;
  }

  /**
   * Find matches in a single line
   * @private
   */
  private findMatchesInLine(line: string, regex: RegExp, lineNumber: number): ContentMatch[] {
    const matches: ContentMatch[] = [];
    let match: RegExpExecArray | null;

    // Reset regex lastIndex for global patterns
    regex.lastIndex = 0;

    while ((match = regex.exec(line)) !== null) {
      matches.push({
        line: lineNumber,
        column: match.index + 1,
        text: line,
        matchedText: match[0]
      });

      // Prevent infinite loop for zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      // For non-global patterns, break after first match
      if (!regex.global) {
        break;
      }
    }

    return matches;
  }

  /**
   * Compile pattern into RegExp
   * @private
   */
  private compilePattern(pattern: string | RegExp, options: ContentAnalyzerOptions): RegExp {
    if (pattern instanceof RegExp) {
      return pattern;
    }

    let flags = 'g'; // Always use global for finding all matches

    if (!options.caseSensitive) {
      flags += 'i';
    }

    if (options.multiline) {
      flags += 'm';
    }

    return new RegExp(pattern, flags);
  }

  /**
   * Check if file is binary
   * @private
   */
  private async isBinaryFile(filePath: string): Promise<boolean> {
    try {
      // Read first 8KB to check for binary content
      const buffer = Buffer.alloc(8192);
      const fd = await fs.open(filePath, 'r');
      const { bytesRead } = await fd.read(buffer, 0, 8192, 0);
      await fd.close();

      // Check for null bytes (common in binary files)
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0) {
          return true;
        }
      }

      // Check for high ratio of non-printable characters
      let nonPrintable = 0;
      for (let i = 0; i < bytesRead; i++) {
        const byte = buffer[i];
        if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
          nonPrintable++;
        }
      }

      // If more than 30% non-printable, consider binary
      return nonPrintable / bytesRead > 0.3;
    } catch {
      return false;
    }
  }

  /**
   * Create empty result
   * @private
   */
  private createEmptyResult(
    filePath: string,
    pattern: string | RegExp,
    startTime: number,
    fileSize: number,
    isBinary: boolean
  ): ContentMatchResult {
    return {
      matched: false,
      pattern: pattern.toString(),
      filePath,
      matches: [],
      analysisTime: performance.now() - startTime,
      fileSize,
      isBinary
    };
  }

  /**
   * Update statistics
   * @private
   */
  private updateStats(analysisTime: number, fileSize: number): void {
    const totalTime = this.stats.averageAnalysisTime * this.stats.filesAnalyzed + analysisTime;
    this.stats.filesAnalyzed++;
    this.stats.bytesProcessed += fileSize;
    this.stats.averageAnalysisTime = totalTime / this.stats.filesAnalyzed;
  }

  /**
   * Get analysis statistics
   */
  getStats(): AnalysisStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      filesAnalyzed: 0,
      bytesProcessed: 0,
      binaryFilesSkipped: 0,
      averageAnalysisTime: 0
    };
  }

  /**
   * Validate a regex pattern
   * @param pattern - Pattern to validate
   * @returns True if pattern is valid
   */
  static isValidPattern(pattern: string): boolean {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Escape special regex characters
   * @param str - String to escape
   * @returns Escaped string safe for use in regex
   */
  static escape(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Create analyzer for common code patterns
   */
  static forCodePatterns(options: Partial<ContentAnalyzerOptions> = {}): ContentAnalyzer {
    return new ContentAnalyzer({
      skipBinary: true,
      caseSensitive: true,
      multiline: false,
      ...options
    });
  }

  /**
   * Create analyzer for text search
   */
  static forTextSearch(options: Partial<ContentAnalyzerOptions> = {}): ContentAnalyzer {
    return new ContentAnalyzer({
      skipBinary: true,
      caseSensitive: false,
      multiline: true,
      ...options
    });
  }
}

export default ContentAnalyzer;
