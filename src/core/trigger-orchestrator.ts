/**
 * TriggerOrchestrator - Coordinates pattern matching and content analysis for skill triggers
 *
 * Features:
 * - Evaluates both path patterns and content patterns
 * - Priority-based skill ordering
 * - Result caching for performance
 * - Detailed match information
 * - Graceful error handling
 */

import { PatternMatcher } from './pattern-matcher';
import { ContentAnalyzer } from './content-analyzer';
import { FileScanner } from './file-scanner';
import { AnalysisCache } from './analysis-cache';
import { Skill, SkillTriggers } from '../types';

export interface TriggerEvaluationOptions {
  useCache?: boolean;
  timeout?: number;
  maxConcurrent?: number;
}

export interface TriggerEvaluationResult {
  skill: Skill;
  matched: boolean;
  matchType: 'path' | 'content' | 'both' | 'none';
  matchedPatterns: {
    pathPatterns: string[];
    contentPatterns: string[];
  };
  evaluationTime: number;
  cached: boolean;
}

export interface TriggerEvaluationSummary {
  matchedSkills: Skill[];
  results: TriggerEvaluationResult[];
  totalTime: number;
  cacheHitRate: number;
}

/**
 * TriggerOrchestrator coordinates file trigger evaluation across multiple skills
 */
export class TriggerOrchestrator {
  private patternMatcher: PatternMatcher;
  private contentAnalyzer: ContentAnalyzer;
  private fileScanner: FileScanner;
  private cache: AnalysisCache<TriggerEvaluationResult>;

  private readonly defaultOptions: Required<TriggerEvaluationOptions> = {
    useCache: true,
    timeout: 5000,
    maxConcurrent: 10
  };

  constructor() {
    this.patternMatcher = new PatternMatcher();
    this.contentAnalyzer = ContentAnalyzer.forCodePatterns();
    this.fileScanner = new FileScanner();
    this.cache = AnalysisCache.forFileAnalysis();
  }

  /**
   * Evaluate a single file against a skill's triggers
   * @param filePath - Path to the file to evaluate
   * @param skill - Skill with trigger configuration
   * @param options - Optional evaluation options
   * @returns TriggerEvaluationResult with match details
   */
  async evaluateFile(
    filePath: string,
    skill: Skill,
    options?: TriggerEvaluationOptions
  ): Promise<TriggerEvaluationResult> {
    const startTime = performance.now();
    const effectiveOptions = { ...this.defaultOptions, ...options };

    // Check cache first
    if (effectiveOptions.useCache) {
      const cacheKey = this.getCacheKey(filePath, skill.metadata.name);
      const cached = await this.cache.get(cacheKey, filePath);
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    const triggers = skill.config.triggers?.fileTriggers;
    if (!triggers) {
      return this.createEmptyResult(skill, startTime, false);
    }

    try {
      // Evaluate path patterns
      const pathMatch = await this.evaluatePathPatterns(filePath, triggers);

      // Evaluate content patterns (only if path matches or no path patterns)
      let contentMatch = { matched: false, patterns: [] as string[] };
      if (pathMatch.matched || !triggers.pathPatterns?.length) {
        contentMatch = await this.evaluateContentPatterns(filePath, triggers);
      }

      // Determine match type
      const matchType = this.determineMatchType(pathMatch.matched, contentMatch.matched);
      const matched = matchType !== 'none';

      const result: TriggerEvaluationResult = {
        skill,
        matched,
        matchType,
        matchedPatterns: {
          pathPatterns: pathMatch.patterns,
          contentPatterns: contentMatch.patterns
        },
        evaluationTime: performance.now() - startTime,
        cached: false
      };

      // Cache the result
      if (effectiveOptions.useCache) {
        const cacheKey = this.getCacheKey(filePath, skill.metadata.name);
        await this.cache.set(cacheKey, result, filePath);
      }

      return result;
    } catch (error) {
      return this.createEmptyResult(skill, startTime, false);
    }
  }

  /**
   * Evaluate a file against multiple skills
   * @param filePath - Path to the file to evaluate
   * @param skills - Array of skills to evaluate
   * @param options - Optional evaluation options
   * @returns TriggerEvaluationSummary with all results
   */
  async evaluateFileAgainstSkills(
    filePath: string,
    skills: Skill[],
    options?: TriggerEvaluationOptions
  ): Promise<TriggerEvaluationSummary> {
    const startTime = performance.now();
    const effectiveOptions = { ...this.defaultOptions, ...options };

    // Evaluate skills in batches for concurrency control
    const batchSize = effectiveOptions.maxConcurrent;
    const results: TriggerEvaluationResult[] = [];

    for (let i = 0; i < skills.length; i += batchSize) {
      const batch = skills.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(skill => this.evaluateFile(filePath, skill, options))
      );
      results.push(...batchResults);
    }

    // Sort by priority and filter matched skills
    const matchedSkills = results
      .filter(r => r.matched)
      .sort((a, b) => this.comparePriority(a.skill, b.skill))
      .map(r => r.skill);

    const totalTime = performance.now() - startTime;
    const cachedCount = results.filter(r => r.cached).length;
    const cacheHitRate = results.length > 0 ? cachedCount / results.length : 0;

    return {
      matchedSkills,
      results,
      totalTime,
      cacheHitRate
    };
  }

  /**
   * Find all files in a directory that match any skill's triggers
   * @param rootPath - Root directory to scan
   * @param skills - Array of skills to evaluate
   * @param options - Optional evaluation options
   * @returns Map of file paths to matched skills
   */
  async findMatchingFiles(
    rootPath: string,
    skills: Skill[],
    options?: TriggerEvaluationOptions
  ): Promise<Map<string, Skill[]>> {
    // Collect all path patterns from skills
    const allPathPatterns = new Set<string>();
    for (const skill of skills) {
      const patterns = skill.config.triggers?.fileTriggers?.pathPatterns || [];
      patterns.forEach(p => allPathPatterns.add(p));
    }

    // Scan directory for matching files
    const scanResult = await this.fileScanner.scan(rootPath, {
      includePatterns: Array.from(allPathPatterns)
    });

    // Evaluate each file against all skills
    const fileSkillMap = new Map<string, Skill[]>();

    for (const filePath of scanResult.files) {
      const summary = await this.evaluateFileAgainstSkills(filePath, skills, options);
      if (summary.matchedSkills.length > 0) {
        fileSkillMap.set(filePath, summary.matchedSkills);
      }
    }

    return fileSkillMap;
  }

  /**
   * Evaluate path patterns
   * @private
   */
  private async evaluatePathPatterns(
    filePath: string,
    triggers: NonNullable<SkillTriggers['fileTriggers']>
  ): Promise<{ matched: boolean; patterns: string[] }> {
    const pathPatterns = triggers.pathPatterns || [];
    if (pathPatterns.length === 0) {
      return { matched: true, patterns: [] }; // No path patterns = match all
    }

    const matchedPatterns: string[] = [];

    for (const pattern of pathPatterns) {
      const result = this.patternMatcher.match(filePath, pattern);
      if (result.matched) {
        matchedPatterns.push(pattern);
      }
    }

    return {
      matched: matchedPatterns.length > 0,
      patterns: matchedPatterns
    };
  }

  /**
   * Evaluate content patterns
   * @private
   */
  private async evaluateContentPatterns(
    filePath: string,
    triggers: NonNullable<SkillTriggers['fileTriggers']>
  ): Promise<{ matched: boolean; patterns: string[] }> {
    const contentPatterns = triggers.contentPatterns || [];
    if (contentPatterns.length === 0) {
      return { matched: true, patterns: [] }; // No content patterns = match all
    }

    const matchedPatterns: string[] = [];

    for (const pattern of contentPatterns) {
      try {
        const result = await this.contentAnalyzer.analyze(filePath, pattern);
        if (result.matched) {
          matchedPatterns.push(pattern);
        }
      } catch {
        // Skip patterns that fail to evaluate
      }
    }

    return {
      matched: matchedPatterns.length > 0,
      patterns: matchedPatterns
    };
  }

  /**
   * Determine match type based on path and content matches
   * @private
   */
  private determineMatchType(
    pathMatched: boolean,
    contentMatched: boolean
  ): TriggerEvaluationResult['matchType'] {
    if (pathMatched && contentMatched) return 'both';
    if (pathMatched) return 'path';
    if (contentMatched) return 'content';
    return 'none';
  }

  /**
   * Compare skill priorities for sorting
   * @private
   */
  private comparePriority(skillA: Skill, skillB: Skill): number {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityA = priorityOrder[skillA.config.priority];
    const priorityB = priorityOrder[skillB.config.priority];
    return priorityA - priorityB;
  }

  /**
   * Create empty result
   * @private
   */
  private createEmptyResult(
    skill: Skill,
    startTime: number,
    cached: boolean
  ): TriggerEvaluationResult {
    return {
      skill,
      matched: false,
      matchType: 'none',
      matchedPatterns: {
        pathPatterns: [],
        contentPatterns: []
      },
      evaluationTime: performance.now() - startTime,
      cached
    };
  }

  /**
   * Generate cache key
   * @private
   */
  private getCacheKey(filePath: string, skillName: string): string {
    return AnalysisCache.createKey(filePath, skillName);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.patternMatcher.clearCache();
    this.cache.clear();
    this.fileScanner.clearCache();
    this.contentAnalyzer.resetStats();
  }

  /**
   * Get orchestrator statistics
   */
  getStats(): {
    patternCache: number;
    analysisCache: number;
    contentStats: any;
  } {
    return {
      patternCache: this.patternMatcher.getCacheStats().size,
      analysisCache: this.cache.size(),
      contentStats: this.contentAnalyzer.getStats()
    };
  }
}

export default TriggerOrchestrator;