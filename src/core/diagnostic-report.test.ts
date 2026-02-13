/**
 * Tests for DiagnosticReport
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DiagnosticReport } from './diagnostic-report.js';
import { CheckLevel, CheckCategory, type CheckResult } from '../types/health-checker.js';

describe('DiagnosticReport', () => {
  let report: DiagnosticReport;

  beforeEach(() => {
    report = new DiagnosticReport();
  });

  describe('addResult', () => {
    it('should add a single result', () => {
      const result: CheckResult = {
        id: 'test-1',
        category: CheckCategory.Configuration,
        level: CheckLevel.Error,
        title: 'Test Error',
        message: 'This is a test error',
      };

      report.addResult(result);
      expect(report.getResults()).toHaveLength(1);
      expect(report.getResults()[0]).toEqual(result);
    });
  });

  describe('addResults', () => {
    it('should add multiple results', () => {
      const results: CheckResult[] = [
        {
          id: 'test-1',
          category: CheckCategory.Configuration,
          level: CheckLevel.Error,
          title: 'Test Error 1',
          message: 'Error 1',
        },
        {
          id: 'test-2',
          category: CheckCategory.Skills,
          level: CheckLevel.Warning,
          title: 'Test Warning',
          message: 'Warning 1',
        },
      ];

      report.addResults(results);
      expect(report.getResults()).toHaveLength(2);
    });
  });

  describe('getResultsByLevel', () => {
    beforeEach(() => {
      report.addResults([
        {
          id: 'error-1',
          category: CheckCategory.Configuration,
          level: CheckLevel.Error,
          title: 'Error',
          message: 'Error message',
        },
        {
          id: 'warning-1',
          category: CheckCategory.Skills,
          level: CheckLevel.Warning,
          title: 'Warning',
          message: 'Warning message',
        },
        {
          id: 'error-2',
          category: CheckCategory.Hooks,
          level: CheckLevel.Error,
          title: 'Another Error',
          message: 'Another error message',
        },
      ]);
    });

    it('should filter results by level', () => {
      const errors = report.getResultsByLevel(CheckLevel.Error);
      expect(errors).toHaveLength(2);
      expect(errors.every(r => r.level === CheckLevel.Error)).toBe(true);

      const warnings = report.getResultsByLevel(CheckLevel.Warning);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].level).toBe(CheckLevel.Warning);
    });
  });

  describe('getResultsByCategory', () => {
    beforeEach(() => {
      report.addResults([
        {
          id: 'config-1',
          category: CheckCategory.Configuration,
          level: CheckLevel.Error,
          title: 'Config Error',
          message: 'Config error',
        },
        {
          id: 'skills-1',
          category: CheckCategory.Skills,
          level: CheckLevel.Warning,
          title: 'Skills Warning',
          message: 'Skills warning',
        },
        {
          id: 'config-2',
          category: CheckCategory.Configuration,
          level: CheckLevel.Warning,
          title: 'Config Warning',
          message: 'Config warning',
        },
      ]);
    });

    it('should filter results by category', () => {
      const configResults = report.getResultsByCategory(CheckCategory.Configuration);
      expect(configResults).toHaveLength(2);
      expect(configResults.every(r => r.category === CheckCategory.Configuration)).toBe(true);

      const skillsResults = report.getResultsByCategory(CheckCategory.Skills);
      expect(skillsResults).toHaveLength(1);
    });
  });

  describe('getStats', () => {
    it('should calculate correct statistics', () => {
      report.addResults([
        {
          id: '1',
          category: CheckCategory.Configuration,
          level: CheckLevel.Error,
          title: 'Error 1',
          message: 'Error',
        },
        {
          id: '2',
          category: CheckCategory.Skills,
          level: CheckLevel.Error,
          title: 'Error 2',
          message: 'Error',
        },
        {
          id: '3',
          category: CheckCategory.Hooks,
          level: CheckLevel.Warning,
          title: 'Warning 1',
          message: 'Warning',
        },
        {
          id: '4',
          category: CheckCategory.Files,
          level: CheckLevel.Info,
          title: 'Info 1',
          message: 'Info',
        },
        {
          id: '5',
          category: CheckCategory.Environment,
          level: CheckLevel.Success,
          title: 'Success 1',
          message: 'Success',
        },
      ]);

      const stats = report.getStats();
      expect(stats.total).toBe(5);
      expect(stats.errors).toBe(2);
      expect(stats.warnings).toBe(1);
      expect(stats.info).toBe(1);
      expect(stats.success).toBe(1);
    });

    it('should count fixable results', () => {
      report.addResults([
        {
          id: '1',
          category: CheckCategory.Configuration,
          level: CheckLevel.Error,
          title: 'Fixable Error',
          message: 'Error',
          fixable: true,
          fix: async () => {},
        },
        {
          id: '2',
          category: CheckCategory.Skills,
          level: CheckLevel.Error,
          title: 'Non-fixable Error',
          message: 'Error',
          fixable: false,
        },
      ]);

      const stats = report.getStats();
      expect(stats.fixable).toBe(1);
    });
  });

  describe('hasErrors and hasWarnings', () => {
    it('should detect errors', () => {
      expect(report.hasErrors()).toBe(false);

      report.addResult({
        id: '1',
        category: CheckCategory.Configuration,
        level: CheckLevel.Error,
        title: 'Error',
        message: 'Error',
      });

      expect(report.hasErrors()).toBe(true);
    });

    it('should detect warnings', () => {
      expect(report.hasWarnings()).toBe(false);

      report.addResult({
        id: '1',
        category: CheckCategory.Skills,
        level: CheckLevel.Warning,
        title: 'Warning',
        message: 'Warning',
      });

      expect(report.hasWarnings()).toBe(true);
    });
  });

  describe('isHealthy', () => {
    it('should return true when no errors or warnings', () => {
      report.addResult({
        id: '1',
        category: CheckCategory.Configuration,
        level: CheckLevel.Success,
        title: 'Success',
        message: 'Success',
      });

      expect(report.isHealthy()).toBe(true);
    });

    it('should return false when there are errors', () => {
      report.addResult({
        id: '1',
        category: CheckCategory.Configuration,
        level: CheckLevel.Error,
        title: 'Error',
        message: 'Error',
      });

      expect(report.isHealthy()).toBe(false);
    });

    it('should return false when there are warnings', () => {
      report.addResult({
        id: '1',
        category: CheckCategory.Skills,
        level: CheckLevel.Warning,
        title: 'Warning',
        message: 'Warning',
      });

      expect(report.isHealthy()).toBe(false);
    });
  });

  describe('getExitCode', () => {
    it('should return 0 for healthy report', () => {
      report.addResult({
        id: '1',
        category: CheckCategory.Configuration,
        level: CheckLevel.Success,
        title: 'Success',
        message: 'Success',
      });

      expect(report.getExitCode()).toBe(0);
    });

    it('should return 1 for warnings', () => {
      report.addResult({
        id: '1',
        category: CheckCategory.Skills,
        level: CheckLevel.Warning,
        title: 'Warning',
        message: 'Warning',
      });

      expect(report.getExitCode()).toBe(1);
    });

    it('should return 2 for errors', () => {
      report.addResult({
        id: '1',
        category: CheckCategory.Configuration,
        level: CheckLevel.Error,
        title: 'Error',
        message: 'Error',
      });

      expect(report.getExitCode()).toBe(2);
    });
  });

  describe('sortResults', () => {
    it('should sort results by level priority', () => {
      report.addResults([
        {
          id: '1',
          category: CheckCategory.Configuration,
          level: CheckLevel.Info,
          title: 'Info',
          message: 'Info',
        },
        {
          id: '2',
          category: CheckCategory.Skills,
          level: CheckLevel.Error,
          title: 'Error',
          message: 'Error',
        },
        {
          id: '3',
          category: CheckCategory.Hooks,
          level: CheckLevel.Warning,
          title: 'Warning',
          message: 'Warning',
        },
      ]);

      report.sortResults();
      const results = report.getResults();

      expect(results[0].level).toBe(CheckLevel.Error);
      expect(results[1].level).toBe(CheckLevel.Warning);
      expect(results[2].level).toBe(CheckLevel.Info);
    });
  });

  describe('toJSON', () => {
    it('should convert report to JSON', () => {
      report.addResult({
        id: '1',
        category: CheckCategory.Configuration,
        level: CheckLevel.Error,
        title: 'Error',
        message: 'Error',
      });

      report.complete();

      const json = report.toJSON();
      expect(json).toHaveProperty('startTime');
      expect(json).toHaveProperty('endTime');
      expect(json).toHaveProperty('duration');
      expect(json).toHaveProperty('stats');
      expect(json).toHaveProperty('results');
      expect(json).toHaveProperty('healthy');
      expect(json).toHaveProperty('exitCode');
    });
  });
});
