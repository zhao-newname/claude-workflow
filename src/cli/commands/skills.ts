/**
 * Skills command - Manage skills
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { execSync } from 'child_process';
import { CLIHelper } from '../utils/cli-helper.js';
import { logger } from '../../utils/logger.js';
import { parseFrontmatter } from '../../utils/fs.js';
import yaml from 'js-yaml';

export const skillsCommand = new Command('skills')
  .description('Manage skills')
  .showHelpAfterError('(use "cw skills --help" for additional information)');

/**
 * List all skills with installation status
 */
async function listSkills(options: {
  detailed?: boolean;
  all?: boolean;
  installed?: boolean;
  available?: boolean;
  source?: string;
} = {}) {
  try {
    const spinner = ora('Loading skills...').start();

    const orchestrator = await CLIHelper.getOrchestrator();
    const agents = orchestrator.getAgents();

    if (agents.length === 0) {
      spinner.fail('No agents found');
      return;
    }

    const agent = agents[0];

    // Get all skills with status
    let allStatuses = await agent.skills.listAllSkills();

    spinner.succeed(`Found ${allStatuses.length} skills`);

    if (allStatuses.length === 0) {
      console.log(chalk.yellow('\nNo skills available.'));
      console.log(chalk.gray('Add skills to ~/.claude-workflow/skills/\n'));
      return;
    }

    // Apply filters
    if (options.installed) {
      allStatuses = allStatuses.filter(s => s.installed);
    }
    if (options.available) {
      allStatuses = allStatuses.filter(s => !s.installed);
    }
    if (options.source) {
      const sourceFilter = options.source.toLowerCase();
      allStatuses = allStatuses.filter(s => {
        if (sourceFilter === 'plugin') {
          // Plugin skills have source === 'plugin'
          return s.source === 'plugin';
        } else if (sourceFilter === 'cw') {
          // CW skills are universal, tech-stack, or project (not plugin)
          return s.source !== 'plugin';
        }
        return s.source === sourceFilter;
      });
    }

    // Separate installed and available
    const installed = allStatuses.filter(s => s.installed);
    const available = allStatuses.filter(s => !s.installed);

    // Separate CW and Plugin skills (for display purposes)
    const cwSkills = available.filter(s => s.source !== 'plugin');
    const pluginSkills = available.filter(s => s.source === 'plugin');

    // Display header
    console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold(`📚 Skills (${allStatuses.length} total)`));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    // Display installed skills
    if (installed.length > 0) {
      console.log(chalk.cyan.bold(`INSTALLED (${installed.length}):`));

      if (options.detailed) {
        // Detailed mode - show full descriptions
        console.log();
        for (const status of installed) {
          const skill = await agent.skills.get(status.name);
          if (!skill) continue;
          await displaySkillDetailed(skill, status);
        }
      } else {
        // Compact mode - one line per skill
        for (const status of installed) {
          const skill = await agent.skills.get(status.name);
          if (!skill) continue;
          await displaySkillCompact(skill, status);
        }
        console.log();
      }
    }

    // Display available CW skills
    if (cwSkills.length > 0 && !options.installed) {
      console.log(chalk.cyan.bold(`AVAILABLE - CW Core (${cwSkills.length}):`));

      if (options.detailed) {
        console.log();
        for (const status of cwSkills) {
          const skill = await agent.skills.get(status.name);
          if (!skill) continue;
          await displaySkillDetailed(skill, status);
        }
      } else {
        for (const status of cwSkills) {
          const skill = await agent.skills.get(status.name);
          if (!skill) continue;
          await displaySkillCompact(skill, status);
        }
        console.log();
      }
    }

    // Display available Plugin skills
    if (pluginSkills.length > 0 && !options.installed) {
      const displayLimit = options.all ? pluginSkills.length : 10;
      const hiddenCount = pluginSkills.length - displayLimit;

      console.log(chalk.cyan.bold(`AVAILABLE - Plugins (${pluginSkills.length}):`));

      if (options.detailed) {
        console.log();
        for (let i = 0; i < displayLimit; i++) {
          const status = pluginSkills[i];
          const skill = await agent.skills.get(status.name);
          if (!skill) continue;
          await displaySkillDetailed(skill, status);
        }
      } else {
        for (let i = 0; i < displayLimit; i++) {
          const status = pluginSkills[i];
          const skill = await agent.skills.get(status.name);
          if (!skill) continue;
          await displaySkillCompact(skill, status);
        }

        if (hiddenCount > 0) {
          console.log(chalk.dim(`  ... (${hiddenCount} more, use --all to show)`));
        }
        console.log();
      }
    }

    // Display footer
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
    console.log(chalk.dim('💡 Commands:'));
    if (!options.detailed) {
      console.log(chalk.dim('  cw skills --detailed         Show full descriptions'));
    }
    if (!options.all && pluginSkills.length > 10) {
      console.log(chalk.dim('  cw skills --all              Show all skills'));
    }
    console.log(chalk.dim('  cw skills --lint             Check 500-line rule compliance'));
    console.log(chalk.dim('  cw skills show <name>        View skill details'));
    console.log(chalk.dim('  cw skills add <name>         Install a skill'));
    console.log(chalk.dim('  cw skills search <keyword>   Search skills'));
    console.log();
    console.log(chalk.dim('💡 Symbols:'));
    console.log(chalk.dim(`  ${chalk.yellow('●')} = 需要改造（运行 skill-fixer）`));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  } catch (error) {
    logger.error('Failed to list skills:', error);
    process.exit(1);
  }
}

/**
 * Display skill in compact mode (one line)
 */
async function displaySkillCompact(skill: any, status: any) {
  const icon = status.installed ? chalk.green('✓') : chalk.gray('○');

  // Check if skill needs fixing (only for installed skills)
  let needsFixing = false;
  if (status.installed) {
    needsFixing = await checkSkillNeedsFixing(skill.metadata.name);
  }

  // Add warning indicator after skill name if needs fixing
  const warningDot = needsFixing ? chalk.yellow('●') : '';
  const name = chalk.bold(skill.metadata.name) + (warningDot ? ` ${warningDot}` : '');

  // Truncate description to fit in one line
  const maxDescLength = 50;
  let desc = skill.metadata.description;
  if (desc.length > maxDescLength) {
    desc = desc.substring(0, maxDescLength - 3) + '...';
  }

  console.log(`  ${icon} ${name.padEnd(30)} ${chalk.gray(desc)}`);
}

/**
 * Display skill in detailed mode (multiple lines)
 */
async function displaySkillDetailed(skill: any, status: any) {
  const priority = skill.config.priority;
  const priorityColor =
    priority === 'critical' || priority === 'high'
      ? chalk.red
      : priority === 'medium'
      ? chalk.yellow
      : chalk.gray;

  if (status.installed) {
    // Check if skill needs fixing
    const needsFixing = await checkSkillNeedsFixing(skill.metadata.name);
    const warningDot = needsFixing ? ` ${chalk.yellow('●')}` : '';

    // Determine location label
    let locationLabel = '';
    if (status.location === 'project') {
      locationLabel = chalk.green('[Project]');
    } else if (status.location === 'user') {
      locationLabel = chalk.blue('[User]');
    } else if (status.location === 'both') {
      locationLabel = chalk.green('[Project]') + chalk.dim(' + ') + chalk.gray('[Global]');
    }

    const sizeLabel = status.size ? formatSize(status.size) : '';

    console.log(
      `  ${chalk.green('✓')} ${chalk.bold(skill.metadata.name)}${warningDot} ${locationLabel} ${priorityColor(`[${capitalize(priority)}]`)}`
    );
    console.log(`    ${chalk.gray(skill.metadata.description)}`);

    // Show location path
    if (status.location === 'project') {
      console.log(`    ${chalk.dim(`Location: .claude/skills/${status.name}/`)}${sizeLabel ? chalk.dim(` • Size: ${sizeLabel}`) : ''}`);
    } else if (status.location === 'user') {
      console.log(`    ${chalk.dim(`Location: ~/.claude/skills/${status.name}/`)}${sizeLabel ? chalk.dim(` • Size: ${sizeLabel}`) : ''}`);
    } else if (status.location === 'both') {
      console.log(`    ${chalk.dim(`Location: .claude/skills/${status.name}/ (overrides global)`)}${sizeLabel ? chalk.dim(` • Size: ${sizeLabel}`) : ''}`);
    }
    console.log();
  } else {
    const sourceLabel = status.source ? `[${capitalize(status.source)}]` : '';

    console.log(
      `  ${chalk.gray('○')} ${chalk.bold(skill.metadata.name)} ${chalk.gray(sourceLabel)} ${priorityColor(`[${capitalize(priority)}]`)}`
    );
    console.log(`    ${chalk.gray(skill.metadata.description)}`);
    console.log(`    ${chalk.cyan(`Install: cw skills add ${status.name}`)}\n`);
  }
}

/**
 * Format file size in human-readable format
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Check if a skill needs fixing (lacks trigger configuration)
 * Returns true if the skill is missing keywords, intentPatterns, pathPatterns, or contentPatterns
 */
async function checkSkillNeedsFixing(skillName: string): Promise<boolean> {
  try {
    // Find skill path (project or user directory)
    const projectSkillPath = path.join(process.cwd(), '.claude/skills', skillName);
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const userSkillPath = homeDir ? path.join(homeDir, '.claude/skills', skillName) : null;

    let skillPath: string | null = null;
    if (await fs.pathExists(projectSkillPath)) {
      skillPath = projectSkillPath;
    } else if (userSkillPath && await fs.pathExists(userSkillPath)) {
      skillPath = userSkillPath;
    }

    if (!skillPath) {
      return false;
    }

    // Read SKILL.md
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (!await fs.pathExists(skillMdPath)) {
      return true; // Missing SKILL.md definitely needs fixing
    }

    const content = await fs.readFile(skillMdPath, 'utf-8');
    const { frontmatter } = parseFrontmatter(content);

    // Check for trigger configuration
    const hasKeywords = frontmatter.keywords &&
      (Array.isArray(frontmatter.keywords) ? frontmatter.keywords.length > 0 : true);
    const hasIntentPatterns = frontmatter.intentPatterns &&
      (Array.isArray(frontmatter.intentPatterns) ? frontmatter.intentPatterns.length > 0 : true);
    const hasPathPatterns = frontmatter.pathPatterns &&
      (Array.isArray(frontmatter.pathPatterns) ? frontmatter.pathPatterns.length > 0 : true);
    const hasContentPatterns = frontmatter.contentPatterns &&
      (Array.isArray(frontmatter.contentPatterns) ? frontmatter.contentPatterns.length > 0 : true);

    const hasTriggers = hasKeywords || hasIntentPatterns || hasPathPatterns || hasContentPatterns;

    // Return true if no triggers (needs fixing)
    return !hasTriggers;
  } catch (error) {
    // If we can't check, assume it doesn't need fixing
    return false;
  }
}

/**
 * Search skills by keyword
 */
async function searchSkills(keyword: string) {
  try {
    const spinner = ora(`Searching for "${keyword}"...`).start();

    const orchestrator = await CLIHelper.getOrchestrator();
    const agents = orchestrator.getAgents();

    if (agents.length === 0) {
      spinner.fail('No agents found');
      return;
    }

    const agent = agents[0];
    const skills = await agent.skills.search(keyword);

    spinner.succeed(`Found ${skills.length} matching skills`);

    if (skills.length === 0) {
      console.log(chalk.yellow(`\nNo skills found matching "${keyword}"\n`));
      return;
    }

    console.log(chalk.bold('\n━━━━━━━━━━━━━━━'));
    console.log(chalk.bold(`🔍 Search Results for "${keyword}"`));
    console.log(chalk.bold('━━━━━━━━━━━━━━━\n'));

    for (const skill of skills) {
      console.log(`  ${chalk.green('✓')} ${chalk.bold(skill.metadata.name)} ${chalk.gray(`(${skill.config.source})`)}`);
      console.log(`    ${chalk.gray(skill.metadata.description)}`);
    }

    console.log(chalk.bold('\n━━━━━━━━━━━━━━━\n'));
  } catch (error) {
    logger.error('Failed to search skills:', error);
    process.exit(1);
  }
}

/**
 * Remove a skill from the project or user directory
 */
async function removeSkill(name: string, options: { yes?: boolean } = {}) {
  try {
    const spinner = ora(`Checking skill "${name}"...`).start();

    // Check if skill exists in project or user directory
    const projectSkillPath = path.join(process.cwd(), '.claude/skills', name);
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    let userSkillPath: string | undefined;
    if (homeDir) {
      userSkillPath = path.join(homeDir, '.claude/skills', name);
    }

    const projectExists = await fs.pathExists(projectSkillPath);
    const userExists = userSkillPath ? await fs.pathExists(userSkillPath) : false;

    if (!projectExists && !userExists) {
      spinner.fail(`Skill "${name}" is not installed`);
      console.log(chalk.yellow('\n⚠️  Skill not found in project or user directory'));
      console.log(chalk.gray(`   Locations checked:`));
      console.log(chalk.gray(`   - Project: ${projectSkillPath}`));
      if (userSkillPath) {
        console.log(chalk.gray(`   - User: ${userSkillPath}`));
      }
      console.log();
      console.log(chalk.dim('💡 Run "cw skills" to see installed skills\n'));
      return;
    }

    // Determine which location(s) to remove
    const locationsToRemove: Array<{ path: string; label: string; type: 'project' | 'user' }> = [];

    if (projectExists) {
      locationsToRemove.push({ path: projectSkillPath, label: 'Project', type: 'project' });
    }
    if (userExists && userSkillPath) {
      locationsToRemove.push({ path: userSkillPath, label: 'User', type: 'user' });
    }

    // Calculate total size
    let totalSize = 0;
    for (const location of locationsToRemove) {
      const stats = await fs.stat(location.path);
      if (stats.isDirectory()) {
        const files = await fs.readdir(location.path, { recursive: true });
        for (const file of files) {
          const filePath = path.join(location.path, file as string);
          try {
            const fileStat = await fs.stat(filePath);
            if (fileStat.isFile()) {
              totalSize += fileStat.size;
            }
          } catch (e) {
            // Skip if file doesn't exist
          }
        }
      }
    }

    spinner.stop();

    // Check if skill exists in global directory
    const workflowDir = path.join(homeDir!, '.claude-workflow');
    const globalLocations = [
      path.join(workflowDir, 'skills/universal', name),
      path.join(workflowDir, 'skills/tech-stack', name),
      path.join(workflowDir, 'skills/custom', name),
    ];

    let existsInGlobal = false;
    for (const globalPath of globalLocations) {
      if (await fs.pathExists(globalPath)) {
        existsInGlobal = true;
        break;
      }
    }

    // If skill is in project or user directory but not in global, suggest sync
    if ((projectExists || userExists) && !existsInGlobal && !options.yes) {
      const locationLabel = projectExists && userExists ? 'project and user directories'
                          : projectExists ? 'project directory'
                          : 'user directory';

      console.log(chalk.yellow(`\n⚠️  Skill "${name}" is in ${locationLabel} but not in global CW directory\n`));
      console.log(chalk.dim('  This skill may be a custom skill you manually installed or created.'));
      console.log(chalk.dim('  Consider syncing it to global custom directory before removing.\n'));

      const inquirer = (await import('inquirer')).default;
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Sync to global custom and then remove (Recommended)', value: 'sync' },
            { name: 'Remove without syncing', value: 'remove' },
            { name: 'Cancel', value: 'cancel' },
          ],
          default: 'sync',
        },
      ]);

      if (action === 'cancel') {
        console.log(chalk.gray('Cancelled\n'));
        return;
      }

      if (action === 'sync') {
        // Determine source path (prefer project over user)
        const sourcePath = projectExists ? projectSkillPath : userSkillPath!;
        const sourceLabel = projectExists ? 'project' : 'user';

        // Sync to global custom
        console.log();
        const syncSpinner = ora(`Syncing from ${sourceLabel} to global custom directory...`).start();
        try {
          const customPath = path.join(workflowDir, 'skills/custom', name);
          await fs.ensureDir(path.dirname(customPath));
          await fs.copy(sourcePath, customPath, {
            filter: (src) => {
              return !src.includes('node_modules') && !src.includes('.DS_Store');
            },
          });

          // Update metadata
          await updateSkillMetadata(customPath, {
            category: 'custom',
            syncedAt: new Date().toISOString(),
            syncedFrom: sourcePath,
          } as Partial<SkillMetadata>);

          syncSpinner.succeed(`Synced from ${sourceLabel} to global custom directory`);
          console.log(chalk.green(`  Location: ${chalk.gray(customPath)}\n`));
        } catch (error) {
          syncSpinner.fail('Failed to sync');
          console.log(chalk.red(`  Error: ${error}\n`));
          console.log(chalk.yellow('  Continuing with removal...\n'));
        }
      }
    }

    // Confirm removal
    if (!options.yes) {
      console.log(chalk.yellow(`\n⚠️  Remove skill "${name}"?\n`));
      console.log('  This will:');
      for (const location of locationsToRemove) {
        console.log(`    • Delete ${chalk.cyan(location.label)}: ${chalk.gray(location.path)}`);
      }
      if (projectExists) {
        console.log('    • Stop hook recommendations for this skill');
      }
      console.log(`    • Free up ${formatSize(totalSize)}\n`);

      const inquirer = (await import('inquirer')).default;
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Continue?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.gray('Cancelled\n'));
        return;
      }
    }

    // Remove skill directories
    const removeSpinner = ora('Removing skill files...').start();
    for (const location of locationsToRemove) {
      await fs.remove(location.path);
      removeSpinner.text = `Removed ${location.label}`;
    }
    removeSpinner.succeed('Removed skill files');

    // Update skill-rules.json (for both project and global removals)
    const rulesSpinner = ora('Updating skill-rules.json...').start();
    await removeFromSkillRules(process.cwd(), name);
    rulesSpinner.succeed('Updated skill-rules.json');

    console.log(chalk.green(`\n✅ Skill "${name}" removed successfully!\n`));

    // Show helpful message based on what was removed
    if (projectExists && !userExists) {
      console.log(chalk.dim('💡 The skill is still available in global directory'));
      console.log(chalk.dim('   Run "cw skills add ' + name + '" to reinstall\n'));
    } else if (userExists && !projectExists) {
      console.log(chalk.dim('💡 User skill removed'));
      console.log(chalk.dim('   The skill may still be available in global directory\n'));
    } else {
      console.log(chalk.dim('💡 Skill removed from both project and user directory'));
      console.log(chalk.dim('   The skill may still be available in global directory\n'));
    }

  } catch (error) {
    logger.error('Failed to remove skill:', error);
    process.exit(1);
  }
}

// Subcommands
skillsCommand
  .command('list')
  .description('List all available skills')
  .option('--detailed', 'Show detailed descriptions')
  .option('--all', 'Show all available skills (no limit)')
  .option('--installed', 'Show only installed skills')
  .option('--available', 'Show only available skills')
  .option('--source <type>', 'Filter by source (cw|plugin)')
  .option('--lint', 'Check skills for 500-line rule compliance')
  .option('--fix', 'Show suggestions for fixing violations (use with --lint)')
  .action(async (options) => {
    // If --lint is specified, run lint instead of list
    if (options.lint) {
      await lintSkills({ fix: options.fix });
    } else {
      await listSkills(options);
    }
  });

skillsCommand
  .command('search <keyword>')
  .description('Search skills by keyword')
  .action(searchSkills);

skillsCommand
  .command('add <source>')
  .description('Add a skill from URL or local path')
  .option('-c, --category <type>', 'Specify category (universal|tech-stack|project)')
  .option('-n, --name <name>', 'Custom skill name')
  .option('--dry-run', 'Preview without installing')
  .option('-f, --force', 'Force overwrite if exists')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('-g, --global', 'Install to global directory (~/.claude/skills/)')
  .action(addSkill);

skillsCommand
  .command('remove <name>')
  .description('Remove a skill from the project')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(removeSkill);

skillsCommand
  .command('show <name>')
  .alias('info')
  .description('Show detailed information about a skill')
  .option('--content', 'Show full SKILL.md content')
  .option('--validate', 'Validate skill frontmatter against skill-rules.json')
  .option('--fix', 'Automatically fix frontmatter issues (use with --validate)')
  .action(showSkill);

skillsCommand
  .command('sync <name>')
  .description('Sync a skill from project/user directory to global directory (useful for making user skills manageable by CW)')
  .option('--category <category>', 'Target category (universal|tech-stack|custom)', 'custom')
  .option('-f, --force', 'Force override if skill exists')
  .action(syncSkillToGlobal);

/**
 * Show detailed information about a skill
 */
async function showSkill(name: string, options: { content?: boolean; validate?: boolean; fix?: boolean }) {
  // If --validate is specified, run validation instead of show
  if (options.validate) {
    await validateSkills(name, { fix: options.fix });
    return;
  }

  try {
    const spinner = ora(`Loading skill "${name}"...`).start();

    const orchestrator = await CLIHelper.getOrchestrator();
    const agents = orchestrator.getAgents();

    if (agents.length === 0) {
      spinner.fail('No agents found');
      return;
    }

    const agent = agents[0];
    const skill = await agent.skills.get(name);

    if (!skill) {
      spinner.fail(`Skill "${name}" not found`);
      console.log(chalk.gray('\nRun "cw skills list" to see available skills\n'));
      return;
    }

    spinner.succeed(`Skill "${name}" loaded`);

    // Display skill information
    console.log(chalk.bold('\n━━━━━━━━━━━━━━━'));
    console.log(chalk.bold(`📚 ${skill.metadata.name}`));
    console.log(chalk.bold('━━━━━━━━━━━━━━━\n'));

    // Metadata
    console.log(chalk.cyan('Description:'));
    console.log(`  ${skill.metadata.description}\n`);

    console.log(chalk.cyan('Metadata:'));
    console.log(`  Version: ${chalk.gray(skill.metadata.version || 'N/A')}`);
    console.log(`  Author: ${chalk.gray(skill.metadata.author || 'N/A')}`);
    if (skill.metadata.tags && skill.metadata.tags.length > 0) {
      console.log(`  Tags: ${skill.metadata.tags.map(t => chalk.yellow(t)).join(', ')}`);
    }

    // Configuration
    console.log(chalk.cyan('\nConfiguration:'));
    console.log(`  Source: ${chalk.green(skill.config.source)}`);
    console.log(`  Type: ${chalk.gray(skill.config.type)}`);
    console.log(`  Priority: ${chalk.gray(skill.config.priority)}`);
    console.log(`  Enforcement: ${chalk.gray(skill.config.enforcement)}`);

    // Find skill location
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (homeDir) {
      const workflowDir = path.join(homeDir, '.claude-workflow');
      const possiblePaths = [
        { path: path.join(process.cwd(), '.claude/skills', name), label: 'Project' },
        { path: path.join(workflowDir, '.claude/skills/tech-stack', name), label: 'Tech-stack' },
        { path: path.join(workflowDir, '.claude/skills/universal', name), label: 'Universal' },
      ];

      for (const { path: skillPath, label } of possiblePaths) {
        if (await fs.pathExists(skillPath)) {
          console.log(chalk.cyan('\nLocation:'));
          console.log(`  ${chalk.gray(skillPath)} ${chalk.dim(`(${label})`)}`);

          // Check for resources directory
          const resourcesDir = path.join(skillPath, 'resources');
          if (await fs.pathExists(resourcesDir)) {
            const resources = await fs.readdir(resourcesDir);
            if (resources.length > 0) {
              console.log(chalk.cyan('\nResources:'));
              for (const resource of resources) {
                console.log(`  ${chalk.gray('•')} ${resource}`);
              }
            }
          }
          break;
        }
      }
    }

    // Show content if requested
    if (options.content) {
      console.log(chalk.cyan('\nContent:'));
      console.log(chalk.bold('━━━━━━━━━━━━━━━\n'));
      console.log(skill.content);
    } else {
      console.log(chalk.dim('\n💡 Use --content to show full SKILL.md content'));
    }

    console.log(chalk.bold('\n━━━━━━━━━━━━━━━\n'));
  } catch (error) {
    logger.error('Failed to show skill:', error);
    process.exit(1);
  }
}

/**
 * Add a skill from URL or local path
 */
async function addSkill(
  source: string,
  options: {
    category?: 'universal' | 'tech-stack' | 'project';
    name?: string;
    dryRun?: boolean;
    force?: boolean;
    yes?: boolean;
    global?: boolean;
  }
) {
  const spinner = ora('Adding skill...').start();

  try {
    // 1. Parse source
    spinner.text = 'Parsing source...';
    const { type, url, skillName, skillPath, category: sourceCategory } = parseSource(source, options.name);

    spinner.text = `Downloading skill: ${skillName}`;

    // 2. Download/copy skill to temp directory
    const tempDir = path.join('/tmp', `cw-skill-${Date.now()}`);
    await downloadSkill(type, url, tempDir, spinner, skillPath);

    // 3. Validate skill
    spinner.text = 'Validating skill...';
    const actualSkillDir = await findSkillDir(tempDir, skillName);
    await validateSkill(actualSkillDir);

    // 4. Determine target directory
    // All sources (installed, GitHub, local, etc.) follow the same rule:
    // - Without --global: install to project directory (.claude/skills/)
    // - With --global: install to user directory (~/.claude/skills/)
    let targetDir: string;

    if (options.global) {
      // Install to user directory (~/.claude/skills/)
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      if (!homeDir) {
        throw new Error('Cannot determine home directory');
      }
      targetDir = path.join(homeDir, '.claude/skills', skillName);
      spinner.text = 'Installing to user directory...';
    } else {
      // Install to project directory (.claude/skills/)
      // This applies to ALL sources: installed, GitHub, local, etc.
      targetDir = path.join(process.cwd(), '.claude/skills', skillName);
      spinner.text = 'Installing to current project...';
    }

    // 4.5. Check for duplicates and handle them
    spinner.text = 'Checking for duplicates...';
    await handleDuplicateSkills(skillName, targetDir, options);

    // 5. Check if skill already exists at target
    if (await fs.pathExists(targetDir) && !options.force) {
      spinner.warn(`Skill '${skillName}' already exists`);
      console.log(chalk.yellow(`\n⚠️  Skill '${skillName}' already exists`));
      console.log(chalk.gray(`   Location: ${targetDir}\n`));
      console.log('Options:');
      console.log('  1. Use --force to overwrite');
      console.log('  2. Use --name to install with different name');
      console.log('  3. Remove existing: cw skills remove ' + skillName + '\n');
      await fs.remove(tempDir);
      return;
    }

    // 6. Dry run mode
    if (options.dryRun) {
      spinner.succeed('Preview complete');
      console.log(chalk.bold('\n📦 Skill Preview\n'));
      console.log(`  Name: ${chalk.cyan(skillName)}`);
      console.log(`  Source: ${chalk.gray(source)}`);
      console.log(`  Target: ${chalk.gray(targetDir)}`);
      if (options.global) {
        console.log(`  Location: ${chalk.green('User directory (~/.claude/skills/)')}`);
      } else {
        console.log(`  Location: ${chalk.green('Project directory (.claude/skills/)')}`);
      }
      console.log(chalk.yellow('\n💡 Run without --dry-run to install\n'));
      await fs.remove(tempDir);
      return;
    }

    // 7. Install skill
    spinner.text = `Installing to ${targetDir}`;
    await fs.ensureDir(path.dirname(targetDir));
    await fs.copy(actualSkillDir, targetDir);

    // 7.5. Update frontmatter name to match directory name
    const targetSkillMd = path.join(targetDir, 'SKILL.md');
    const skillContent = await fs.readFile(targetSkillMd, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(skillContent);

    // Update name in frontmatter
    frontmatter.name = skillName;

    // Reconstruct SKILL.md with updated frontmatter using js-yaml
    const updatedContent = `---\n${yaml.dump(frontmatter, { lineWidth: -1 }).trim()}\n---\n\n${body}`;

    await fs.writeFile(targetSkillMd, updatedContent, 'utf-8');

    // 7.6. Generate skill metadata
    spinner.text = 'Generating skill metadata...';
    const sourceType = type === 'github' ? 'github' :
                       type === 'local' ? 'local' :
                       type === 'installed' ? 'builtin' : 'custom';

    // Determine metadata category based on source
    let metadataCategory: 'universal' | 'tech-stack' | 'custom';
    if (type === 'installed' && sourceCategory) {
      // Use category from source path for installed skills
      metadataCategory = sourceCategory;
    } else {
      // All external sources (GitHub, local, etc.) are treated as custom
      metadataCategory = 'custom';
    }

    await generateSkillMetadata(targetDir, {
      name: skillName,
      source: sourceType,
      sourceUrl: type === 'github' ? url : undefined,
      category: metadataCategory,
      installedAt: new Date().toISOString(),
    });

    // 8. Update skill-rules.json (for both project and global installations)
    spinner.text = 'Updating skill-rules.json...';
    await updateSkillRules(process.cwd(), skillName, frontmatter);

    // 9. Clean up
    await fs.remove(tempDir);

    spinner.succeed(`Skill '${skillName}' added successfully!`);

    // 10. Display info
    console.log(chalk.bold('\n✅ Installation Complete\n'));
    console.log(`  Name: ${chalk.cyan(skillName)}`);
    if (options.global) {
      console.log(`  Installed to: ${chalk.green('User directory')}`);
      console.log(`  Location: ${chalk.gray(targetDir)}`);
      console.log(chalk.bold('\n💡 Skill is now available globally!'));
      console.log(chalk.dim('   Use "cw skills sync ' + skillName + '" to sync to global custom directory.\n'));
    } else {
      console.log(`  Installed to: ${chalk.green('Current project')}`);
      console.log(`  Location: ${chalk.gray(targetDir)}`);
      console.log(chalk.bold('\n💡 Skill is now available in this project!'));
      console.log(chalk.dim('   The skill will be recommended by hooks when relevant.\n'));
    }

  } catch (error) {
    spinner.fail('Failed to add skill');

    // Show user-friendly error message without stack trace
    if (error instanceof Error) {
      console.error(chalk.red(`\n${error.message}\n`));
    } else {
      console.error(chalk.red('\nAn unknown error occurred\n'));
    }

    process.exit(1);
  }
}

/**
 * Find skill directory in temp directory
 */
async function findSkillDir(tempDir: string, skillName: string): Promise<string> {
  // Check if skill is directly in tempDir
  const directPath = path.join(tempDir, 'SKILL.md');
  if (await fs.pathExists(directPath)) {
    return tempDir;
  }

  // Check if skill is in a subdirectory with the skill name
  const namedPath = path.join(tempDir, skillName);
  if (await fs.pathExists(namedPath)) {
    const namedSkillMd = path.join(namedPath, 'SKILL.md');
    if (await fs.pathExists(namedSkillMd)) {
      return namedPath;
    }
  }

  // Check all subdirectories for SKILL.md
  const entries = await fs.readdir(tempDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillMd = path.join(tempDir, entry.name, 'SKILL.md');
      if (await fs.pathExists(skillMd)) {
        return path.join(tempDir, entry.name);
      }
    }
  }

  throw new Error('Could not find SKILL.md in downloaded content');
}

/**
 * Handle duplicate skills across different locations
 * When duplicates are found, prompts user to remove old versions before installing
 *
 * Note: Only checks project and user directories, NOT global directories
 * (global directories are the source, not a conflict)
 */
async function handleDuplicateSkills(
  skillName: string,
  targetDir: string,
  options: { yes?: boolean; force?: boolean }
): Promise<void> {
  // 1. Get possible skill locations (only project and user, NOT global)
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) return;

  const possibleLocations = [
    { path: path.join(process.cwd(), '.claude/skills', skillName), label: 'Project', type: 'project' },
    { path: path.join(homeDir, '.claude/skills', skillName), label: 'User', type: 'user' },
  ];

  // 2. Find all existing locations (excluding target)
  const existingLocations = [];
  for (const location of possibleLocations) {
    // Normalize paths for comparison
    const normalizedTarget = path.normalize(targetDir);
    const normalizedLocation = path.normalize(location.path);

    if (normalizedTarget !== normalizedLocation && await fs.pathExists(location.path)) {
      existingLocations.push(location);
    }
  }

  // 3. If no duplicates, return early
  if (existingLocations.length === 0) {
    return;
  }

  // 4. Determine target type
  const normalizedTarget = path.normalize(targetDir);
  let targetType = 'unknown';
  for (const location of possibleLocations) {
    if (path.normalize(location.path) === normalizedTarget) {
      targetType = location.type;
      break;
    }
  }

  // 5. Handle duplicates based on options
  if (!options.yes) {
    console.log(chalk.yellow(`\n⚠️  Skill '${skillName}' already exists in ${existingLocations.length} other location(s):\n`));
    for (const location of existingLocations) {
      console.log(`  • ${chalk.cyan(location.label)}: ${chalk.gray(location.path)}`);
    }
    console.log();
    console.log(chalk.dim('💡 To avoid conflicts, it\'s recommended to remove old versions.\n'));

    const inquirer = (await import('inquirer')).default;
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Remove old versions and continue installation (Recommended)', value: 'remove' },
          { name: 'Cancel installation', value: 'cancel' },
        ],
        default: 'remove',
      },
    ]);

    if (action === 'cancel') {
      throw new Error('Installation cancelled by user');
    }

    if (action === 'remove') {
      console.log();
      // Remove duplicates
      for (const location of existingLocations) {
        try {
          await fs.remove(location.path);
          console.log(chalk.green(`  ✓ Removed ${location.label}: ${chalk.gray(location.path)}`));

          // If removing from project, also update skill-rules.json
          if (location.type === 'project') {
            await removeFromSkillRules(process.cwd(), skillName);
          }
        } catch (error) {
          console.log(chalk.red(`  ✗ Failed to remove ${location.label}: ${error}`));
        }
      }
      console.log();
    }
  } else {
    // Auto-remove duplicates when --yes is used
    for (const location of existingLocations) {
      try {
        await fs.remove(location.path);

        // If removing from project, also update skill-rules.json
        if (location.type === 'project') {
          await removeFromSkillRules(process.cwd(), skillName);
        }
      } catch (error) {
        logger.warn(`Failed to remove duplicate at ${location.path}:`, error);
      }
    }
  }
}

/**
 * Detect skill category from file path
 */
function detectCategoryFromPath(skillPath: string): 'universal' | 'tech-stack' | 'custom' {
  if (skillPath.includes('/universal/') || skillPath.includes('\\universal\\')) {
    return 'universal';
  }
  if (skillPath.includes('/tech-stack/') || skillPath.includes('\\tech-stack\\')) {
    return 'tech-stack';
  }
  if (skillPath.includes('/custom/') || skillPath.includes('\\custom\\')) {
    return 'custom';
  }
  // User's ~/.claude/skills/ directory is treated as custom
  if (skillPath.includes('/.claude/skills/') || skillPath.includes('\\.claude\\skills\\')) {
    return 'custom';
  }
  // Default to custom for user-defined skills
  return 'custom';
}

/**
 * Parse source string to determine type and URL
 */
function parseSource(source: string, customName?: string): {
  type: 'github' | 'gist' | 'local' | 'installed';
  url: string;
  skillName: string;
  skillPath?: string;
  category?: 'universal' | 'tech-stack' | 'custom';
} {
  // Check if source is an installed skill name (no path separators, no protocol)
  if (!source.includes('/') && !source.includes('\\') && !source.includes(':')) {
    // This looks like a skill name, check if it exists in global or project skills
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      throw new Error('Cannot determine home directory');
    }
    const workflowDir = path.join(homeDir, '.claude-workflow');
    const projectDir = process.cwd();

    // Check in project, universal, tech-stack, custom, user directory, and plugins
    const possiblePaths = [
      path.join(projectDir, '.claude/skills', source),
      path.join(workflowDir, 'skills/universal', source),
      path.join(workflowDir, 'skills/tech-stack', source),
      path.join(workflowDir, 'skills/custom', source),
      path.join(homeDir, '.claude/skills', source),  // User's manual installations
    ];

    // Also check plugin directories
    const pluginDir = path.join(homeDir, '.claude/plugins');
    if (fs.existsSync(pluginDir)) {
      const installedPluginsPath = path.join(pluginDir, 'installed_plugins.json');
      if (fs.existsSync(installedPluginsPath)) {
        try {
          const pluginsData = fs.readJSONSync(installedPluginsPath);
          if (pluginsData.plugins) {
            for (const [, installations] of Object.entries(pluginsData.plugins)) {
              if (!Array.isArray(installations)) continue;
              for (const installation of installations as any[]) {
                const installPath = installation.installPath;
                if (installPath) {
                  const pluginSkillPath = path.join(installPath, 'skills', source);
                  if (fs.existsSync(pluginSkillPath)) {
                    possiblePaths.push(pluginSkillPath);
                  }
                }
              }
            }
          }
        } catch (error) {
          // Ignore plugin parsing errors
        }
      }
    }

    for (const skillPath of possiblePaths) {
      if (fs.existsSync(skillPath)) {
        return {
          type: 'installed',
          url: skillPath,
          skillName: customName || source,
          category: detectCategoryFromPath(skillPath),
        };
      }
    }

    // If not found, show helpful error
    throw new Error(
      `Skill '${source}' not found in installed skills.\n\n` +
      `Supported formats:\n` +
      `  - Installed skill name: code-review\n` +
      `  - GitHub: github:user/repo/skill-name\n` +
      `  - GitHub URL: https://github.com/user/repo\n` +
      `  - Local path: /path/to/skill`
    );
  }

  // GitHub shorthand: github:user/repo/skill-name
  if (source.startsWith('github:')) {
    const parts = source.replace('github:', '').split('/');
    if (parts.length < 2) {
      throw new Error('Invalid GitHub source format. Use: github:user/repo or github:user/repo/skill-name');
    }
    const [user, repo, ...skillParts] = parts;
    const skillName = customName || (skillParts.length > 0 ? skillParts.join('/') : repo);
    const skillPath = skillParts.length > 0 ? skillParts.join('/') : undefined;
    return {
      type: 'github',
      url: `https://github.com/${user}/${repo}`,
      skillName,
      skillPath,
    };
  }

  // GitHub URL: https://github.com/user/repo/...
  if (source.startsWith('https://github.com/')) {
    const match = source.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL');
    }
    const [, user, repo] = match;
    const skillName = customName || path.basename(source);
    return {
      type: 'github',
      url: `https://github.com/${user}/${repo}`,
      skillName,
    };
  }

  // Gist URL: https://gist.github.com/user/gist-id
  if (source.startsWith('https://gist.github.com/')) {
    const match = source.match(/gist\.github\.com\/[^\/]+\/([^\/]+)/);
    if (!match) {
      throw new Error('Invalid Gist URL');
    }
    const gistId = match[1];
    if (!customName) {
      throw new Error('Gist source requires --name option');
    }
    return {
      type: 'gist',
      url: source,
      skillName: customName,
    };
  }

  // Local path
  const resolvedPath = path.resolve(source);
  if (fs.existsSync(resolvedPath)) {
    return {
      type: 'local',
      url: resolvedPath,
      skillName: customName || path.basename(resolvedPath),
    };
  }

  throw new Error(`Invalid source: ${source}\nSupported formats:\n  - github:user/repo/skill-name\n  - https://github.com/user/repo/...\n  - /path/to/local/skill`);
}

/**
 * Download skill from source
 */
async function downloadSkill(
  type: 'github' | 'gist' | 'local' | 'installed',
  url: string,
  tempDir: string,
  spinner: ora.Ora,
  skillPath?: string
) {
  await fs.ensureDir(tempDir);

  switch (type) {
    case 'installed':
      // Copy from installed skill
      spinner.text = 'Copying from installed skill...';
      await fs.copy(url, tempDir);
      break;

    case 'github':
      // Clone the repository
      spinner.text = 'Cloning from GitHub...';
      try {
        const repoDir = path.join(tempDir, 'repo');
        execSync(`git clone --depth 1 "${url}" "${repoDir}"`, {
          stdio: 'ignore',
        });

        // If skillPath is specified, look for that specific skill
        if (skillPath) {
          const specificSkillDir = path.join(repoDir, '.claude/skills', skillPath);
          if (await fs.pathExists(specificSkillDir)) {
            await fs.copy(specificSkillDir, path.join(tempDir, skillPath));
            await fs.remove(repoDir);
            return;
          }
        }

        // Find .claude/skills directory
        const skillsDir = path.join(repoDir, '.claude/skills');
        if (await fs.pathExists(skillsDir)) {
          // List all skills in the directory
          const skills = await fs.readdir(skillsDir, { withFileTypes: true });

          // Copy all skill directories to temp root
          for (const skill of skills) {
            if (skill.isDirectory()) {
              const sourcePath = path.join(skillsDir, skill.name);
              const targetPath = path.join(tempDir, skill.name);
              await fs.copy(sourcePath, targetPath);
            }
          }
        } else {
          // No .claude/skills directory, maybe the whole repo is a skill?
          // Check if SKILL.md exists in repo root
          const skillMd = path.join(repoDir, 'SKILL.md');
          if (await fs.pathExists(skillMd)) {
            // Copy entire repo as skill
            const files = await fs.readdir(repoDir);
            for (const file of files) {
              if (file !== '.git') {
                await fs.copy(
                  path.join(repoDir, file),
                  path.join(tempDir, file)
                );
              }
            }
          }
        }

        // Clean up repo
        await fs.remove(repoDir);
      } catch (error) {
        throw new Error(`Failed to clone from GitHub: ${error}`);
      }
      break;

    case 'gist':
      // Clone gist
      spinner.text = 'Cloning from Gist...';
      try {
        execSync(`git clone "${url}" "${tempDir}"`, {
          stdio: 'ignore',
        });
        // Remove .git directory
        await fs.remove(path.join(tempDir, '.git'));
      } catch (error) {
        throw new Error(`Failed to clone from Gist: ${error}`);
      }
      break;

    case 'local':
      // Copy from local path
      spinner.text = 'Copying from local path...';
      await fs.copy(url, tempDir);
      break;

    default:
      throw new Error(`Unsupported source type: ${type}`);
  }
}

/**
 * Validate skill structure
 */
async function validateSkill(skillDir: string) {
  const skillMd = path.join(skillDir, 'SKILL.md');
  if (!await fs.pathExists(skillMd)) {
    throw new Error('Invalid skill: SKILL.md not found');
  }

  // Validate frontmatter
  const content = await fs.readFile(skillMd, 'utf-8');
  const { frontmatter } = parseFrontmatter(content);

  if (!frontmatter.name || !frontmatter.description) {
    throw new Error('Invalid skill: SKILL.md must have name and description in frontmatter');
  }
}

/**
 * Detect skill category from content
 */
async function detectCategory(skillDir: string): Promise<'universal' | 'tech-stack' | 'project'> {
  const skillMd = path.join(skillDir, 'SKILL.md');
  const content = await fs.readFile(skillMd, 'utf-8');
  const lowerContent = content.toLowerCase();

  // Tech-stack keywords
  const techStackKeywords = [
    'node.js', 'nodejs', 'express', 'fastify',
    'python', 'django', 'flask', 'fastapi',
    'react', 'vue', 'angular', 'svelte',
    'rust', 'cargo',
    'go', 'golang',
    'java', 'spring',
    'typescript', 'javascript',
  ];

  // Project keywords
  const projectKeywords = [
    'team convention', 'business logic', 'deployment',
    'company', 'organization', 'internal',
  ];

  // Check for tech-stack
  for (const keyword of techStackKeywords) {
    if (lowerContent.includes(keyword)) {
      return 'tech-stack';
    }
  }

  // Check for project
  for (const keyword of projectKeywords) {
    if (lowerContent.includes(keyword)) {
      return 'project';
    }
  }

  // Default to universal
  return 'universal';
}

/**
 * Get target directory for skill
 */
function getTargetDir(category: string, skillName: string): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    throw new Error('Cannot determine home directory');
  }

  const workflowDir = path.join(homeDir, '.claude-workflow');

  switch (category) {
    case 'universal':
      return path.join(workflowDir, '.claude/skills/universal', skillName);

    case 'tech-stack':
      return path.join(workflowDir, '.claude/skills/tech-stack', skillName);

    case 'project':
      return path.join(process.cwd(), '.claude/skills', skillName);

    default:
      throw new Error(`Invalid category: ${category}`);
  }
}

/**
 * Update skill-rules.json with new skill configuration
 */
async function updateSkillRules(
  projectDir: string,
  skillName: string,
  frontmatter: any
): Promise<void> {
  const rulesPath = path.join(projectDir, '.claude/skills/skill-rules.json');

  // Read existing rules or create new
  let rules: any;
  if (await fs.pathExists(rulesPath)) {
    rules = await fs.readJSON(rulesPath);
  } else {
    rules = {
      version: '1.0',
      skills: {}
    };
  }

  // Extract configuration from frontmatter
  const skillConfig: any = {
    type: frontmatter.type || 'domain',
    enforcement: frontmatter.enforcement || 'suggest',
    priority: frontmatter.priority || 'medium',
  };

  // Add description if available
  if (frontmatter.description) {
    skillConfig.description = frontmatter.description;
  }

  // Add promptTriggers only if keywords or intentPatterns exist
  const hasKeywords = frontmatter.keywords && (
    Array.isArray(frontmatter.keywords) ? frontmatter.keywords.length > 0 : true
  );
  const hasIntentPatterns = frontmatter.intentPatterns && (
    Array.isArray(frontmatter.intentPatterns) ? frontmatter.intentPatterns.length > 0 : true
  );

  if (hasKeywords || hasIntentPatterns) {
    skillConfig.promptTriggers = {};

    if (hasKeywords) {
      skillConfig.promptTriggers.keywords = Array.isArray(frontmatter.keywords)
        ? frontmatter.keywords
        : [frontmatter.keywords];
    }

    if (hasIntentPatterns) {
      skillConfig.promptTriggers.intentPatterns = Array.isArray(frontmatter.intentPatterns)
        ? frontmatter.intentPatterns
        : [frontmatter.intentPatterns];
    }
  }

  // Add fileTriggers only if path or content patterns exist
  const hasPathPatterns = frontmatter.pathPatterns && (
    Array.isArray(frontmatter.pathPatterns) ? frontmatter.pathPatterns.length > 0 : true
  );
  const hasContentPatterns = frontmatter.contentPatterns && (
    Array.isArray(frontmatter.contentPatterns) ? frontmatter.contentPatterns.length > 0 : true
  );
  const hasPathExclusions = frontmatter.pathExclusions && (
    Array.isArray(frontmatter.pathExclusions) ? frontmatter.pathExclusions.length > 0 : true
  );

  if (hasPathPatterns || hasContentPatterns || hasPathExclusions) {
    skillConfig.fileTriggers = {};

    if (hasPathPatterns) {
      skillConfig.fileTriggers.pathPatterns = Array.isArray(frontmatter.pathPatterns)
        ? frontmatter.pathPatterns
        : [frontmatter.pathPatterns];
    }

    if (hasPathExclusions) {
      skillConfig.fileTriggers.pathExclusions = Array.isArray(frontmatter.pathExclusions)
        ? frontmatter.pathExclusions
        : [frontmatter.pathExclusions];
    }

    if (hasContentPatterns) {
      skillConfig.fileTriggers.contentPatterns = Array.isArray(frontmatter.contentPatterns)
        ? frontmatter.contentPatterns
        : [frontmatter.contentPatterns];
    }
  }

  // Add optional fields if present
  if (frontmatter.blockMessage) {
    skillConfig.blockMessage = frontmatter.blockMessage;
  }

  if (frontmatter.skipConditions) {
    skillConfig.skipConditions = frontmatter.skipConditions;
  }

  // Add skill to rules
  rules.skills[skillName] = skillConfig;

  // Write back to file
  await fs.writeJSON(rulesPath, rules, { spaces: 2 });
}

/**
 * Remove skill configuration from skill-rules.json
 */
async function removeFromSkillRules(
  projectDir: string,
  skillName: string
): Promise<void> {
  const rulesPath = path.join(projectDir, '.claude/skills/skill-rules.json');

  // Check if rules file exists
  if (!await fs.pathExists(rulesPath)) {
    // No rules file, nothing to remove
    return;
  }

  // Read existing rules
  const rules = await fs.readJSON(rulesPath);

  // Remove skill if it exists
  if (rules.skills && rules.skills[skillName]) {
    delete rules.skills[skillName];

    // Write back to file
    await fs.writeJSON(rulesPath, rules, { spaces: 2 });
  }
}

/**
 * Lint skills for 500-line rule compliance
 */
async function lintSkills(options: { fix?: boolean } = {}) {
  try {
    const spinner = ora('Checking skills for 500-line rule compliance...').start();

    const projectDir = process.cwd();
    const skillsDir = path.join(projectDir, '.claude/skills');

    if (!await fs.pathExists(skillsDir)) {
      spinner.fail('No .claude/skills directory found');
      console.log(chalk.yellow('\n⚠️  No skills directory found in this project'));
      console.log(chalk.gray('   Run "cw init" to initialize the project\n'));
      return;
    }

    interface Violation {
      skill: string;
      file: string;
      lines: number;
      path: string;
    }

    const violations: Violation[] = [];
    const MAX_LINES = 500;

    // Recursively find all SKILL.md files and standalone .md files
    async function findSkillFiles(dir: string, relativePath: string = ''): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          await findSkillFiles(fullPath, relPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Skip skill-rules.json and other non-skill files
          if (entry.name === 'skill-rules.json') continue;

          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n').length;

          if (lines > MAX_LINES) {
            // Determine skill name from path
            let skillName: string;
            if (entry.name === 'SKILL.md') {
              // For SKILL.md files, use the parent directory name
              skillName = path.basename(path.dirname(fullPath));
            } else {
              // For standalone .md files, use the filename without extension
              skillName = entry.name.replace('.md', '');
            }

            violations.push({
              skill: skillName,
              file: relPath,
              lines: lines,
              path: fullPath,
            });
          }
        }
      }
    }

    spinner.text = 'Scanning for skills...';
    await findSkillFiles(skillsDir);

    spinner.stop();

    spinner.stop();

    // Display results
    console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold('📏 Skills Lint Report (500-line rule)'));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    if (violations.length === 0) {
      console.log(chalk.green('✅ All skills comply with the 500-line rule!\n'));
      console.log(chalk.gray(`   Checked ${skills.length} skills`));
      console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      return;
    }

    console.log(chalk.red(`❌ Found ${violations.length} violations:\n`));

    // Group violations by skill
    const violationsBySkill = new Map<string, Violation[]>();
    for (const violation of violations) {
      if (!violationsBySkill.has(violation.skill)) {
        violationsBySkill.set(violation.skill, []);
      }
      violationsBySkill.get(violation.skill)!.push(violation);
    }

    // Display violations
    for (const [skillName, skillViolations] of violationsBySkill) {
      console.log(chalk.yellow(`  ${skillName}:`));
      for (const violation of skillViolations) {
        const excess = violation.lines - MAX_LINES;
        console.log(`    ${chalk.red('✗')} ${violation.file}: ${chalk.bold(violation.lines)} lines ${chalk.gray(`(+${excess} over limit)`)}`);
        console.log(`      ${chalk.dim(violation.path)}`);
      }
      console.log();
    }

    // Show suggestions if --fix flag is used
    if (options.fix) {
      console.log(chalk.cyan('💡 Suggestions for fixing violations:\n'));
      console.log('  1. Split large files into smaller resources:');
      console.log('     - Move sections to resources/*.md files');
      console.log('     - Keep SKILL.md as a high-level overview');
      console.log('     - Reference resources from SKILL.md\n');
      console.log('  2. Apply Progressive Disclosure:');
      console.log('     - Start with essential information');
      console.log('     - Move details to separate resource files');
      console.log('     - Add navigation guide in SKILL.md\n');
      console.log('  3. Remove redundant content:');
      console.log('     - Eliminate duplicate information');
      console.log('     - Consolidate similar sections');
      console.log('     - Focus on actionable guidance\n');
    } else {
      console.log(chalk.dim('💡 Run with --fix to see suggestions for fixing violations\n'));
    }

    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    // Exit with error code if violations found
    process.exit(1);
  } catch (error) {
    logger.error('Failed to lint skills:', error);
    process.exit(1);
  }
}

// ============================================================================
// Skill Metadata Management
// ============================================================================

/**
 * Skill metadata interface
 */
interface SkillMetadata {
  name: string;
  source: 'builtin' | 'github' | 'local' | 'custom';
  sourceUrl?: string;
  version?: string;
  author?: string;
  category: 'universal' | 'tech-stack' | 'custom';
  installedAt: string;
  lastModified: string;
  checksum: string;
  customized: boolean;
  syncedAt?: string;
  syncedFrom?: string;
}

/**
 * Generate .skill-meta.json for a skill
 */
async function generateSkillMetadata(
  skillPath: string,
  metadata: {
    name: string;
    source: 'builtin' | 'github' | 'local' | 'custom';
    sourceUrl?: string;
    category: 'universal' | 'tech-stack' | 'custom';
    installedAt: string;
  }
): Promise<void> {
  try {
    // Read SKILL.md frontmatter
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    let frontmatter: any = {};

    if (await fs.pathExists(skillMdPath)) {
      const content = await fs.readFile(skillMdPath, 'utf-8');
      const parsed = parseFrontmatter(content);
      frontmatter = parsed.frontmatter;
    }

    // Calculate checksum
    const checksum = await calculateChecksum(skillPath);

    // Generate metadata
    const meta: SkillMetadata = {
      name: metadata.name,
      source: metadata.source,
      sourceUrl: metadata.sourceUrl,
      version: frontmatter.version || '1.0.0',
      author: frontmatter.author,
      category: metadata.category,
      installedAt: metadata.installedAt,
      lastModified: metadata.installedAt,
      checksum,
      customized: false,
    };

    // Write metadata file
    const metaPath = path.join(skillPath, '.skill-meta.json');
    await fs.writeJson(metaPath, meta, { spaces: 2 });
  } catch (error) {
    logger.warn(`Failed to generate metadata for skill at ${skillPath}:`, error);
  }
}

/**
 * Calculate checksum for a skill (based on SKILL.md content)
 */
async function calculateChecksum(skillPath: string): Promise<string> {
  try {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');

    // Read SKILL.md content
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    if (await fs.pathExists(skillMdPath)) {
      const content = await fs.readFile(skillMdPath, 'utf-8');
      hash.update(content);
    }

    return hash.digest('hex');
  } catch (error) {
    logger.warn(`Failed to calculate checksum for ${skillPath}:`, error);
    return '';
  }
}

/**
 * Check if a skill has local changes (compared to original checksum)
 */
async function checkLocalChanges(skillPath: string): Promise<boolean> {
  try {
    const metaPath = path.join(skillPath, '.skill-meta.json');

    if (!await fs.pathExists(metaPath)) {
      // No metadata, assume no changes (or old version)
      return false;
    }

    const meta: SkillMetadata = await fs.readJson(metaPath);

    // Calculate current checksum
    const currentChecksum = await calculateChecksum(skillPath);

    // Compare
    return currentChecksum !== meta.checksum;
  } catch (error) {
    logger.warn(`Failed to check local changes for ${skillPath}:`, error);
    return false;
  }
}

/**
 * Update skill metadata with new fields
 */
async function updateSkillMetadata(
  skillPath: string,
  updates: Partial<SkillMetadata>
): Promise<void> {
  try {
    const metaPath = path.join(skillPath, '.skill-meta.json');

    let meta: Partial<SkillMetadata> = {};
    if (await fs.pathExists(metaPath)) {
      meta = await fs.readJson(metaPath);
    }

    // Merge updates
    Object.assign(meta, updates);

    // Update lastModified
    meta.lastModified = new Date().toISOString();

    // If synced or category changed, mark as customized
    if (updates.syncedAt || updates.category) {
      meta.customized = true;
    }

    // Write back
    await fs.writeJson(metaPath, meta, { spaces: 2 });
  } catch (error) {
    logger.warn(`Failed to update metadata for ${skillPath}:`, error);
  }
}

// ============================================================================
// Skill Validation Command
// ============================================================================

/**
 * Validate skill frontmatter against skill-rules.json
 *
 * This command checks if SKILL.md frontmatter is consistent with skill-rules.json
 * and optionally fixes any inconsistencies.
 */
async function validateSkills(
  skillName: string,
  options: {
    fix?: boolean;
  } = {}
) {
  const spinner = ora('Validating skills...').start();

  try {
    const projectDir = process.cwd();
    const skillsDir = path.join(projectDir, '.claude/skills');
    const rulesPath = path.join(skillsDir, 'skill-rules.json');

    // Check if skill-rules.json exists
    if (!await fs.pathExists(rulesPath)) {
      spinner.fail('skill-rules.json not found');
      console.log(chalk.yellow('\n⚠️  No skill-rules.json found in this project'));
      console.log(chalk.gray('   Run "cw init" to initialize the project\n'));
      return;
    }

    // Read skill-rules.json
    const rules = await fs.readJSON(rulesPath);

    if (!rules.skills || Object.keys(rules.skills).length === 0) {
      spinner.fail('No skills found in skill-rules.json');
      return;
    }

    // Validate the specified skill
    if (!rules.skills[skillName]) {
      spinner.fail(`Skill '${skillName}' not found in skill-rules.json`);
      return;
    }

    const skillsToValidate = [skillName];

    spinner.text = `Validating skill '${skillName}'...`;

    interface ValidationIssue {
      skill: string;
      field: string;
      expected: any;
      actual: any;
      severity: 'error' | 'warning';
    }

    const issues: ValidationIssue[] = [];
    const fixedSkills: string[] = [];

    // Validate each skill
    for (const skill of skillsToValidate) {
      const skillPath = path.join(skillsDir, skill, 'SKILL.md');

      if (!await fs.pathExists(skillPath)) {
        issues.push({
          skill,
          field: 'SKILL.md',
          expected: 'exists',
          actual: 'missing',
          severity: 'error',
        });
        continue;
      }

      // Read SKILL.md
      const content = await fs.readFile(skillPath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      // Get expected config from skill-rules.json
      const expectedConfig = rules.skills[skill];

      // Check each field
      const fieldsToCheck = [
        { key: 'type', ruleKey: 'type' },
        { key: 'enforcement', ruleKey: 'enforcement' },
        { key: 'priority', ruleKey: 'priority' },
        { key: 'description', ruleKey: 'description' },
        { key: 'keywords', ruleKey: 'promptTriggers.keywords' },
        { key: 'intentPatterns', ruleKey: 'promptTriggers.intentPatterns' },
        { key: 'pathPatterns', ruleKey: 'fileTriggers.pathPatterns' },
        { key: 'contentPatterns', ruleKey: 'fileTriggers.contentPatterns' },
        { key: 'pathExclusions', ruleKey: 'fileTriggers.pathExclusions' },
      ];

      let hasIssues = false;

      for (const { key, ruleKey } of fieldsToCheck) {
        const actualValue = frontmatter[key];
        const expectedValue = getNestedValue(expectedConfig, ruleKey);

        // Skip if expected value doesn't exist
        if (expectedValue === undefined) continue;

        // Compare values
        if (!isEqual(actualValue, expectedValue)) {
          issues.push({
            skill,
            field: key,
            expected: expectedValue,
            actual: actualValue,
            severity: key === 'name' || key === 'description' ? 'error' : 'warning',
          });
          hasIssues = true;
        }
      }

      // Fix if requested
      if (hasIssues && options.fix) {
        // Update frontmatter with values from skill-rules.json
        const updatedFrontmatter = { ...frontmatter };

        // Update basic fields
        if (expectedConfig.type) updatedFrontmatter.type = expectedConfig.type;
        if (expectedConfig.enforcement) updatedFrontmatter.enforcement = expectedConfig.enforcement;
        if (expectedConfig.priority) updatedFrontmatter.priority = expectedConfig.priority;
        if (expectedConfig.description) updatedFrontmatter.description = expectedConfig.description;

        // Update trigger fields
        if (expectedConfig.promptTriggers?.keywords) {
          updatedFrontmatter.keywords = expectedConfig.promptTriggers.keywords;
        }
        if (expectedConfig.promptTriggers?.intentPatterns) {
          updatedFrontmatter.intentPatterns = expectedConfig.promptTriggers.intentPatterns;
        }
        if (expectedConfig.fileTriggers?.pathPatterns) {
          updatedFrontmatter.pathPatterns = expectedConfig.fileTriggers.pathPatterns;
        }
        if (expectedConfig.fileTriggers?.contentPatterns) {
          updatedFrontmatter.contentPatterns = expectedConfig.fileTriggers.contentPatterns;
        }
        if (expectedConfig.fileTriggers?.pathExclusions) {
          updatedFrontmatter.pathExclusions = expectedConfig.fileTriggers.pathExclusions;
        }

        // Reconstruct SKILL.md
        const updatedContent = `---\n${yaml.dump(updatedFrontmatter, { lineWidth: -1 }).trim()}\n---\n\n${body}`;
        await fs.writeFile(skillPath, updatedContent, 'utf-8');

        fixedSkills.push(skill);
      }
    }

    spinner.stop();

    // Display results
    console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold('🔍 Skill Validation Report'));
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    if (issues.length === 0) {
      console.log(chalk.green('✅ All skills are valid!\n'));
      console.log(chalk.gray(`   Validated ${skillsToValidate.length} skill(s)`));
      console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      return;
    }

    // Group issues by skill
    const issuesBySkill = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      if (!issuesBySkill.has(issue.skill)) {
        issuesBySkill.set(issue.skill, []);
      }
      issuesBySkill.get(issue.skill)!.push(issue);
    }

    // Display issues
    if (options.fix) {
      console.log(chalk.green(`✅ Fixed ${fixedSkills.length} skill(s):\n`));
      for (const skill of fixedSkills) {
        console.log(chalk.green(`  ✓ ${skill}`));
        const skillIssues = issuesBySkill.get(skill) || [];
        for (const issue of skillIssues) {
          console.log(chalk.gray(`    • ${issue.field}: ${formatValue(issue.actual)} → ${formatValue(issue.expected)}`));
        }
        console.log();
      }
    } else {
      console.log(chalk.yellow(`⚠️  Found ${issues.length} issue(s) in ${issuesBySkill.size} skill(s):\n`));

      for (const [skill, skillIssues] of issuesBySkill) {
        console.log(chalk.yellow(`  ${skill}:`));
        for (const issue of skillIssues) {
          const icon = issue.severity === 'error' ? chalk.red('✗') : chalk.yellow('⚠');
          console.log(`    ${icon} ${chalk.bold(issue.field)}`);
          console.log(`      Expected: ${chalk.green(formatValue(issue.expected))}`);
          console.log(`      Actual:   ${chalk.red(formatValue(issue.actual))}`);
        }
        console.log();
      }

      console.log(chalk.dim('💡 Run with --fix to automatically fix these issues\n'));
    }

    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    if (!options.fix && issues.length > 0) {
      process.exit(1);
    }

  } catch (error) {
    spinner.fail('Validation failed');
    logger.error('Validation error:', error);
    process.exit(1);
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Deep equality check for values
 */
function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => isEqual(val, b[idx]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => isEqual(a[key], b[key]));
  }
  return false;
}

/**
 * Format value for display
 */
function formatValue(value: any): string {
  if (value === undefined) return chalk.gray('undefined');
  if (value === null) return chalk.gray('null');
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length <= 3) return `[${value.join(', ')}]`;
    return `[${value.slice(0, 3).join(', ')}, ... (${value.length} items)]`;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ============================================================================
// Skill Sync Command
// ============================================================================

/**
 * Sync a skill from project/user directory to global directory
 *
 * Primary use case: Sync user skills (~/.claude/skills/) to custom category
 * This makes manually installed skills manageable by CW
 */
async function syncSkillToGlobal(
  skillName: string,
  options: {
    category?: 'universal' | 'tech-stack' | 'custom';
    force?: boolean;
  }
) {
  const spinner = ora(`Syncing skill '${skillName}'...`).start();

  try {
    // 1. Check if skill exists in project or user directory
    const projectSkillPath = path.join(process.cwd(), '.claude/skills', skillName);
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      throw new Error('Cannot determine home directory');
    }
    const userSkillPath = path.join(homeDir, '.claude/skills', skillName);

    let sourceSkillPath: string | null = null;
    let sourceType: 'project' | 'user' | null = null;

    if (await fs.pathExists(projectSkillPath)) {
      sourceSkillPath = projectSkillPath;
      sourceType = 'project';
    } else if (await fs.pathExists(userSkillPath)) {
      sourceSkillPath = userSkillPath;
      sourceType = 'user';
    }

    if (!sourceSkillPath || !sourceType) {
      spinner.fail(`Skill '${skillName}' not found in project or user directory`);
      console.log(chalk.gray(`\n   Locations checked:`));
      console.log(chalk.gray(`   - Project: ${projectSkillPath}`));
      console.log(chalk.gray(`   - User: ${userSkillPath}\n`));
      return;
    }

    spinner.text = `Found skill in ${sourceType} directory`;

    // 2. Read skill metadata
    let metadata: Partial<SkillMetadata> = {};
    const metaPath = path.join(sourceSkillPath, '.skill-meta.json');

    if (await fs.pathExists(metaPath)) {
      metadata = await fs.readJson(metaPath);
    }

    // 3. Determine target category (default to custom for user skills)
    const category = options.category || (metadata.category as 'universal' | 'tech-stack' | 'custom') || 'custom';

    // 4. Check if overriding builtin skill
    if ((category === 'universal' || category === 'tech-stack') && !options.force) {
      spinner.warn(`Syncing to '${category}' category`);

      console.log(chalk.yellow(`\n⚠️  Warning: This will override a builtin skill category`));
      console.log(chalk.gray('   Builtin skills may be overwritten by "cw update"\n'));

      const inquirer = (await import('inquirer')).default;
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Continue?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.gray('Cancelled\n'));
        return;
      }
    }

    // 5. Copy to global directory
    const globalPath = path.join(
      homeDir,
      '.claude-workflow/skills',
      category,
      skillName
    );

    // Ensure target directory exists
    await fs.ensureDir(path.dirname(globalPath));

    // Check if target exists
    if (await fs.pathExists(globalPath) && !options.force) {
      spinner.fail(`Skill '${skillName}' already exists in global ${category}`);
      console.log(chalk.yellow(`\n⚠️  Use --force to override\n`));
      return;
    }

    // Copy
    spinner.text = 'Copying skill files...';
    await fs.remove(globalPath);
    await fs.copy(sourceSkillPath, globalPath, {
      filter: (src) => {
        return !src.includes('node_modules') && !src.includes('.DS_Store');
      },
    });

    // 6. Update metadata
    spinner.text = 'Updating metadata...';
    await updateSkillMetadata(globalPath, {
      category,
      syncedAt: new Date().toISOString(),
      syncedFrom: sourceSkillPath,
    } as Partial<SkillMetadata>);

    spinner.succeed(`Skill '${skillName}' synced to global ${category}`);

    console.log(chalk.green('\n✅ Sync complete!'));
    console.log(chalk.gray(`   Source: ${sourceType === 'project' ? 'Project' : 'User'} (${sourceSkillPath})`));
    console.log(chalk.gray(`   Target: ${globalPath}`));
    console.log(chalk.gray(`   Category: ${category}\n`));

    if (category === 'custom') {
      console.log(chalk.cyan('💡 This skill will NOT be overwritten by "cw update"'));
      if (sourceType === 'user') {
        console.log(chalk.cyan('💡 You can now remove the user skill if desired:'));
        console.log(chalk.dim(`   rm -rf ${userSkillPath}`));
      }
    } else {
      console.log(chalk.yellow('⚠️  This skill MAY be overwritten by "cw update"'));
    }
    console.log();

  } catch (error) {
    spinner.fail('Failed to sync skill');
    logger.error('Sync error:', error);
    process.exit(1);
  }
}

// ============================================================================
// Keywords Management Command
// ============================================================================

/**
 * View keywords for a skill
 */
async function viewKeywords(skillName: string) {
  try {
    const spinner = ora(`Loading skill "${skillName}"...`).start();

    const orchestrator = await CLIHelper.getOrchestrator();
    const agents = orchestrator.getAgents();

    if (agents.length === 0) {
      spinner.fail('No agents found');
      return;
    }

    const agent = agents[0];
    const skill = await agent.skills.get(skillName);

    if (!skill) {
      spinner.fail(`Skill "${skillName}" not found`);
      console.log(chalk.gray('\nRun "cw skills list" to see available skills\n'));
      return;
    }

    // Get skill status to check if installed
    const status = await agent.skills.getSkillStatus(skillName);

    spinner.succeed(`Skill "${skillName}" loaded`);

    // Display skill keywords
    console.log(chalk.bold('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold(`📚 Skill: ${skillName}`));

    // Show location
    if (status.installed) {
      const locationLabel = status.location === 'project' ? 'Project' :
                           status.location === 'user' ? 'User' :
                           status.location === 'both' ? 'Project + User' : 'Unknown';
      console.log(chalk.gray(`Location: ${locationLabel}`));
    } else {
      console.log(chalk.gray(`Location: Global (${status.source || 'unknown'})`));
    }

    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    // Read SKILL.md to get keywords from frontmatter
    const skillPath = await findInstalledSkillPath(agent.skills, skillName);
    let keywords: string[] = [];
    let intentPatterns: string[] = [];

    if (skillPath) {
      const skillMdPath = path.join(skillPath, 'SKILL.md');
      if (await fs.pathExists(skillMdPath)) {
        const content = await fs.readFile(skillMdPath, 'utf-8');
        const { frontmatter } = parseFrontmatter(content);
        keywords = Array.isArray(frontmatter.keywords) ? frontmatter.keywords : [];
        intentPatterns = Array.isArray(frontmatter.intentPatterns) ? frontmatter.intentPatterns : [];
      }
    }

    // Display keywords
    console.log(chalk.cyan(`Keywords (${keywords.length}):`));
    if (keywords.length > 0) {
      keywords.forEach(kw => console.log(`  ${chalk.green('•')} ${kw}`));
    } else {
      console.log(chalk.gray('  (No keywords defined)'));
    }
    console.log();

    // Display intent patterns
    console.log(chalk.cyan(`Intent Patterns (${intentPatterns.length}):`));
    if (intentPatterns.length > 0) {
      intentPatterns.forEach(pattern => console.log(`  ${chalk.yellow('•')} ${pattern}`));
    } else {
      console.log(chalk.gray('  (No intent patterns defined)'));
    }
    console.log();

    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

    // Show commands
    if (status.installed) {
      console.log(chalk.dim('💡 Commands:'));
      console.log(chalk.dim(`  cw skills keywords add ${skillName} "keyword1" "keyword2"`));
      console.log(chalk.dim(`  cw skills keywords remove ${skillName} "keyword1"`));
    } else {
      console.log(chalk.yellow('⚠️  This skill is not installed. Install it first to modify keywords:'));
      console.log(chalk.dim(`  cw skills add ${skillName}`));
    }
    console.log(chalk.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  } catch (error) {
    logger.error('Failed to view keywords:', error);
    process.exit(1);
  }
}

/**
 * Manage keywords for a skill (add/remove)
 */
async function manageKeywords(
  skillName: string,
  options: {
    add?: string[];
    remove?: string[];
  }
) {
  const spinner = ora('Loading skill...').start();

  try {
    // 1. Get SkillManager
    const orchestrator = await CLIHelper.getOrchestrator();
    const agents = orchestrator.getAgents();

    if (agents.length === 0) {
      spinner.fail('No agents found');
      return;
    }

    const agent = agents[0];

    // 2. Check if skill exists
    const skill = await agent.skills.get(skillName);
    if (!skill) {
      spinner.fail(`Skill "${skillName}" not found`);
      console.log(chalk.gray('\nRun "cw skills list" to see available skills\n'));
      return;
    }

    // 3. Get skill status and check if installed
    const status = await agent.skills.getSkillStatus(skillName);
    if (!status.installed) {
      spinner.fail(`Skill "${skillName}" is not installed`);
      console.log(chalk.yellow('\n⚠️  Only installed skills can be modified'));
      console.log(chalk.dim(`   Install it first: cw skills add ${skillName}\n`));
      return;
    }

    // 4. Find skill path
    const skillPath = await findInstalledSkillPath(agent.skills, skillName);
    if (!skillPath) {
      spinner.fail(`Cannot find skill path for "${skillName}"`);
      return;
    }

    const skillMdPath = path.join(skillPath, 'SKILL.md');

    spinner.text = 'Reading SKILL.md...';

    // 5. Read and modify frontmatter
    const content = await fs.readFile(skillMdPath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    let keywords = Array.isArray(frontmatter.keywords)
      ? [...frontmatter.keywords]
      : [];

    const originalKeywords = [...keywords];

    if (options.add) {
      // Add keywords (deduplicate)
      keywords = [...new Set([...keywords, ...options.add])];
    }

    if (options.remove) {
      // Remove keywords
      keywords = keywords.filter(k => !options.remove.includes(k));
    }

    // Check if there are changes
    if (JSON.stringify(originalKeywords.sort()) === JSON.stringify(keywords.sort())) {
      spinner.info('No changes needed');
      console.log(chalk.gray('\nKeywords are already up to date\n'));
      return;
    }

    frontmatter.keywords = keywords;

    spinner.text = 'Updating SKILL.md...';

    // 6. Write back to SKILL.md
    const updatedContent = `---\n${yaml.dump(frontmatter, { lineWidth: -1 }).trim()}\n---\n\n${body}`;
    await fs.writeFile(skillMdPath, updatedContent, 'utf-8');

    spinner.text = 'Updating skill-rules.json...';

    // 7. Sync to project's skill-rules.json
    await updateSkillRules(process.cwd(), skillName, frontmatter);

    spinner.succeed('Keywords updated successfully!');

    // 8. Display results
    console.log(chalk.green(`\n✅ Updated keywords for skill "${skillName}"`));

    const locationLabel = status.location === 'project' ? 'Project' :
                         status.location === 'user' ? 'User' :
                         status.location === 'both' ? 'Project + User' : 'Unknown';
    console.log(chalk.gray(`   Location: ${locationLabel} (${skillPath})\n`));

    if (options.add && options.add.length > 0) {
      console.log(chalk.cyan('Added:'));
      options.add.forEach(kw => {
        if (!originalKeywords.includes(kw)) {
          console.log(`  ${chalk.green('+')} ${kw}`);
        }
      });
      console.log();
    }

    if (options.remove && options.remove.length > 0) {
      console.log(chalk.yellow('Removed:'));
      options.remove.forEach(kw => {
        if (originalKeywords.includes(kw)) {
          console.log(`  ${chalk.red('-')} ${kw}`);
        }
      });
      console.log();
    }

    console.log(chalk.dim('Current keywords:'));
    if (keywords.length > 0) {
      keywords.forEach(kw => console.log(chalk.dim(`  • ${kw}`)));
    } else {
      console.log(chalk.gray('  (No keywords)'));
    }
    console.log();

  } catch (error) {
    spinner.fail('Failed to update keywords');
    logger.error('Error:', error);
    process.exit(1);
  }
}

/**
 * Find the path of an installed skill (project or user directory)
 * Returns null if skill is not installed or only exists in global directory
 */
async function findInstalledSkillPath(
  skillManager: any,
  skillName: string
): Promise<string | null> {
  const status = await skillManager.getSkillStatus(skillName);

  // Only handle installed skills (project or user directory)
  if (!status.installed) {
    return null;
  }

  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    return null;
  }

  // Return path based on priority (project > user)
  if (status.location === 'project' || status.location === 'both') {
    // Project skill
    return path.join(process.cwd(), '.claude/skills', skillName);
  } else if (status.location === 'user') {
    // User skill
    return path.join(homeDir, '.claude/skills', skillName);
  }

  return null;
}

// Register keywords subcommand
const keywordsCommand = skillsCommand
  .command('keywords')
  .description('Manage skill keywords');

// View keywords
keywordsCommand
  .command('view <skill-name>')
  .alias('show')
  .description('View keywords for a skill')
  .action(viewKeywords);

// Add keywords
keywordsCommand
  .command('add <skill-name> <keywords...>')
  .description('Add keywords to a skill')
  .action(async (skillName: string, keywords: string[]) => {
    await manageKeywords(skillName, { add: keywords });
  });

// Remove keywords
keywordsCommand
  .command('remove <skill-name> <keywords...>')
  .description('Remove keywords from a skill')
  .action(async (skillName: string, keywords: string[]) => {
    await manageKeywords(skillName, { remove: keywords });
  });
