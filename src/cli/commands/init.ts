/**
 * Init command - Initialize Claude Workflow in a project
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../../utils/logger.js';
import { detectProject } from '../utils/detect.js';
import { parseFrontmatter } from '../../utils/fs.js';
import {
  loadTemplate,
  parseClaudeMd,
  mergeClaudeMd,
  getPresetVersion,
} from '../../utils/claude-md-manager.js';
import {
  getSkillsPath,
  getHooksPath,
  getCommandsPath,
  getAgentsPath,
  getDevDocsPath,
  UNIVERSAL_SKILLS_DIR,
  TECH_STACK_SKILLS_DIR,
} from '../../utils/paths.js';

export const initCommand = new Command('init')
  .description('Initialize Claude Workflow in the current directory')
  .option('-t, --template <name>', 'Use a template')
  .option('-m, --mode <mode>', 'Workflow mode (single-agent or multi-agent)', 'single-agent')
  .option('-y, --yes', 'Skip prompts and use defaults (non-interactive mode)')
  .action(async (options) => {
    try {
      console.log(chalk.bold('\n👋 Welcome to Claude Workflow!\n'));

      const cwd = process.cwd();
      const claudeDir = path.join(cwd, '.claude');

      // Check if already initialized
      if (await fs.pathExists(claudeDir)) {
        if (options.yes) {
          // Non-interactive mode: reinitialize
          const backupDir = path.join(cwd, `.claude.backup.${Date.now()}`);
          await fs.move(claudeDir, backupDir);
          logger.info(`Backed up existing config to ${backupDir}`);
        } else {
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: '⚠️  Already initialized. What would you like to do?',
              choices: [
                { name: '🔄 Reinitialize', value: 'reinit' },
                { name: '📊 Show status', value: 'status' },
                { name: '❌ Cancel', value: 'cancel' },
              ],
            },
          ]);

          if (action === 'cancel') {
            return;
          }

          if (action === 'status') {
            // TODO: Show status
            logger.info('Status command not implemented yet');
            return;
          }

          // Reinitialize - backup existing config
          const backupDir = path.join(cwd, `.claude.backup.${Date.now()}`);
          await fs.move(claudeDir, backupDir);
          logger.info(`Backed up existing config to ${backupDir}`);
        }
      }

      // Detect project
      const spinner = ora('Detecting project...').start();
      const projectInfo = await detectProject(cwd);
      spinner.succeed('Project detected');

      console.log(chalk.cyan('\n📂 Detected project:'));
      console.log(`  - Language: ${projectInfo.language || 'Unknown'}`);
      console.log(`  - Framework: ${projectInfo.framework || 'None'}`);
      console.log(`  - Package manager: ${projectInfo.packageManager || 'None'}`);

      let selectedSkills: string[] = [];
      const globalSkills = await getGlobalSkills();

      if (options.yes) {
        // Non-interactive mode: use recommended skills
        const recommended = await getRecommendedSkills(projectInfo);

        // Separate project and global skills
        const projectSkills = recommended.filter(skill => !globalSkills.includes(skill));
        const usingGlobal = recommended.filter(skill => globalSkills.includes(skill));

        selectedSkills = recommended; // Include all (both project and global)

        console.log(chalk.cyan('\n✅ Auto-detected configuration:'));
        if (projectSkills.length > 0) {
          console.log(`  Project skills: ${projectSkills.join(', ')}`);
        }
        if (usingGlobal.length > 0) {
          console.log(chalk.gray(`  Using global skills: ${usingGlobal.join(', ')}`));
        }
      } else {
        // Choose setup mode
        const { setupMode } = await inquirer.prompt([
          {
            type: 'list',
            name: 'setupMode',
            message: '\n🎨 Choose setup mode:',
            choices: [
              { name: '🌟 Quick Start (Recommended)', value: 'quick' },
              { name: '🛠️  Custom Setup', value: 'custom' },
            ],
          },
        ]);

        if (setupMode === 'quick') {
          // Auto-detect skills
          const recommended = await getRecommendedSkills(projectInfo);
          selectedSkills = recommended;

          // Separate project and global skills for display
          const projectSkills = recommended.filter(skill => !globalSkills.includes(skill));
          const usingGlobal = recommended.filter(skill => globalSkills.includes(skill));

          console.log(chalk.cyan('\n✅ Auto-detected configuration:'));
          if (projectSkills.length > 0) {
            console.log(`  Project skills: ${projectSkills.join(', ')}`);
          }
          if (usingGlobal.length > 0) {
            console.log(chalk.gray(`  Using global skills: ${usingGlobal.join(', ')}`));
          }

          const { customize } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'customize',
              message: '📝 Customize?',
              default: false,
            },
          ]);

          if (customize) {
            // Get available skills for selection
            const availableSkills = await getAvailableSkills();

            if (availableSkills.length === 0) {
              console.log(chalk.yellow('\n⚠️  No skills found in global skill directories.'));
              console.log(chalk.gray('   Skills should be in ~/.claude-workflow/skills/'));
              selectedSkills = [];
            } else {
              const { skills } = await inquirer.prompt([
                {
                  type: 'checkbox',
                  name: 'skills',
                  message: 'Select skills (✓ = installed globally):',
                  choices: availableSkills.map(skill => {
                    const isGlobal = globalSkills.includes(skill);
                    return {
                      name: isGlobal ? `${skill} (global ✓)` : skill,
                      value: skill,
                      checked: selectedSkills.includes(skill) && !isGlobal,
                    };
                  }),
                },
              ]);
              selectedSkills = skills;
            }
          }
        } else {
          // Custom setup
          const availableSkills = await getAvailableSkills();

          if (availableSkills.length === 0) {
            console.log(chalk.yellow('\n⚠️  No skills found in global skill directories.'));
            console.log(chalk.gray('   Skills should be in ~/.claude-workflow/skills/'));
            selectedSkills = [];
          } else {
            const recommendedSkills = await getRecommendedSkills(projectInfo);
            const { skills } = await inquirer.prompt([
              {
                type: 'checkbox',
                name: 'skills',
                message: 'Select skills (✓ = installed globally):',
                choices: availableSkills.map(skill => {
                  const isGlobal = globalSkills.includes(skill);
                  return {
                    name: isGlobal ? `${skill} (global ✓)` : skill,
                    value: skill,
                    checked: recommendedSkills.includes(skill) && !isGlobal,
                  };
                }),
              },
            ]);
            selectedSkills = skills;
          }
        }
      }

      // Install
      const installSpinner = ora('Installing...').start();

      // Get workflowRoot path early (needed for global skills initialization)
      // After bundling, the CLI is at dist/cli/index.mjs
      // We need to go up to the project root: ../../ from dist/cli/
      const cliPath = new URL(import.meta.url).pathname;
      const workflowRoot = path.resolve(path.dirname(cliPath), '../../');

      // Initialize global skills directory if it doesn't exist
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const globalSkillsDir = path.join(homeDir, '.claude-workflow/skills');

      if (!await fs.pathExists(globalSkillsDir)) {
        installSpinner.text = 'Initializing global skills directory...';

        // Copy skills from workflowRoot to global directory
        const workflowSkillsSource = getSkillsPath(workflowRoot);

        if (await fs.pathExists(workflowSkillsSource)) {
          // Copy universal skills
          const universalSource = path.join(workflowRoot, UNIVERSAL_SKILLS_DIR);
          const universalTarget = path.join(globalSkillsDir, 'universal');

          if (await fs.pathExists(universalSource)) {
            await fs.copy(universalSource, universalTarget, {
              filter: (src) => {
                return !src.includes('node_modules') && !src.includes('.DS_Store');
              },
            });
            logger.debug('Initialized global universal skills');
          }

          // Copy tech-stack skills
          const techStackSource = path.join(workflowRoot, TECH_STACK_SKILLS_DIR);
          const techStackTarget = path.join(globalSkillsDir, 'tech-stack');

          if (await fs.pathExists(techStackSource)) {
            await fs.copy(techStackSource, techStackTarget, {
              filter: (src) => {
                return !src.includes('node_modules') && !src.includes('.DS_Store');
              },
            });
            logger.debug('Initialized global tech-stack skills');
          }

          // Create custom skills directory (for user-defined skills)
          const customTarget = path.join(globalSkillsDir, 'custom');
          await fs.ensureDir(customTarget);
          logger.debug('Initialized global custom skills directory');

          logger.info(`Global skills directory initialized at ${globalSkillsDir}`);
        }
      }

      // Create .claude directory structure
      await fs.ensureDir(claudeDir);
      await fs.ensureDir(path.join(claudeDir, 'hooks'));
      await fs.ensureDir(path.join(claudeDir, 'skills'));
      await fs.ensureDir(path.join(claudeDir, 'commands'));

      // Create dev/ directory structure for Dev Docs
      await fs.ensureDir(path.join(cwd, 'dev'));
      await fs.ensureDir(path.join(cwd, 'dev/active'));

      // Copy hooks from claude-workflow to project
      const hooksSource = getHooksPath(workflowRoot);
      const hooksTarget = path.join(claudeDir, 'hooks');

      // Copy hook files
      if (await fs.pathExists(hooksSource)) {
        await fs.copy(hooksSource, hooksTarget, {
          filter: (src) => {
            // Don't copy node_modules
            return !src.includes('node_modules');
          },
        });

        // Install hook dependencies
        const hookPackageJson = path.join(hooksTarget, 'package.json');
        if (await fs.pathExists(hookPackageJson)) {
          installSpinner.text = 'Installing hook dependencies...';
          const { execSync } = await import('child_process');
          try {
            execSync('npm install', {
              cwd: hooksTarget,
              stdio: 'ignore',
            });
          } catch (error) {
            logger.warn('Failed to install hook dependencies, you may need to run npm install manually in .claude/hooks/');
          }
        }
      } else {
        logger.warn('Hooks not found in claude-workflow installation, skipping hooks setup');
      }

      // Copy commands from claude-workflow to project
      installSpinner.text = 'Setting up commands...';
      const commandsSource = getCommandsPath(workflowRoot);
      const commandsTarget = path.join(claudeDir, 'commands');

      if (await fs.pathExists(commandsSource)) {
        await fs.copy(commandsSource, commandsTarget);
        logger.debug('Copied commands to project');
      } else {
        logger.warn('Commands not found in claude-workflow installation, skipping commands setup');
      }

      // Copy dev/README.md from claude-workflow to project
      installSpinner.text = 'Setting up dev docs...';
      const devReadmeSource = path.join(getDevDocsPath(workflowRoot), 'README.md');
      const devReadmeTarget = path.join(cwd, 'dev/README.md');

      if (await fs.pathExists(devReadmeSource)) {
        await fs.copy(devReadmeSource, devReadmeTarget);
        logger.debug('Copied dev/README.md to project');
      } else {
        logger.warn('dev/README.md not found in claude-workflow installation, skipping dev docs setup');
      }

      // Copy agents from claude-workflow to project
      installSpinner.text = 'Setting up agents...';
      const agentsSource = getAgentsPath(workflowRoot);
      const agentsTarget = path.join(claudeDir, 'agents');

      if (await fs.pathExists(agentsSource)) {
        await fs.copy(agentsSource, agentsTarget, {
          filter: (src) => {
            // Don't copy node_modules or other build artifacts
            return !src.includes('node_modules') && !src.includes('.DS_Store');
          },
        });
        logger.debug('Copied agents to project');
      } else {
        logger.warn('Agents not found in claude-workflow installation, skipping agents setup');
      }

      // Copy skills from claude-workflow to project (flattened structure)
      installSpinner.text = 'Setting up skills...';

      const skillsSource = getSkillsPath(workflowRoot);
      const skillsTarget = path.join(claudeDir, 'skills');

      if (await fs.pathExists(skillsSource)) {
        // Flatten and copy selected skills
        for (const skillName of selectedSkills) {
          // Skip global skills - they will be loaded from ~/.claude/skills/
          if (globalSkills.includes(skillName)) {
            logger.info(`Using global skill: ${skillName}`);
            continue;
          }

          const skillPath = await findSkillInGlobal(skillName, workflowRoot);

          if (!skillPath) {
            logger.warn(`Skill '${skillName}' not found in global repository`);
            continue;
          }

          // Flatten: copy directly to .claude/skills/{skillName}/
          const targetPath = path.join(skillsTarget, skillName);
          await fs.copy(skillPath, targetPath, {
            filter: (src) => {
              // Don't copy node_modules or other build artifacts
              return !src.includes('node_modules') && !src.includes('.DS_Store');
            },
          });

          logger.debug(`Copied skill '${skillName}' from ${skillPath}`);
        }
      } else {
        logger.warn('Skills not found in claude-workflow installation, skipping skills setup');
      }

      installSpinner.text = 'Creating configuration...';

      // Create config
      const config = {
        version: '1.0',
        mode: options.mode,
        skills: Object.fromEntries(
          selectedSkills.map((skill) => [
            skill,
            {
              source: getSkillSource(skill),
              type: 'domain',
              enforcement: 'suggest',
              priority: 'high',
            },
          ])
        ),
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/skill-activation-prompt.sh',
                },
              ],
            },
          ],
          PostToolUse: [
            {
              matcher: 'Edit|Write|MultiEdit',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/post-tool-use-tracker.sh',
                },
              ],
            },
          ],
        },
      };

      await fs.writeJson(path.join(claudeDir, 'settings.json'), config, { spaces: 2 });

      // Create skill-rules.json in .claude/skills/ directory
      installSpinner.text = 'Generating skill-rules.json...';

      const skillRulesEntries: Array<[string, any]> = [];

      for (const skillName of selectedSkills) {
        // Read skill's SKILL.md to get actual configuration
        const skillPath = path.join(skillsTarget, skillName, 'SKILL.md');

        if (await fs.pathExists(skillPath)) {
          try {
            const content = await fs.readFile(skillPath, 'utf-8');
            const { frontmatter } = parseFrontmatter(content);

            // Build skill config from frontmatter
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
            const hasKeywords = frontmatter.keywords &&
              (Array.isArray(frontmatter.keywords) ? frontmatter.keywords.length > 0 : true);
            const hasIntentPatterns = frontmatter.intentPatterns &&
              (Array.isArray(frontmatter.intentPatterns) ? frontmatter.intentPatterns.length > 0 : true);

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
            const hasPathPatterns = frontmatter.pathPatterns &&
              (Array.isArray(frontmatter.pathPatterns) ? frontmatter.pathPatterns.length > 0 : true);
            const hasContentPatterns = frontmatter.contentPatterns &&
              (Array.isArray(frontmatter.contentPatterns) ? frontmatter.contentPatterns.length > 0 : true);
            const hasPathExclusions = frontmatter.pathExclusions &&
              (Array.isArray(frontmatter.pathExclusions) ? frontmatter.pathExclusions.length > 0 : true);

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

            skillRulesEntries.push([skillName, skillConfig]);
          } catch (error) {
            logger.warn(`Failed to read frontmatter for skill '${skillName}', using defaults`);
            // Fallback to default config
            skillRulesEntries.push([skillName, {
              type: 'domain',
              enforcement: 'suggest',
              priority: 'medium',
              promptTriggers: {
                keywords: getSkillKeywords(skillName),
                intentPatterns: [],
              },
            }]);
          }
        } else {
          // Skill file not found, use defaults
          skillRulesEntries.push([skillName, {
            type: 'domain',
            enforcement: 'suggest',
            priority: 'medium',
            promptTriggers: {
              keywords: getSkillKeywords(skillName),
              intentPatterns: [],
            },
          }]);
        }
      }

      const skillRules = {
        version: '1.0',
        skills: Object.fromEntries(skillRulesEntries),
      };

      await fs.writeJson(path.join(claudeDir, 'skills', 'skill-rules.json'), skillRules, { spaces: 2 });

      // Create .claude-workflow-meta.json
      const meta = {
        mode: options.mode,
        version: '1.0',
        createdAt: new Date().toISOString(),
        projectInfo,
      };

      await fs.writeJson(path.join(cwd, '.claude-workflow-meta.json'), meta, { spaces: 2 });

      // Update .gitignore
      const gitignorePath = path.join(cwd, '.gitignore');
      let gitignoreContent = '';
      if (await fs.pathExists(gitignorePath)) {
        gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      }

      if (!gitignoreContent.includes('.claude/skills-global')) {
        gitignoreContent += '\n# Claude Workflow\n.claude/skills-global\n';
        await fs.writeFile(gitignorePath, gitignoreContent);
      }

      // Create/update CLAUDE.md with preset rules
      installSpinner.text = 'Setting up CLAUDE.md...';
      try {
        await handleClaudeMd(cwd, options);
      } catch (error) {
        logger.warn('Failed to setup CLAUDE.md:', error);
      }

      installSpinner.succeed('Setup complete!');

      console.log(chalk.green('\n✅ Claude Workflow initialized successfully!\n'));
      console.log(chalk.cyan('Next steps:'));
      console.log('  1. Run "cw status" to see your configuration');
      console.log('  2. Run "cw skills" to manage skills');
      console.log('  3. Start using Claude Code in this directory\n');
    } catch (error) {
      logger.error('Failed to initialize:', error);
      process.exit(1);
    }
  });

/**
 * Get skills installed in Claude's global directory (~/.claude/skills/)
 */
async function getGlobalSkills(): Promise<string[]> {
  const skills: string[] = [];
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const globalSkillsDir = path.join(homeDir, '.claude', 'skills');

  if (!(await fs.pathExists(globalSkillsDir))) {
    return [];
  }

  try {
    const entries = await fs.readdir(globalSkillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillMdPath = path.join(globalSkillsDir, entry.name, 'SKILL.md');
        if (await fs.pathExists(skillMdPath)) {
          skills.push(entry.name);
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to read global skills directory:', error);
  }

  return skills;
}

/**
 * Get available skills from global skill directories
 */
async function getAvailableSkills(): Promise<string[]> {
  const skills: string[] = [];
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const workflowDir = path.join(homeDir, '.claude-workflow', 'skills');

  // Check universal skills
  const universalDir = path.join(workflowDir, 'universal');
  if (await fs.pathExists(universalDir)) {
    const entries = await fs.readdir(universalDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillMdPath = path.join(universalDir, entry.name, 'SKILL.md');
        if (await fs.pathExists(skillMdPath)) {
          skills.push(entry.name);
        }
      }
    }
  }

  // Check tech-stack skills
  const techStackDir = path.join(workflowDir, 'tech-stack');
  if (await fs.pathExists(techStackDir)) {
    const entries = await fs.readdir(techStackDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillMdPath = path.join(techStackDir, entry.name, 'SKILL.md');
        if (await fs.pathExists(skillMdPath)) {
          skills.push(entry.name);
        }
      }
    }
  }

  return skills;
}

async function getRecommendedSkills(projectInfo: {
  language?: string;
  framework?: string;
}): Promise<string[]> {
  // Get actually available skills
  const availableSkills = await getAvailableSkills();

  if (availableSkills.length === 0) {
    logger.warn('No skills found in global skill directories');
    return [];
  }

  const recommended: string[] = [];

  // Recommend based on project type
  const skillMappings: Record<string, string[]> = {
    // Universal skills (always recommend if available)
    universal: ['code-review', 'testing', 'git-workflow', 'documentation'],

    // Language-specific
    TypeScript: ['nodejs-backend', 'typescript-development', 'backend-dev-guidelines'],
    JavaScript: ['nodejs-backend', 'javascript-development', 'backend-dev-guidelines'],
    Python: ['python-backend', 'python-development'],

    // Framework-specific
    React: ['react-frontend', 'frontend-development'],
    Vue: ['vue-frontend', 'frontend-development'],
    Express: ['nodejs-backend', 'backend-dev-guidelines'],
  };

  // Add universal skills
  for (const skill of skillMappings.universal || []) {
    if (availableSkills.includes(skill) && !recommended.includes(skill)) {
      recommended.push(skill);
    }
  }

  // Add language-specific skills
  if (projectInfo.language) {
    const languageSkills = skillMappings[projectInfo.language] || [];
    for (const skill of languageSkills) {
      if (availableSkills.includes(skill) && !recommended.includes(skill)) {
        recommended.push(skill);
      }
    }
  }

  // Add framework-specific skills
  if (projectInfo.framework) {
    const frameworkSkills = skillMappings[projectInfo.framework] || [];
    for (const skill of frameworkSkills) {
      if (availableSkills.includes(skill) && !recommended.includes(skill)) {
        recommended.push(skill);
      }
    }
  }

  // If no recommendations, return all available skills
  if (recommended.length === 0) {
    return availableSkills.slice(0, 5); // Limit to first 5
  }

  return recommended;
}

function getSkillSource(skill: string): string {
  const techStackSkills = ['nodejs-backend', 'python-backend', 'react-frontend'];
  return techStackSkills.includes(skill) ? 'tech-stack' : 'universal';
}

function getSkillKeywords(skill: string): string[] {
  const keywords: Record<string, string[]> = {
    'code-review': ['review', 'check', 'audit'],
    testing: ['test', 'testing', 'spec'],
    'git-workflow': ['git', 'commit', 'branch'],
    'nodejs-backend': ['node', 'express', 'api'],
    'python-backend': ['python', 'flask', 'django'],
    'react-frontend': ['react', 'component', 'jsx'],
  };

  return keywords[skill] || [];
}

/**
 * Find a skill in the global repository (three-layer search)
 */
async function findSkillInGlobal(skillName: string, workflowRoot: string): Promise<string | null> {
  const searchPaths = [
    path.join(workflowRoot, UNIVERSAL_SKILLS_DIR, skillName),
    path.join(workflowRoot, TECH_STACK_SKILLS_DIR, skillName),
  ];

  for (const skillPath of searchPaths) {
    const skillFile = path.join(skillPath, 'SKILL.md');
    if (await fs.pathExists(skillFile)) {
      return skillPath;
    }
  }

  return null;
}

/**
 * 处理 CLAUDE.md 文件的创建和更新
 */
async function handleClaudeMd(cwd: string, options: { yes: boolean }): Promise<void> {
  const claudeMdPath = path.join(cwd, 'CLAUDE.md');
  const template = await loadTemplate();

  // 场景 1: 文件不存在
  if (!(await fs.pathExists(claudeMdPath))) {
    await fs.writeFile(claudeMdPath, template, 'utf-8');
    logger.info('Created CLAUDE.md with preset rules');
    return;
  }

  // 场景 2/3: 文件已存在
  const existing = await fs.readFile(claudeMdPath, 'utf-8');
  const parsed = parseClaudeMd(existing);

  if (!parsed.hasPreset) {
    // 场景 2: 无预设标记
    if (options.yes) {
      // 非交互模式: 自动追加
      const merged = mergeClaudeMd(existing, template);
      await fs.writeFile(claudeMdPath, merged, 'utf-8');
      logger.info('Appended preset rules to existing CLAUDE.md');
    } else {
      // 交互模式: 询问用户
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'CLAUDE.md already exists. Add preset rules?',
          choices: [
            { name: 'Append to end', value: 'append' },
            { name: 'Skip (keep as is)', value: 'skip' },
            { name: 'View preset content first', value: 'view' },
          ],
        },
      ]);

      if (action === 'view') {
        console.log(chalk.cyan('\nPreset rules:\n'));
        // 只显示预设部分
        const templateParsed = parseClaudeMd(template);
        if (templateParsed.presetContent) {
          console.log(templateParsed.presetContent);
        }
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Append these rules?',
            default: false,
          },
        ]);
        if (confirm) {
          const merged = mergeClaudeMd(existing, template);
          await fs.writeFile(claudeMdPath, merged, 'utf-8');
          logger.info('Appended preset rules to CLAUDE.md');
        }
      } else if (action === 'append') {
        const merged = mergeClaudeMd(existing, template);
        await fs.writeFile(claudeMdPath, merged, 'utf-8');
        logger.info('Appended preset rules to CLAUDE.md');
      }
      // skip: 不做任何操作
    }
  } else {
    // 场景 3: 有预设标记
    const currentVersion = parsed.presetVersion || '0.0.0';
    const templateVersion = getPresetVersion(template) || '1.0.0';

    if (currentVersion === templateVersion) {
      logger.debug('CLAUDE.md preset rules are up to date');
    } else if (!options.yes) {
      // 交互模式: 询问是否更新（带警告）
      console.log(chalk.yellow('\n⚠️  Preset rules update available:'));
      console.log(chalk.cyan(`   Current version: v${currentVersion}`));
      console.log(chalk.cyan(`   New version: v${templateVersion}`));
      console.log(chalk.yellow('\n⚠️  WARNING: Updating will overwrite any modifications you made to the preset rules.'));
      console.log(chalk.dim('   (Your custom rules outside the markers will be preserved)\n'));

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Skip (keep current version)', value: 'skip' },
            { name: 'View new preset content', value: 'view' },
            { name: 'Update (overwrite preset section)', value: 'update' },
          ],
          default: 'skip',
        },
      ]);

      if (action === 'view') {
        console.log(chalk.cyan('\n--- New preset rules ---\n'));
        // 只显示预设部分
        const templateParsed = parseClaudeMd(template);
        if (templateParsed.presetContent) {
          console.log(templateParsed.presetContent);
        }
        console.log(chalk.cyan('\n--- End of new preset rules ---\n'));

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Update to this version?',
            default: false,
          },
        ]);
        if (confirm) {
          const merged = mergeClaudeMd(existing, template);
          await fs.writeFile(claudeMdPath, merged, 'utf-8');
          logger.info(`Updated preset rules to v${templateVersion}`);
          console.log(chalk.green('✓ Preset rules updated successfully'));
        } else {
          console.log(chalk.dim('Skipped update'));
        }
      } else if (action === 'update') {
        const merged = mergeClaudeMd(existing, template);
        await fs.writeFile(claudeMdPath, merged, 'utf-8');
        logger.info(`Updated preset rules to v${templateVersion}`);
        console.log(chalk.green('✓ Preset rules updated successfully'));
      } else {
        console.log(chalk.dim('Skipped update'));
      }
    } else {
      // 非交互模式: 永不更新（保护用户修改）
      logger.debug(`CLAUDE.md has preset rules v${currentVersion}, skipping update in non-interactive mode`);
    }
  }
}
