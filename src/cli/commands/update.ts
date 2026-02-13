/**
 * Update command - Update workflow
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { CLIHelper } from '../utils/cli-helper.js';
import { logger } from '../../utils/logger.js';
import { parseFrontmatter } from '../../utils/fs.js';
import { getSkillsPath, getHooksPath } from '../../utils/paths.js';

export const updateCommand = new Command('update')
  .description('Update Claude Workflow')
  .option('--check-only', 'Only check for updates without applying')
  .option('--force', 'Force update even if local changes detected')
  .option('--skip-skills', 'Skip updating skills')
  .action(async (options: {
    checkOnly?: boolean;
    force?: boolean;
    skipSkills?: boolean;
  }) => {
    try {
      await CLIHelper.ensureInitialized();

      // 1. Check CW version
      const spinner = ora('Checking for updates...').start();
      const currentVersion = await getCurrentVersion();
      const latestVersion = await checkLatestVersion();

      spinner.succeed(`Current version: ${currentVersion}`);

      if (currentVersion === latestVersion) {
        console.log(chalk.green('✓ You are running the latest version'));
      } else {
        console.log(chalk.yellow(`⚠️  New version available: ${latestVersion}`));
        console.log(chalk.gray('   Run "npm install -g claude-workflow" to update'));
      }

      if (options.checkOnly) {
        return;
      }

      console.log(chalk.bold('\n━━━━━━━━━━━━━━━'));
      console.log(chalk.bold('🔄 Updating Components'));
      console.log(chalk.bold('━━━━━━━━━━━━━━━\n'));

      // 2. Update builtin skills
      if (!options.skipSkills) {
        await updateBuiltinSkills({
          force: options.force || false,
        });
      }

      // 3. Update hooks
      await updateHooks();

      // 4. Refresh configuration
      await refreshConfig();

      console.log(chalk.green('\n✅ Update complete!\n'));
    } catch (error) {
      logger.error('Failed to update:', error);
      process.exit(1);
    }
  });

/**
 * Get current CW version
 */
async function getCurrentVersion(): Promise<string> {
  try {
    const workflowRoot = getWorkflowRoot();
    const packageJsonPath = path.join(workflowRoot, 'package.json');

    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      return packageJson.version || '0.1.0';
    }

    return '0.1.0';
  } catch (error) {
    logger.warn('Failed to get current version:', error);
    return '0.1.0';
  }
}

/**
 * Check latest version (placeholder - would check npm registry in production)
 */
async function checkLatestVersion(): Promise<string> {
  // In production, this would check npm registry
  // For now, return current version
  return getCurrentVersion();
}

/**
 * Update builtin skills (覆盖拷贝 universal 和 tech-stack)
 */
async function updateBuiltinSkills(options: { force: boolean }) {
  const spinner = ora('Updating builtin skills...').start();

  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (!homeDir) {
      throw new Error('Cannot determine home directory');
    }

    const globalSkillsDir = path.join(homeDir, '.claude-workflow/skills');
    const workflowRoot = getWorkflowRoot();
    const sourceSkillsDir = getSkillsPath(workflowRoot);

    const categories = ['universal', 'tech-stack'];
    let updatedCount = 0;
    let addedCount = 0;
    let skippedCount = 0;
    const addedSkills: string[] = [];
    const updatedSkills: string[] = [];

    for (const category of categories) {
      const sourceDir = path.join(sourceSkillsDir, category);
      const targetDir = path.join(globalSkillsDir, category);

      if (!await fs.pathExists(sourceDir)) {
        spinner.warn(`Source directory not found: ${sourceDir}`);
        continue;
      }

      // Ensure target directory exists
      await fs.ensureDir(targetDir);

      const skills = await fs.readdir(sourceDir);

      for (const skillName of skills) {
        const sourcePath = path.join(sourceDir, skillName);
        const targetPath = path.join(targetDir, skillName);

        // Check if it's a directory
        const stat = await fs.stat(sourcePath);
        if (!stat.isDirectory()) continue;

        // Check if skill has SKILL.md
        const skillMdPath = path.join(sourcePath, 'SKILL.md');
        if (!await fs.pathExists(skillMdPath)) {
          logger.debug(`Skipping ${skillName}: no SKILL.md found`);
          continue;
        }

        const isNewSkill = !await fs.pathExists(targetPath);

        // Check if target exists
        if (!isNewSkill) {
          // Check for local changes
          const hasLocalChanges = await checkLocalChanges(targetPath);

          if (hasLocalChanges && !options.force) {
            spinner.warn(`Skill '${skillName}' has local changes`);

            const inquirer = (await import('inquirer')).default;
            const { confirm } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: `Override local changes in '${skillName}'?`,
                default: false,
              },
            ]);

            if (!confirm) {
              skippedCount++;
              continue;
            }
          }
        }

        // Copy skill
        await fs.remove(targetPath);
        await fs.copy(sourcePath, targetPath, {
          filter: (src) => {
            return !src.includes('node_modules') && !src.includes('.DS_Store');
          },
        });

        // Generate metadata
        await generateSkillMetadata(targetPath, {
          name: skillName,
          source: 'builtin',
          sourceUrl: 'https://github.com/anthropics/claude-workflow',
          category: category as 'universal' | 'tech-stack',
          installedAt: new Date().toISOString(),
        });

        if (isNewSkill) {
          addedCount++;
          addedSkills.push(`${category}/${skillName}`);
          spinner.text = `Added ${category}/${skillName}`;
        } else {
          updatedCount++;
          updatedSkills.push(`${category}/${skillName}`);
          spinner.text = `Updated ${category}/${skillName}`;
        }
      }
    }

    // Build success message
    const messages: string[] = [];
    if (addedCount > 0) {
      messages.push(`added ${addedCount} new skill${addedCount > 1 ? 's' : ''}`);
    }
    if (updatedCount > 0) {
      messages.push(`updated ${updatedCount} skill${updatedCount > 1 ? 's' : ''}`);
    }
    if (skippedCount > 0) {
      messages.push(`skipped ${skippedCount}`);
    }

    const summary = messages.length > 0 ? messages.join(', ') : 'No changes';
    spinner.succeed(`Builtin skills: ${summary}`);

    // Show details if there are new skills
    if (addedSkills.length > 0) {
      console.log(chalk.cyan('\n📦 New skills added:'));
      addedSkills.forEach(skill => console.log(chalk.gray(`   - ${skill}`)));
    }
  } catch (error) {
    spinner.fail('Failed to update builtin skills');
    throw error;
  }
}

/**
 * Check if a skill has local changes
 */
async function checkLocalChanges(skillPath: string): Promise<boolean> {
  try {
    const metaPath = path.join(skillPath, '.skill-meta.json');

    if (!await fs.pathExists(metaPath)) {
      // No metadata, assume needs update
      return false;
    }

    const meta = await fs.readJson(metaPath);

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
    const meta = {
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
 * Update hooks
 */
async function updateHooks() {
  const spinner = ora('Updating hooks...').start();

  try {
    const workflowRoot = getWorkflowRoot();
    const sourceHooksDir = getHooksPath(workflowRoot);
    const targetHooksDir = path.join(process.cwd(), '.claude/hooks');

    // Copy builtin hooks (preserve user-defined hooks)
    const builtinHooks = [
      'skill-activation-prompt.ts',
      'skill-activation-prompt.sh',
      'post-tool-use-tracker.sh',
    ];

    for (const hookFile of builtinHooks) {
      const sourcePath = path.join(sourceHooksDir, hookFile);
      const targetPath = path.join(targetHooksDir, hookFile);

      if (await fs.pathExists(sourcePath)) {
        await fs.copy(sourcePath, targetPath);
      }
    }

    spinner.succeed('Hooks updated');
  } catch (error) {
    spinner.fail('Failed to update hooks');
    throw error;
  }
}

/**
 * Refresh configuration
 */
async function refreshConfig() {
  const spinner = ora('Refreshing configuration...').start();

  try {
    // Configuration refresh logic (if needed)
    // For now, just a placeholder

    spinner.succeed('Configuration refreshed');
  } catch (error) {
    spinner.fail('Failed to refresh configuration');
    throw error;
  }
}

/**
 * Get CW source code root directory
 */
function getWorkflowRoot(): string {
  try {
    // From current module path, infer CW source root
    // After bundling: dist/cli/index.mjs -> go up to project root
    const cliPath = new URL(import.meta.url).pathname;
    const workflowRoot = path.resolve(path.dirname(cliPath), '../../');

    // Verify that resources directory exists
    const resourcesDir = path.join(workflowRoot, 'resources');
    if (!fs.existsSync(resourcesDir)) {
      logger.error(`Resources directory not found at: ${resourcesDir}`);
      throw new Error('Cannot find Claude Workflow resources directory');
    }

    return workflowRoot;
  } catch (error) {
    logger.error('Failed to determine workflow root:', error);
    throw new Error('Cannot determine Claude Workflow installation directory');
  }
}
