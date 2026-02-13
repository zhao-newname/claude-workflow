/**
 * Doctor command - Health check and diagnostics for Claude Workflow
 *
 * Performs comprehensive health checks on:
 * - CLAUDE.md preset configuration
 * - skill-rules.json configuration
 * - Project initialization
 * - Hooks system
 * - Environment setup
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { logger } from '../../utils/logger.js';
import { DiagnosticReport } from '../../core/diagnostic-report.js';
import { DiagnosticFormatter } from '../../core/diagnostic-formatter.js';
import { CheckLevel, CheckCategory, CheckContext } from '../../types/health-checker.js';
import { ProjectChecker } from '../../core/health-checkers/project-checker.js';
import { ClaudeMdChecker } from '../../core/health-checkers/claude-md-checker.js';
import { SkillRulesChecker } from '../../core/health-checkers/skill-rules-checker.js';
import { ConfigChecker } from '../../core/health-checkers/config-checker.js';
import { SkillsChecker } from '../../core/health-checkers/skills-checker.js';
import { HooksChecker } from '../../core/health-checkers/hooks-checker.js';
import { FilesChecker } from '../../core/health-checkers/files-checker.js';
import { EnvironmentChecker } from '../../core/health-checkers/environment-checker.js';

export const doctorCommand = new Command('doctor')
  .description('Run health checks and diagnostics for Claude Workflow')
  .option('--fix', 'Automatically fix issues when possible')
  .option('-v, --verbose', 'Show detailed diagnostic information')
  .option('--json', 'Output results in JSON format')
  .option('--check <type>', 'Only check specific type (config|skills|hooks|files|env)')
  .option('--no-color', 'Disable colored output')
  .option('--quick', 'Run quick checks only (P0 errors)')
  .option('--full', 'Run full checks including performance and security')
  .action(async (options) => {
    try {
      const cwd = process.cwd();

      // Disable colors if requested
      if (options.noColor) {
        chalk.level = 0;
      }

      // Show header
      if (!options.json) {
        console.log(chalk.bold('\n🔍 Claude Workflow 健康检查'));
        console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      }

      // Determine check mode
      let checkMode = 'standard';
      if (options.quick) {
        checkMode = 'quick';
      } else if (options.full) {
        checkMode = 'full';
      }

      if (!options.json && options.verbose) {
        console.log(chalk.gray(`检查模式: ${checkMode}`));
        console.log(chalk.gray(`工作目录: ${cwd}\n`));
      }

      // Initialize diagnostic report
      const report = new DiagnosticReport();

      // Initialize checkers
      const checkers = [
        new ProjectChecker(),
        new ClaudeMdChecker(),
        new SkillRulesChecker(),
        new ConfigChecker(),
        new SkillsChecker(),
        new HooksChecker(),
        new FilesChecker(),
        new EnvironmentChecker(),
      ];

      // Create check context
      const checkContext: CheckContext = {
        cwd,
        claudeDir: path.join(cwd, '.claude'),
        mode: checkMode as 'quick' | 'standard' | 'full' | 'detailed',
        verbose: options.verbose,
        checkType: options.check,
      };

      // Run checks
      const spinner = ora('运行健康检查...').start();

      for (const checker of checkers) {
        try {
          const results = await checker.check(checkContext);
          report.addResults(results);
        } catch (error) {
          logger.error(`Checker ${checker.name} failed:`, error);
          report.addResult({
            id: `${checker.name}-error`,
            category: checker.category,
            level: CheckLevel.Error,
            title: `检查器执行失败`,
            message: `${checker.name} 执行时发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
          });
        }
      }

      spinner.succeed('健康检查完成');

      // Complete the report
      report.complete();

      // Format and display results
      const formatter = new DiagnosticFormatter({
        color: !options.noColor,
        verbose: options.verbose,
        json: options.json,
      });

      const output = formatter.format(report);
      console.log(output);

      // Exit with appropriate code
      process.exit(report.getExitCode());

    } catch (error) {
      logger.error('Doctor command failed:', error);
      process.exit(1);
    }
  });
