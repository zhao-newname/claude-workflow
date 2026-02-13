/**
 * CLAUDE.md 文件解析结果
 */
export interface ParsedClaudeMd {
  /** 是否包含预设标记 */
  hasPreset: boolean;
  /** 预设版本号 */
  presetVersion: string | null;
  /** 预设内容（标记之间的内容） */
  presetContent: string | null;
  /** 用户内容（标记之外的内容） */
  userContent: string;
  /** 完整内容 */
  fullContent: string;
}
