#!/usr/bin/env node

/**
 * Claude Workflow CLI
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { skillsCommand } from './commands/skills.js';
import { updateCommand } from './commands/update.js';
import { runCommand } from './commands/run.js';
import { tasksCommand } from './commands/tasks.js';
import { doctorCommand } from './commands/doctor.js';

const program = new Command();

program
  .name('cw')
  .description('Claude Workflow - Universal AI workflow system')
  .version('0.1.0');

// Register commands
program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(doctorCommand);
program.addCommand(skillsCommand);
program.addCommand(runCommand);
program.addCommand(updateCommand);
program.addCommand(tasksCommand);

// Parse arguments
program.parse();
