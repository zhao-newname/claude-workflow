/**
 * Status command - Show workflow status
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../../utils/logger.js';

export const statusCommand = new Command('status')
  .description('Show Claude Workflow status')
  .action(async () => {
    try {
      const cwd = process.cwd();
      const claudeDir = path.join(cwd, '.claude');
      const settingsPath = path.join(claudeDir, 'settings.json');

      // Check if initialized
      if (!(await fs.pathExists(settingsPath))) {
        logger.error('Not initialized. Run "cw init" first.');
        process.exit(1);
      }

      // Read config
      const config = await fs.readJson(settingsPath);

      // Display status
      console.log(chalk.bold('\n━━━━━━━━━━━━━━━'));
      console.log(chalk.bold('📊 Claude Workflow Status'));
      console.log(chalk.bold('━━━━━━━━━━━━━━━\n'));

      console.log(`Mode: ${chalk.cyan(config.mode || 'single-agent')}`);

      const skillCount = Object.keys(config.skills || {}).length;
      console.log(`Active Skills: ${chalk.cyan(skillCount)}`);

      if (skillCount > 0) {
        for (const [name, skillConfig] of Object.entries(config.skills || {})) {
          const source = (skillConfig as { source?: string }).source || 'unknown';
          console.log(chalk.green(`✓ ${name}`) + chalk.gray(` (${source})`));
        }
      }

      console.log(chalk.bold('\n━━━━━━━━━━━━━━━\n'));
      console.log(chalk.gray('💡 Tip: Run "cw skills" to manage skills\n'));
    } catch (error) {
      logger.error('Failed to get status:', error);
      process.exit(1);
    }
  });
