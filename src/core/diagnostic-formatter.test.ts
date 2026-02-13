/**
 * Tests for DiagnosticFormatter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DiagnosticFormatter } from './diagnostic-formatter.js';
import { DiagnosticReport } from './diagnostic-report.js';
import { CheckLevel, CheckCategory, type CheckResult } from '../types/health-checker.js';

describe('DiagnosticFormatter', () => {
  let report: DiagnosticReport;
  let formatter: DiagnosticFormatter;

  beforeEach(() => {
    report = new DiagnosticReport();
    formatter = new DiagnosticFormatter({ color: false }); // Disable colors for testing
  });

  describe('format', () => {
    it('should format empty report', () => {
      report.complete();
      const output = formatter.format(report);

      expect(output).toContain('Claude Workflow 健康检查');
      expect(output).toContain('总结');
    });

    it('should format report with success results', () => {
      report.addResult({
        id: 'test-1',
        category: CheckCategory.Initialization,
        level: CheckLevel.Success,
        title: '项目已初始化',
        message: '.claude/ 目录存在',
      });

      report.complete();
      const output = formatter.format(report);

      expect(output).toContain('项目初始化');
      expect(output).toContain('项目已初始化');
    });

    it('should format report with errors', () => {
      report.addResult({
        id: 'test-1',
        category: CheckCategory.Configuration,
        level: CheckLevel.Error,
        title: '配置错误',
        message: 'settings.json 不存在',
        suggestion: '运行 cw init 初始化项目',
      });

      report.complete();
      const output = formatter.format(report);

      expect(output).toContain('settings.json 配置');
      expect(output).toContain('settings.json 不存在');
      expect(output).toContain('运行 cw init 初始化项目');
    });

    it('should format report with warnings', () => {
      report.addResult({
        id: 'test-1',
        category: CheckCategory.Skills,
        level: CheckLevel.Warning,
        title: '技能警告',
        message: '缺少 skill-rules.json',
        suggestion: '创建配置文件',
      });

      report.complete();
      const output = formatter.format(report);

      expect(output).toContain('技能系统');
      expect(output).toContain('缺少 skill-rules.json');
    });

    it('should show fixable indicator', () => {
      report.addResult({
        id: 'test-1',
        category: CheckCategory.Configuration,
        level: CheckLevel.Error,
        title: '配置错误',
        message: '配置文件损坏',
        fixable: true,
        fix: async () => {},
      });

      report.complete();
      const output = formatter.format(report);

      expect(output).toContain('cw doctor --fix');
    });
  });

  describe('format with verbose option', () => {
    beforeEach(() => {
      formatter = new DiagnosticFormatter({ color: false, verbose: true });
    });

    it('should show detailed information in verbose mode', () => {
      report.addResult({
        id: 'test-1',
        category: CheckCategory.Configuration,
        level: CheckLevel.Error,
        title: '配置错误',
        message: 'settings.json 格式错误',
        filePath: '/path/to/settings.json',
        line: 42,
        suggestion: '检查 JSON 语法',
        fixable: true,
        fix: async () => {},
      });

      report.complete();
      const output = formatter.format(report);

      expect(output).toContain('配置错误');
      expect(output).toContain('settings.json 格式错误');
      expect(output).toContain('/path/to/settings.json:42');
      expect(output).toContain('检查 JSON 语法');
      expect(output).toContain('可自动修复');
    });
  });

  describe('format as JSON', () => {
    beforeEach(() => {
      formatter = new DiagnosticFormatter({ json: true });
    });

    it('should format report as JSON', () => {
      report.addResult({
        id: 'test-1',
        category: CheckCategory.Configuration,
        level: CheckLevel.Error,
        title: '配置错误',
        message: 'settings.json 不存在',
      });

      report.complete();
      const output = formatter.format(report);

      // Should be valid JSON
      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('stats');
      expect(parsed).toHaveProperty('results');
      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].id).toBe('test-1');
    });
  });

  describe('formatMessage', () => {
    it('should format error message', () => {
      const message = DiagnosticFormatter.formatMessage(
        CheckLevel.Error,
        'Test error message'
      );
      expect(message).toContain('Test error message');
    });

    it('should format warning message', () => {
      const message = DiagnosticFormatter.formatMessage(
        CheckLevel.Warning,
        'Test warning message'
      );
      expect(message).toContain('Test warning message');
    });

    it('should format info message', () => {
      const message = DiagnosticFormatter.formatMessage(
        CheckLevel.Info,
        'Test info message'
      );
      expect(message).toContain('Test info message');
    });

    it('should format success message', () => {
      const message = DiagnosticFormatter.formatMessage(
        CheckLevel.Success,
        'Test success message'
      );
      expect(message).toContain('Test success message');
    });
  });

  describe('formatProgress', () => {
    it('should format progress message', () => {
      const message = DiagnosticFormatter.formatProgress(3, 10, 'Checking files');
      expect(message).toContain('[3/10]');
      expect(message).toContain('30%');
      expect(message).toContain('Checking files');
    });

    it('should handle 100% progress', () => {
      const message = DiagnosticFormatter.formatProgress(10, 10, 'Complete');
      expect(message).toContain('[10/10]');
      expect(message).toContain('100%');
    });
  });

  describe('category grouping', () => {
    it('should group results by category', () => {
      report.addResults([
        {
          id: 'init-1',
          category: CheckCategory.Initialization,
          level: CheckLevel.Success,
          title: 'Init check',
          message: 'OK',
        },
        {
          id: 'config-1',
          category: CheckCategory.Configuration,
          level: CheckLevel.Error,
          title: 'Config check',
          message: 'Error',
        },
        {
          id: 'init-2',
          category: CheckCategory.Initialization,
          level: CheckLevel.Success,
          title: 'Another init check',
          message: 'OK',
        },
      ]);

      report.complete();
      const output = formatter.format(report);

      // Should show categories
      expect(output).toContain('项目初始化');
      expect(output).toContain('settings.json 配置');

      // Initialization should come before Configuration
      const initIndex = output.indexOf('项目初始化');
      const configIndex = output.indexOf('settings.json 配置');
      expect(initIndex).toBeLessThan(configIndex);
    });
  });

  describe('summary section', () => {
    it('should show correct summary for errors and warnings', () => {
      report.addResults([
        {
          id: '1',
          category: CheckCategory.Configuration,
          level: CheckLevel.Error,
          title: 'Error',
          message: 'Error',
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

      report.complete();
      const output = formatter.format(report);

      expect(output).toContain('2 个错误');
      expect(output).toContain('1 个警告');
    });

    it('should show success message when all checks pass', () => {
      report.addResult({
        id: '1',
        category: CheckCategory.Initialization,
        level: CheckLevel.Success,
        title: 'Success',
        message: 'Success',
      });

      report.complete();
      const output = formatter.format(report);

      expect(output).toContain('项目配置健康');
    });

    it('should show duration', () => {
      report.complete();
      const output = formatter.format(report);

      expect(output).toMatch(/耗时: \d+\.\d+s/);
    });
  });
});
