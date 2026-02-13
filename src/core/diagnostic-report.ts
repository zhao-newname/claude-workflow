/**
 * Diagnostic Report - Aggregates and manages health check results
 */

import { CheckResult, CheckLevel, CheckCategory } from '../types/health-checker.js';

/**
 * Statistics for check results
 */
export interface DiagnosticStats {
  total: number;
  errors: number;
  warnings: number;
  info: number;
  success: number;
  fixable: number;
}

/**
 * Diagnostic report that aggregates check results
 */
export class DiagnosticReport {
  private results: CheckResult[] = [];
  private startTime: number;
  private endTime?: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Add a check result to the report
   */
  addResult(result: CheckResult): void {
    this.results.push(result);
  }

  /**
   * Add multiple check results
   */
  addResults(results: CheckResult[]): void {
    this.results.push(...results);
  }

  /**
   * Mark the report as complete
   */
  complete(): void {
    this.endTime = Date.now();
  }

  /**
   * Get all results
   */
  getResults(): CheckResult[] {
    return [...this.results];
  }

  /**
   * Get results by level
   */
  getResultsByLevel(level: CheckLevel): CheckResult[] {
    return this.results.filter(r => r.level === level);
  }

  /**
   * Get results by category
   */
  getResultsByCategory(category: CheckCategory): CheckResult[] {
    return this.results.filter(r => r.category === category);
  }

  /**
   * Get fixable results
   */
  getFixableResults(): CheckResult[] {
    return this.results.filter(r => r.fixable && r.fix);
  }

  /**
   * Get results grouped by category
   */
  getResultsByCategories(): Map<CheckCategory, CheckResult[]> {
    const grouped = new Map<CheckCategory, CheckResult[]>();

    for (const result of this.results) {
      const existing = grouped.get(result.category) || [];
      existing.push(result);
      grouped.set(result.category, existing);
    }

    return grouped;
  }

  /**
   * Get results grouped by level
   */
  getResultsByLevels(): Map<CheckLevel, CheckResult[]> {
    const grouped = new Map<CheckLevel, CheckResult[]>();

    for (const result of this.results) {
      const existing = grouped.get(result.level) || [];
      existing.push(result);
      grouped.set(result.level, existing);
    }

    return grouped;
  }

  /**
   * Get statistics
   */
  getStats(): DiagnosticStats {
    const stats: DiagnosticStats = {
      total: this.results.length,
      errors: 0,
      warnings: 0,
      info: 0,
      success: 0,
      fixable: 0,
    };

    for (const result of this.results) {
      switch (result.level) {
        case CheckLevel.Error:
          stats.errors++;
          break;
        case CheckLevel.Warning:
          stats.warnings++;
          break;
        case CheckLevel.Info:
          stats.info++;
          break;
        case CheckLevel.Success:
          stats.success++;
          break;
      }

      if (result.fixable && result.fix) {
        stats.fixable++;
      }
    }

    return stats;
  }

  /**
   * Get duration in milliseconds
   */
  getDuration(): number {
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.results.some(r => r.level === CheckLevel.Error);
  }

  /**
   * Check if there are any warnings
   */
  hasWarnings(): boolean {
    return this.results.some(r => r.level === CheckLevel.Warning);
  }

  /**
   * Check if all checks passed
   */
  isHealthy(): boolean {
    return !this.hasErrors() && !this.hasWarnings();
  }

  /**
   * Get exit code based on results
   * 0 = success, 1 = warnings, 2 = errors
   */
  getExitCode(): number {
    if (this.hasErrors()) {
      return 2;
    }
    if (this.hasWarnings()) {
      return 1;
    }
    return 0;
  }

  /**
   * Sort results by priority (errors first, then warnings, etc.)
   */
  sortResults(): void {
    const levelPriority: Record<CheckLevel, number> = {
      [CheckLevel.Error]: 0,
      [CheckLevel.Warning]: 1,
      [CheckLevel.Info]: 2,
      [CheckLevel.Success]: 3,
    };

    this.results.sort((a, b) => {
      // First sort by level
      const levelDiff = levelPriority[a.level] - levelPriority[b.level];
      if (levelDiff !== 0) {
        return levelDiff;
      }

      // Then by category
      return a.category.localeCompare(b.category);
    });
  }

  /**
   * Convert to JSON
   */
  toJSON(): object {
    return {
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.getDuration(),
      stats: this.getStats(),
      results: this.results,
      healthy: this.isHealthy(),
      exitCode: this.getExitCode(),
    };
  }
}
