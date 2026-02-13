/**
 * Path constants for Claude Workflow resources
 *
 * This module centralizes all resource paths to avoid hardcoding
 * and make path management easier.
 */

import path from 'path';

// Resource directory constants
export const RESOURCES_DIR = 'resources';
export const SKILLS_DIR = 'resources/skills';
export const HOOKS_DIR = 'resources/hooks';
export const COMMANDS_DIR = 'resources/commands';
export const AGENTS_DIR = 'resources/agents';
export const TEMPLATES_DIR = 'resources/templates';
export const DEV_DOCS_DIR = 'resources/dev-docs';

// Skill subdirectories
export const UNIVERSAL_SKILLS_DIR = 'resources/skills/universal';
export const TECH_STACK_SKILLS_DIR = 'resources/skills/tech-stack';

/**
 * Get the absolute path to a resource
 * @param workflowRoot - The root directory of the claude-workflow project
 * @param resourcePath - The relative resource path (e.g., 'resources/skills')
 * @returns The absolute path to the resource
 */
export function getResourcePath(workflowRoot: string, resourcePath: string): string {
  return path.join(workflowRoot, resourcePath);
}

/**
 * Get the path to the skills directory
 * @param workflowRoot - The root directory of the claude-workflow project
 * @returns The absolute path to the skills directory
 */
export function getSkillsPath(workflowRoot: string): string {
  return getResourcePath(workflowRoot, SKILLS_DIR);
}

/**
 * Get the path to the hooks directory
 * @param workflowRoot - The root directory of the claude-workflow project
 * @returns The absolute path to the hooks directory
 */
export function getHooksPath(workflowRoot: string): string {
  return getResourcePath(workflowRoot, HOOKS_DIR);
}

/**
 * Get the path to the commands directory
 * @param workflowRoot - The root directory of the claude-workflow project
 * @returns The absolute path to the commands directory
 */
export function getCommandsPath(workflowRoot: string): string {
  return getResourcePath(workflowRoot, COMMANDS_DIR);
}

/**
 * Get the path to the agents directory
 * @param workflowRoot - The root directory of the claude-workflow project
 * @returns The absolute path to the agents directory
 */
export function getAgentsPath(workflowRoot: string): string {
  return getResourcePath(workflowRoot, AGENTS_DIR);
}

/**
 * Get the path to the templates directory
 * @param workflowRoot - The root directory of the claude-workflow project
 * @returns The absolute path to the templates directory
 */
export function getTemplatesPath(workflowRoot: string): string {
  return getResourcePath(workflowRoot, TEMPLATES_DIR);
}

/**
 * Get the path to the dev-docs directory
 * @param workflowRoot - The root directory of the claude-workflow project
 * @returns The absolute path to the dev-docs directory
 */
export function getDevDocsPath(workflowRoot: string): string {
  return getResourcePath(workflowRoot, DEV_DOCS_DIR);
}
