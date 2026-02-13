/**
 * Tasks command - Manage development tasks
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { TaskManager } from '../../core/task-manager.js';
import { logger } from '../../utils/logger.js';
import type { DevTaskStatus } from '../../types/index.js';

export const tasksCommand = new Command('tasks')
  .description('Manage development tasks')
  .action(async () => {
    await listTasks();
  });

tasksCommand
  .command('list')
  .description('List all development tasks')
  .action(listTasks);

tasksCommand
  .command('show <name>')
  .alias('info')
  .description('Show detailed information about a task')
  .option('--context', 'Show context.md content')
  .option('--tasks', 'Show tasks.md content')
  .option('--plan', 'Show plan.md content')
  .action(showTask);

tasksCommand
  .command('archive <name>')
  .description('Archive a completed task to dev/archived/')
  .action(archiveTask);

tasksCommand
  .command('pending <name>')
  .description('Show pending (uncompleted) tasks')
  .action(showPendingTasks);

tasksCommand
  .command('complete <name> <lineNumber>')
  .description('Mark a task as completed by line number')
  .action(completeTask);

tasksCommand
  .command('toggle <name> <lineNumber>')
  .description('Toggle task completion status by line number')
  .action(toggleTask);

async function listTasks() {
  try {
    const spinner = ora('Loading tasks...').start();

    const taskManager = new TaskManager(process.cwd());
    const tasks = await taskManager.listTasks();
    const incompleteTasks = await taskManager.listIncompleteTasks();

    spinner.stop();

    if (tasks.length === 0 && incompleteTasks.length === 0) {
      console.log(chalk.yellow('\n⚠️  No tasks found'));
      console.log(chalk.gray('   Create tasks in dev/active/ directory'));
      console.log(chalk.gray('   Or use: /dev-docs <task-name>\n'));
      return;
    }

    console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold(`📋 Development Tasks (${tasks.length})`));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    const grouped = {
      'in-progress': tasks.filter(t => t.status === 'in-progress'),
      'blocked': tasks.filter(t => t.status === 'blocked'),
      'complete': tasks.filter(t => t.status === 'complete'),
      'planned': tasks.filter(t => t.status === 'planned'),
    };

    for (const [status, statusTasks] of Object.entries(grouped)) {
      if (statusTasks.length === 0) continue;

      const statusLabel = getStatusLabel(status as DevTaskStatus);
      console.log(chalk.cyan.bold(`${statusLabel} (${statusTasks.length}):\n`));

      for (const task of statusTasks) {
        const icon = getStatusIcon(task.status);
        const progressBar = getProgressBar(task.progress);

        console.log(`  ${icon} ${chalk.bold(task.name)}`);

        if (task.description) {
          console.log(`    ${chalk.gray(task.description)}`);
        }

        console.log(`    ${progressBar} ${chalk.cyan(`${task.progress}%`)} ${chalk.gray(`• Updated: ${task.lastUpdated}`)}`);
        console.log(`    ${chalk.dim(task.path)}\n`);
      }
    }

    if (incompleteTasks.length > 0) {
      console.log(chalk.yellow.bold(`⚠️  Incomplete Tasks (${incompleteTasks.length}):\n`));
      console.log(chalk.gray('   These directories exist but are missing required files:\n'));

      for (const task of incompleteTasks) {
        console.log(`  ${chalk.gray('○')} ${chalk.bold(task.name)}`);
        console.log(`    ${chalk.yellow('Missing:')} ${task.missingFiles.join(', ')}`);
        console.log(`    ${chalk.dim(task.path)}\n`);
      }
    }

    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    console.log(chalk.dim('💡 Commands:'));
    console.log(chalk.dim('  cw tasks show <name>              Show task details'));
    console.log(chalk.dim('  cw tasks pending <name>           Show uncompleted tasks'));
    console.log(chalk.dim('  cw tasks complete <name> <line>   Mark task as completed'));
    console.log(chalk.dim('  cw tasks toggle <name> <line>     Toggle task status'));
    console.log(chalk.dim('  cw tasks archive <name>           Archive completed task'));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  } catch (error) {
    logger.error('Failed to list tasks:', error);
    process.exit(1);
  }
}

async function showTask(name: string, options: { context?: boolean; tasks?: boolean; plan?: boolean }) {
  try {
    const spinner = ora(`Loading task "${name}"...`).start();

    const taskManager = new TaskManager(process.cwd());
    const task = await taskManager.getTask(name);

    if (!task) {
      spinner.fail(`Task "${name}" not found`);
      console.log(chalk.gray('\nRun "cw tasks" to see available tasks\n'));
      return;
    }

    spinner.succeed(`Task "${name}" loaded`);

    console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold(`📄 ${task.name}`));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    const icon = getStatusIcon(task.status);
    const statusLabel = getStatusLabel(task.status);
    const progressBar = getProgressBar(task.progress);

    console.log(chalk.cyan('Status:'));
    console.log(`  ${icon} ${statusLabel}\n`);

    console.log(chalk.cyan('Progress:'));
    console.log(`  ${progressBar} ${chalk.bold(`${task.progress}%`)}\n`);

    console.log(chalk.cyan('Last Updated:'));
    console.log(`  ${task.lastUpdated}\n`);

    console.log(chalk.cyan('Location:'));
    console.log(`  ${chalk.gray(task.path)}\n`);

    if (options.context) {
      const context = await taskManager.getTaskContext(name);
      if (context) {
        console.log(chalk.cyan('Context:\n'));
        console.log(chalk.gray('─'.repeat(70)));
        console.log(context);
        console.log(chalk.gray('─'.repeat(70)) + '\n');
      }
    }

    if (options.tasks) {
      const tasks = await taskManager.getTaskTasks(name);
      if (tasks) {
        console.log(chalk.cyan('Tasks:\n'));
        console.log(chalk.gray('─'.repeat(70)));
        console.log(tasks);
        console.log(chalk.gray('─'.repeat(70)) + '\n');
      }
    }

    if (options.plan) {
      const plan = await taskManager.getTaskPlan(name);
      if (plan) {
        console.log(chalk.cyan('Plan:\n'));
        console.log(chalk.gray('─'.repeat(70)));
        console.log(plan);
        console.log(chalk.gray('─'.repeat(70)) + '\n');
      }
    }

    if (!options.context && !options.tasks && !options.plan) {
      console.log(chalk.dim('💡 Options:'));
      console.log(chalk.dim('  --context    Show context.md content'));
      console.log(chalk.dim('  --tasks      Show tasks.md content'));
      console.log(chalk.dim('  --plan       Show plan.md content\n'));
    }

    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  } catch (error) {
    logger.error('Failed to show task:', error);
    process.exit(1);
  }
}

function getStatusIcon(status: DevTaskStatus): string {
  switch (status) {
    case 'complete':
      return chalk.green('✅');
    case 'in-progress':
      return chalk.yellow('🟡');
    case 'blocked':
      return chalk.red('⚠️');
    case 'planned':
      return chalk.gray('⏳');
    default:
      return chalk.gray('○');
  }
}

function getStatusLabel(status: DevTaskStatus): string {
  switch (status) {
    case 'complete':
      return chalk.green('Complete');
    case 'in-progress':
      return chalk.yellow('In Progress');
    case 'blocked':
      return chalk.red('Blocked');
    case 'planned':
      return chalk.gray('Planned');
    default:
      return chalk.gray('Unknown');
  }
}

function getProgressBar(progress: number): string {
  const width = 20;
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;

  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return `[${bar}]`;
}

async function archiveTask(name: string) {
  try {
    const spinner = ora(`Archiving task "${name}"...`).start();

    const taskManager = new TaskManager(process.cwd());
    const task = await taskManager.getTask(name);

    if (!task) {
      spinner.fail(`Task "${name}" not found`);
      console.log(chalk.gray('\nRun "cw tasks" to see available tasks\n'));
      return;
    }

    const result = await taskManager.archiveTask(name);

    if (result.success) {
      spinner.succeed(`Task "${name}" archived`);
      console.log(chalk.gray(`\nMoved from: ${result.from}`));
      console.log(chalk.gray(`Moved to:   ${result.to}\n`));
    } else {
      spinner.fail(`Failed to archive task "${name}"`);
      console.log(chalk.red(`\nError: ${result.error}\n`));
    }

  } catch (error) {
    logger.error('Failed to archive task:', error);
    process.exit(1);
  }
}

async function showPendingTasks(name: string) {
  try {
    const spinner = ora(`Loading pending tasks for "${name}"...`).start();

    const taskManager = new TaskManager(process.cwd());
    const task = await taskManager.getTask(name);

    if (!task) {
      spinner.fail(`Task "${name}" not found`);
      console.log(chalk.gray('\nRun "cw tasks" to see available tasks\n'));
      return;
    }

    const pendingTasks = await taskManager.getPendingTasks(name);

    if (!pendingTasks) {
      spinner.fail(`No tasks file found for "${name}"`);
      return;
    }

    spinner.succeed(`Found ${pendingTasks.total} tasks (${pendingTasks.completed} completed, ${pendingTasks.pending} pending)`);

    console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold(`📋 Pending Tasks for ${name}`));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    console.log(chalk.cyan('Progress:'));
    const progressBar = getProgressBar(task.progress);
    console.log(`  ${progressBar} ${chalk.bold(`${task.progress}%`)} (${pendingTasks.completed}/${pendingTasks.total})\n`);

    if (pendingTasks.items.length === 0) {
      console.log(chalk.green('✨ All tasks completed!\n'));
    } else {
      console.log(chalk.yellow(`⏳ ${pendingTasks.items.length} tasks remaining:\n`));

      for (const item of pendingTasks.items) {
        console.log(chalk.gray(`  ${item.lineNumber}:`), chalk.white(item.text));
      }
      console.log();
      console.log(chalk.dim('💡 Tip: Use "cw tasks complete <name> <line>" to mark a task as done\n'));
    }

    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  } catch (error) {
    logger.error('Failed to show pending tasks:', error);
    process.exit(1);
  }
}

async function completeTask(name: string, lineNumberStr: string) {
  try {
    const lineNumber = parseInt(lineNumberStr, 10);
    if (isNaN(lineNumber) || lineNumber < 1) {
      console.log(chalk.red('\n❌ Invalid line number. Must be a positive integer.\n'));
      return;
    }

    const spinner = ora(`Marking task at line ${lineNumber} as completed...`).start();

    const taskManager = new TaskManager(process.cwd());
    const result = await taskManager.updateTaskStatus(name, lineNumber, true);

    if (result.success) {
      spinner.succeed(`Task completed`);
      console.log(chalk.gray(`\nLine ${lineNumber}:`), chalk.strikethrough.gray(result.taskText));
      console.log(chalk.green(`✓ Marked as completed\n`));

      const task = await taskManager.getTask(name);
      if (task) {
        const progressBar = getProgressBar(task.progress);
        console.log(chalk.cyan('Updated Progress:'));
        console.log(`  ${progressBar} ${chalk.bold(`${task.progress}%`)}\n`);
      }
    } else {
      spinner.fail(`Failed to complete task`);
      console.log(chalk.red(`\nError: ${result.error}\n`));
    }

  } catch (error) {
    logger.error('Failed to complete task:', error);
    process.exit(1);
  }
}

async function toggleTask(name: string, lineNumberStr: string) {
  try {
    const lineNumber = parseInt(lineNumberStr, 10);
    if (isNaN(lineNumber) || lineNumber < 1) {
      console.log(chalk.red('\n❌ Invalid line number. Must be a positive integer.\n'));
      return;
    }

    const spinner = ora(`Toggling task at line ${lineNumber}...`).start();

    const taskManager = new TaskManager(process.cwd());
    const result = await taskManager.toggleTaskStatus(name, lineNumber);

    if (result.success) {
      spinner.succeed(`Task status toggled`);
      console.log(chalk.gray(`\nLine ${lineNumber}:`), chalk.white(result.taskText));
      console.log(result.newStatus ? chalk.green(`✓ Marked as completed`) : chalk.yellow(`○ Marked as pending`));
      console.log();

      const task = await taskManager.getTask(name);
      if (task) {
        const progressBar = getProgressBar(task.progress);
        console.log(chalk.cyan('Updated Progress:'));
        console.log(`  ${progressBar} ${chalk.bold(`${task.progress}%`)}\n`);
      }
    } else {
      spinner.fail(`Failed to toggle task`);
      console.log(chalk.red(`\nError: ${result.error}\n`));
    }

  } catch (error) {
    logger.error('Failed to toggle task:', error);
    process.exit(1);
  }
}
