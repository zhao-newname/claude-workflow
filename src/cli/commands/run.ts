/**
 * Run command - Execute a task
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { CLIHelper } from '../utils/cli-helper.js';
import { logger } from '../../utils/logger.js';
import type { Task } from '../../types/index.js';

export const runCommand = new Command('run')
  .description('Execute a task')
  .argument('<description>', 'Task description')
  .option('-k, --keywords <keywords...>', 'Task keywords')
  .option('-f, --files <files...>', 'Related files')
  .action(async (description: string, options: { keywords?: string[]; files?: string[] }) => {
    try {
      const spinner = ora('Preparing task...').start();

      // Get orchestrator
      const orchestrator = await CLIHelper.getOrchestrator();

      // Create task
      const task: Task = {
        id: `task-${Date.now()}`,
        description,
        keywords: options.keywords,
        files: options.files,
        metadata: {
          createdAt: Date.now(),
          source: 'cli',
        },
      };

      spinner.text = 'Executing task...';

      // Execute task
      const result = await orchestrator.execute(task);

      if (result.success) {
        spinner.succeed('Task completed successfully');

        // Display result
        console.log(chalk.bold('\n━━━━━━━━━━━━━━━'));
        console.log(chalk.bold('✅ Task Result'));
        console.log(chalk.bold('━━━━━━━━━━━━━━━\n'));

        console.log(chalk.cyan('Task ID:'), task.id);
        console.log(chalk.cyan('Description:'), description);

        if (result.data && typeof result.data === 'object' && 'skills' in result.data) {
          const skills = (result.data as any).skills;
          if (Array.isArray(skills) && skills.length > 0) {
            console.log(chalk.cyan('\nActive Skills:'));
            for (const skill of skills) {
              console.log(`  ${chalk.green('✓')} ${skill.name} ${chalk.gray(`(${skill.source})`)}`);
              if (skill.description) {
                console.log(`    ${chalk.gray(skill.description)}`);
              }
            }
          }
        }

        console.log(chalk.bold('\n━━━━━━━━━━━━━━━\n'));
        console.log(chalk.gray('💡 Tip: Check context with "cw status"\n'));
      } else {
        spinner.fail('Task failed');
        console.log(chalk.red('\nError:'), result.error);
        process.exit(1);
      }
    } catch (error) {
      logger.error('Failed to execute task:', error);
      process.exit(1);
    }
  });
