/**
 * CLAUDE.md 管理工具
 * 负责模板加载、文件解析和智能合并
 */

import path from 'path';
import fs from 'fs-extra';
import { ParsedClaudeMd } from '../types/claude-md.js';

// 预设标记常量
const PRESET_START_MARKER = '<!-- CW_PRESET_START -->';
const PRESET_END_MARKER = '<!-- CW_PRESET_END -->';
const VERSION_PATTERN = /<!-- Version: ([\d.]+) -->/;

/**
 * 加载 CLAUDE.md 模板文件
 */
export async function loadTemplate(): Promise<string> {
  // 获取模板文件路径
  // 开发环境: src/templates/CLAUDE.md.template
  // 打包后: dist/templates/CLAUDE.md.template
  const templatePath = getTemplatePath();

  try {
    const content = await fs.readFile(templatePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to load CLAUDE.md template: ${error}`);
  }
}

/**
 * 获取模板文件路径（处理开发环境和打包后的路径）
 */
function getTemplatePath(): string {
  // 使用 fileURLToPath 处理 Windows 路径
  const currentFile = new URL(import.meta.url).pathname;
  const currentDir = path.dirname(currentFile);

  // 尝试多个可能的路径
  const possiblePaths = [
    // 打包后: dist/utils/ -> resources/templates/
    path.resolve(currentDir, '../../resources/templates/CLAUDE.md.template'),
    // 开发环境: src/utils/ -> resources/templates/
    path.resolve(currentDir, '../../../resources/templates/CLAUDE.md.template'),
  ];

  for (const templatePath of possiblePaths) {
    if (fs.existsSync(templatePath)) {
      return templatePath;
    }
  }

  throw new Error('CLAUDE.md template not found');
}

/**
 * 检查内容是否包含预设标记
 */
export function hasPresetMarker(content: string): boolean {
  return content.includes(PRESET_START_MARKER) && content.includes(PRESET_END_MARKER);
}

/**
 * 提取预设版本号
 */
export function getPresetVersion(content: string): string | null {
  const match = content.match(VERSION_PATTERN);
  return match ? match[1] : null;
}

/**
 * 解析 CLAUDE.md 文件内容
 */
export function parseClaudeMd(content: string): ParsedClaudeMd {
  const hasPreset = hasPresetMarker(content);

  if (!hasPreset) {
    // 无预设标记，全部视为用户内容
    return {
      hasPreset: false,
      presetVersion: null,
      presetContent: null,
      userContent: content,
      fullContent: content,
    };
  }

  // 有预设标记，分离预设和用户内容
  const startIndex = content.indexOf(PRESET_START_MARKER);
  const endIndex = content.indexOf(PRESET_END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    // 标记不完整，视为无预设
    return {
      hasPreset: false,
      presetVersion: null,
      presetContent: null,
      userContent: content,
      fullContent: content,
    };
  }

  // 提取预设内容（包含标记）
  const presetContent = content.substring(startIndex, endIndex + PRESET_END_MARKER.length);

  // 提取用户内容（标记之外的部分）
  const beforePreset = content.substring(0, startIndex);
  const afterPreset = content.substring(endIndex + PRESET_END_MARKER.length);

  // 保留换行，避免内容粘连
  const userContent = [beforePreset.trim(), afterPreset.trim()]
    .filter((s) => s.length > 0)
    .join('\n\n');

  // 提取版本号
  const presetVersion = getPresetVersion(presetContent);

  return {
    hasPreset: true,
    presetVersion,
    presetContent,
    userContent,
    fullContent: content,
  };
}

/**
 * 智能合并现有内容和模板
 * @param existing 现有文件内容
 * @param template 模板内容
 * @returns 合并后的内容
 */
export function mergeClaudeMd(existing: string, template: string): string {
  const parsed = parseClaudeMd(existing);

  if (!parsed.hasPreset) {
    // 场景：现有内容无标记，追加模板到末尾
    // 确保有适当的换行
    const separator = existing.trim().length > 0 ? '\n\n' : '';
    return existing.trim() + separator + template.trim();
  }

  // 场景：现有内容有标记，替换预设部分
  // 提取模板中的预设部分
  const templateParsed = parseClaudeMd(template);

  if (!templateParsed.hasPreset || !templateParsed.presetContent) {
    // 模板格式错误，返回原内容
    return existing;
  }

  // 替换预设部分，保留用户内容
  const startIndex = existing.indexOf(PRESET_START_MARKER);
  const endIndex = existing.indexOf(PRESET_END_MARKER);

  if (startIndex === -1 || endIndex === -1) {
    // 标记不完整，返回原内容
    return existing;
  }

  const beforePreset = existing.substring(0, startIndex);
  const afterPreset = existing.substring(endIndex + PRESET_END_MARKER.length);

  // 组合：用户内容（前） + 新预设 + 用户内容（后）
  return beforePreset + templateParsed.presetContent + afterPreset;
}
