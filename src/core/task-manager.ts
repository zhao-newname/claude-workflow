/**
 * TaskManager - Manages development tasks in dev/active/
 */

import path from 'path';
import fs from 'fs-extra';
import type { DevTaskInfo, DevTaskContext, DevTaskStatus, IncompleteTask } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class TaskManager {
  private tasksDir: string;
  private archivedDir: string;

  constructor(projectDir: string) {
    this.tasksDir = path.join(projectDir, 'dev/active');
    this.archivedDir = path.join(projectDir, 'dev/archived');
  }

  async listTasks(): Promise<DevTaskInfo[]> {
    if (!await fs.pathExists(this.tasksDir)) {
      return [];
    }

    const dirs = await fs.readdir(this.tasksDir, { withFileTypes: true });
    const tasks: DevTaskInfo[] = [];

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const taskPath = path.join(this.tasksDir, dir.name);
      const files = await this.findTaskFiles(taskPath, dir.name);

      if (files.contextPath) {
        const context = await this.parseContext(files.contextPath);
        const progress = files.tasksPath ? await this.calculateProgress(files.tasksPath) : 0;
        const description = files.planPath ? await this.extractDescription(files.planPath) : undefined;

        tasks.push({
          name: dir.name,
          status: context.status,
          progress,
          lastUpdated: context.lastUpdated,
          path: taskPath,
          description,
        });
      }
    }

    return tasks.sort((a, b) => {
      const dateA = new Date(a.lastUpdated).getTime();
      const dateB = new Date(b.lastUpdated).getTime();
      return dateB - dateA;
    });
  }

  async listIncompleteTasks(): Promise<IncompleteTask[]> {
    if (!await fs.pathExists(this.tasksDir)) {
      return [];
    }

    const dirs = await fs.readdir(this.tasksDir, { withFileTypes: true });
    const incompleteTasks: IncompleteTask[] = [];

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const taskPath = path.join(this.tasksDir, dir.name);
      const files = await this.findTaskFiles(taskPath, dir.name);

      if (!files.contextPath) {
        const missingFiles: string[] = [];

        if (!files.contextPath) missingFiles.push(`${dir.name}-context.md`);
        if (!files.tasksPath) missingFiles.push(`${dir.name}-tasks.md`);
        if (!files.planPath) missingFiles.push(`${dir.name}-plan.md`);

        const existingFiles = await fs.readdir(taskPath);
        if (existingFiles.length > 0) {
          incompleteTasks.push({
            name: dir.name,
            path: taskPath,
            missingFiles,
          });
        }
      }
    }

    return incompleteTasks;
  }

  async getTask(name: string): Promise<DevTaskInfo | null> {
    const taskPath = path.join(this.tasksDir, name);

    if (!await fs.pathExists(taskPath)) {
      return null;
    }

    const files = await this.findTaskFiles(taskPath, name);

    if (!files.contextPath) {
      return null;
    }

    const context = await this.parseContext(files.contextPath);
    const progress = files.tasksPath ? await this.calculateProgress(files.tasksPath) : 0;
    const description = files.planPath ? await this.extractDescription(files.planPath) : undefined;

    return {
      name,
      status: context.status,
      progress,
      lastUpdated: context.lastUpdated,
      path: taskPath,
      description,
    };
  }

  async getTaskContext(name: string): Promise<string | null> {
    const taskPath = path.join(this.tasksDir, name);
    const files = await this.findTaskFiles(taskPath, name);

    if (!files.contextPath || !await fs.pathExists(files.contextPath)) {
      return null;
    }

    return await fs.readFile(files.contextPath, 'utf-8');
  }

  async getTaskTasks(name: string): Promise<string | null> {
    const taskPath = path.join(this.tasksDir, name);
    const files = await this.findTaskFiles(taskPath, name);

    if (!files.tasksPath || !await fs.pathExists(files.tasksPath)) {
      return null;
    }

    return await fs.readFile(files.tasksPath, 'utf-8');
  }

  async getTaskPlan(name: string): Promise<string | null> {
    const taskPath = path.join(this.tasksDir, name);
    const files = await this.findTaskFiles(taskPath, name);

    if (!files.planPath || !await fs.pathExists(files.planPath)) {
      return null;
    }

    return await fs.readFile(files.planPath, 'utf-8');
  }

  private async findTaskFiles(taskPath: string, dirName: string): Promise<{
    contextPath?: string;
    tasksPath?: string;
    planPath?: string;
  }> {
    if (!await fs.pathExists(taskPath)) {
      return {};
    }

    const files = await fs.readdir(taskPath);
    const result: { contextPath?: string; tasksPath?: string; planPath?: string } = {};

    const strictContextName = `${dirName}-context.md`;
    const strictTasksName = `${dirName}-tasks.md`;
    const strictPlanName = `${dirName}-plan.md`;

    if (files.includes(strictContextName)) {
      result.contextPath = path.join(taskPath, strictContextName);
    } else {
      const contextFile = files.find(f => f.endsWith('-context.md'));
      if (contextFile) {
        result.contextPath = path.join(taskPath, contextFile);
      }
    }

    if (files.includes(strictTasksName)) {
      result.tasksPath = path.join(taskPath, strictTasksName);
    } else {
      const tasksFile = files.find(f => f.endsWith('-tasks.md'));
      if (tasksFile) {
        result.tasksPath = path.join(taskPath, tasksFile);
      }
    }

    if (files.includes(strictPlanName)) {
      result.planPath = path.join(taskPath, strictPlanName);
    } else {
      const planFile = files.find(f => f.endsWith('-plan.md'));
      if (planFile) {
        result.planPath = path.join(taskPath, planFile);
      }
    }

    return result;
  }

  private async parseContext(filePath: string): Promise<DevTaskContext> {
    const content = await fs.readFile(filePath, 'utf-8');

    const lastUpdatedMatch = content.match(/\*\*Last Updated\*\*:\s*(.+?)(?:\n|$)/i) ||
                            content.match(/Last Updated:\s*(.+?)(?:\n|$)/i);
    const lastUpdated = lastUpdatedMatch ? lastUpdatedMatch[1].trim() : 'Unknown';

    let status: DevTaskStatus = 'planned';
    const upperContent = content.toUpperCase();

    if (upperContent.includes('COMPLETE') || upperContent.includes('✅ READY')) {
      status = 'complete';
    } else if (upperContent.includes('BLOCKED') || upperContent.includes('⚠️')) {
      status = 'blocked';
    } else if (upperContent.includes('IN PROGRESS') || upperContent.includes('🟡')) {
      status = 'in-progress';
    }

    return { status, lastUpdated };
  }

  private async calculateProgress(filePath: string): Promise<number> {
    if (!await fs.pathExists(filePath)) {
      return 0;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const totalTasks = (content.match(/- \[[ xX]\]/g) || []).length;
    const completedTasks = (content.match(/- \[[xX]\]/gi) || []).length;

    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }

  private async extractDescription(filePath: string): Promise<string | undefined> {
    if (!await fs.pathExists(filePath)) {
      return undefined;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('#') && !line.startsWith('---') && line.length > 20) {
          return line.substring(0, 100);
        }
      }
    } catch (error) {
      logger.debug(`Failed to extract description from ${filePath}`);
    }

    return undefined;
  }

  async archiveTask(name: string): Promise<{ success: boolean; from?: string; to?: string; error?: string }> {
    const sourcePath = path.join(this.tasksDir, name);

    if (!await fs.pathExists(sourcePath)) {
      return { success: false, error: `Task "${name}" not found in dev/active/` };
    }

    await fs.ensureDir(this.archivedDir);

    const destPath = path.join(this.archivedDir, name);

    if (await fs.pathExists(destPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const newDestPath = path.join(this.archivedDir, `${name}-${timestamp}`);

      try {
        await fs.move(sourcePath, newDestPath);
        return { success: true, from: sourcePath, to: newDestPath };
      } catch (error) {
        return { success: false, error: `Failed to move task: ${error}` };
      }
    }

    try {
      await fs.move(sourcePath, destPath);
      return { success: true, from: sourcePath, to: destPath };
    } catch (error) {
      return { success: false, error: `Failed to move task: ${error}` };
    }
  }

  async getPendingTasks(name: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    items: Array<{ lineNumber: number; text: string }>;
  } | null> {
    const taskPath = path.join(this.tasksDir, name);
    const files = await this.findTaskFiles(taskPath, name);

    if (!files.tasksPath || !await fs.pathExists(files.tasksPath)) {
      return null;
    }

    const content = await fs.readFile(files.tasksPath, 'utf-8');
    const lines = content.split('\n');

    const totalTasks = (content.match(/- \[[ xX]\]/g) || []).length;
    const completedTasks = (content.match(/- \[[xX]\]/gi) || []).length;
    const pendingTasks = totalTasks - completedTasks;

    const pendingItems: Array<{ lineNumber: number; text: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/- \[ \]/.test(line)) {
        const text = line.replace(/^\s*- \[ \]\s*/, '').trim();
        pendingItems.push({
          lineNumber: i + 1,
          text,
        });
      }
    }

    return {
      total: totalTasks,
      completed: completedTasks,
      pending: pendingTasks,
      items: pendingItems,
    };
  }

  async updateTaskStatus(name: string, lineNumber: number, completed: boolean): Promise<{
    success: boolean;
    taskText?: string;
    error?: string;
  }> {
    const taskPath = path.join(this.tasksDir, name);
    const files = await this.findTaskFiles(taskPath, name);

    if (!files.tasksPath || !await fs.pathExists(files.tasksPath)) {
      return { success: false, error: 'Tasks file not found' };
    }

    try {
      const content = await fs.readFile(files.tasksPath, 'utf-8');
      const lines = content.split('\n');

      if (lineNumber < 1 || lineNumber > lines.length) {
        return { success: false, error: `Line number ${lineNumber} is out of range (1-${lines.length})` };
      }

      const line = lines[lineNumber - 1];
      const taskMatch = line.match(/^(\s*)- \[[ xX]\]\s*(.+)$/);

      if (!taskMatch) {
        return { success: false, error: `Line ${lineNumber} is not a task checkbox` };
      }

      const [, indent, taskText] = taskMatch;
      const newCheckbox = completed ? '[x]' : '[ ]';
      lines[lineNumber - 1] = `${indent}- ${newCheckbox} ${taskText}`;

      await fs.writeFile(files.tasksPath, lines.join('\n'), 'utf-8');

      return { success: true, taskText };
    } catch (error) {
      return { success: false, error: `Failed to update task: ${error}` };
    }
  }

  async toggleTaskStatus(name: string, lineNumber: number): Promise<{
    success: boolean;
    taskText?: string;
    newStatus?: boolean;
    error?: string;
  }> {
    const taskPath = path.join(this.tasksDir, name);
    const files = await this.findTaskFiles(taskPath, name);

    if (!files.tasksPath || !await fs.pathExists(files.tasksPath)) {
      return { success: false, error: 'Tasks file not found' };
    }

    try {
      const content = await fs.readFile(files.tasksPath, 'utf-8');
      const lines = content.split('\n');

      if (lineNumber < 1 || lineNumber > lines.length) {
        return { success: false, error: `Line number ${lineNumber} is out of range (1-${lines.length})` };
      }

      const line = lines[lineNumber - 1];
      const taskMatch = line.match(/^(\s*)- \[[ xX]\]\s*(.+)$/);

      if (!taskMatch) {
        return { success: false, error: `Line ${lineNumber} is not a task checkbox` };
      }

      const [, indent, taskText] = taskMatch;
      const isCompleted = /\[[xX]\]/.test(line);
      const newCheckbox = isCompleted ? '[ ]' : '[x]';
      lines[lineNumber - 1] = `${indent}- ${newCheckbox} ${taskText}`;

      await fs.writeFile(files.tasksPath, lines.join('\n'), 'utf-8');

      return { success: true, taskText, newStatus: !isCompleted };
    } catch (error) {
      return { success: false, error: `Failed to toggle task: ${error}` };
    }
  }
}
