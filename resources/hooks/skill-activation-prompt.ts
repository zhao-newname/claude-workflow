#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { minimatch } from 'minimatch';

interface HookInput {
    session_id: string;
    transcript_path: string;
    cwd: string;
    permission_mode: string;
    prompt: string;
}

interface PromptTriggers {
    keywords?: string[];
    intentPatterns?: string[];
}

interface FileTriggers {
    pathPatterns?: string[];
    pathExclusions?: string[];
    contentPatterns?: string[];
}

interface SkillRule {
    type: 'guardrail' | 'domain';
    enforcement: 'block' | 'suggest' | 'warn';
    priority: 'critical' | 'high' | 'medium' | 'low';
    promptTriggers?: PromptTriggers;
    fileTriggers?: FileTriggers;
}

interface SkillRules {
    version: string;
    skills: Record<string, SkillRule>;
}

interface MatchedSkill {
    name: string;
    matchType: 'keyword' | 'intent' | 'file';
    config: SkillRule;
    matchedFiles?: number;
}

/**
 * Check if a skill is installed in the project or globally
 */
function isSkillInstalled(projectDir: string, skillName: string): boolean {
    // Check project-level skill
    const projectSkillPath = join(projectDir, '.claude', 'skills', skillName, 'SKILL.md');
    if (existsSync(projectSkillPath)) {
        return true;
    }

    // Check universal skill
    const universalSkillPath = join(projectDir, '.claude', 'skills', 'universal', skillName, 'SKILL.md');
    if (existsSync(universalSkillPath)) {
        return true;
    }

    // Check user global skill (~/.claude/skills/)
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (homeDir) {
        const userSkillPath = join(homeDir, '.claude', 'skills', skillName, 'SKILL.md');
        if (existsSync(userSkillPath)) {
            return true;
        }
    }

    return false;
}

/**
 * Check if prompt indicates user wants to review/check code
 */
function shouldCheckFiles(prompt: string): boolean {
    const checkKeywords = [
        '检查', 'check',
        '审查', 'review',
        '看看', 'show', 'list',
        '改了', 'changed',
        '分析', 'analyze'
    ];

    const codeKeywords = [
        '代码', 'code',
        '文件', 'file',
        '改动', 'change'
    ];

    const lowerPrompt = prompt.toLowerCase();

    // Check if prompt contains both a check keyword and a code keyword
    const hasCheckKeyword = checkKeywords.some(kw => lowerPrompt.includes(kw));
    const hasCodeKeyword = codeKeywords.some(kw => lowerPrompt.includes(kw));

    return hasCheckKeyword && hasCodeKeyword;
}

/**
 * Read edited files from post-tool-use-tracker cache
 */
function readEditedFiles(sessionId: string): string[] {
    try {
        const cacheDir = join(process.env.HOME || '/root', '.claude', 'tsc-cache', sessionId);
        const logFile = join(cacheDir, 'edited-files.log');

        if (!existsSync(logFile)) {
            return [];
        }

        const content = readFileSync(logFile, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.length > 0);

        // Parse format: timestamp:file_path:repo
        const files = lines.map(line => {
            const parts = line.split(':');
            return parts.length >= 2 ? parts[1] : '';
        }).filter(f => f.length > 0);

        // Remove duplicates
        return Array.from(new Set(files));
    } catch (error) {
        return [];
    }
}

/**
 * Match file path against glob patterns
 */
function matchPathPatterns(filePath: string, patterns: string[], projectDir: string): boolean {
    // Convert absolute path to relative path
    const relativePath = filePath.startsWith(projectDir)
        ? filePath.substring(projectDir.length + 1)
        : filePath;

    return patterns.some(pattern => minimatch(relativePath, pattern, { dot: true }));
}

/**
 * Check if file should be excluded
 */
function isExcluded(filePath: string, exclusions: string[] | undefined, projectDir: string): boolean {
    if (!exclusions || exclusions.length === 0) {
        return false;
    }

    const relativePath = filePath.startsWith(projectDir)
        ? filePath.substring(projectDir.length + 1)
        : filePath;

    return exclusions.some(pattern => minimatch(relativePath, pattern, { dot: true }));
}

/**
 * Match file content against regex patterns
 */
function matchContentPatterns(filePath: string, patterns: string[]): boolean {
    if (!existsSync(filePath)) {
        return false;
    }

    try {
        const content = readFileSync(filePath, 'utf-8');
        return patterns.some(pattern => {
            try {
                const regex = new RegExp(pattern, 'i');
                return regex.test(content);
            } catch {
                return false;
            }
        });
    } catch {
        return false;
    }
}

/**
 * Check file triggers for edited files
 */
function checkFileTriggers(
    sessionId: string,
    projectDir: string,
    rules: SkillRules
): MatchedSkill[] {
    const editedFiles = readEditedFiles(sessionId);

    if (editedFiles.length === 0) {
        return [];
    }

    const matchedSkills: Map<string, { config: SkillRule; count: number }> = new Map();

    for (const file of editedFiles) {
        for (const [skillName, config] of Object.entries(rules.skills)) {
            const triggers = config.fileTriggers;
            if (!triggers) {
                continue;
            }

            // Only recommend if skill is installed
            if (!isSkillInstalled(projectDir, skillName)) {
                continue;
            }

            // Check exclusions first
            if (isExcluded(file, triggers.pathExclusions, projectDir)) {
                continue;
            }

            let matched = false;

            // Check path patterns
            if (triggers.pathPatterns && triggers.pathPatterns.length > 0) {
                if (matchPathPatterns(file, triggers.pathPatterns, projectDir)) {
                    matched = true;
                }
            }

            // Check content patterns (only if path matched or no path patterns)
            if (matched || !triggers.pathPatterns || triggers.pathPatterns.length === 0) {
                if (triggers.contentPatterns && triggers.contentPatterns.length > 0) {
                    if (matchContentPatterns(file, triggers.contentPatterns)) {
                        matched = true;
                    }
                }
            }

            if (matched) {
                if (matchedSkills.has(skillName)) {
                    matchedSkills.get(skillName)!.count++;
                } else {
                    matchedSkills.set(skillName, { config, count: 1 });
                }
            }
        }
    }

    return Array.from(matchedSkills.entries()).map(([name, { config, count }]) => ({
        name,
        matchType: 'file' as const,
        config,
        matchedFiles: count
    }));
}

async function main() {
    try {
        // Read input from stdin
        const input = readFileSync(0, 'utf-8');
        const data: HookInput = JSON.parse(input);
        const prompt = data.prompt.toLowerCase();

        // Load skill rules from the project directory
        const projectDir = data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
        const rulesPath = join(projectDir, '.claude', 'skills', 'skill-rules.json');

        if (!existsSync(rulesPath)) {
            // No skill rules configured, exit silently
            process.exit(0);
        }

        const rules: SkillRules = JSON.parse(readFileSync(rulesPath, 'utf-8'));

        const matchedSkills: MatchedSkill[] = [];

        // 1. Check prompt triggers
        for (const [skillName, config] of Object.entries(rules.skills)) {
            const triggers = config.promptTriggers;
            if (!triggers) {
                continue;
            }

            // Only recommend if skill is installed
            if (!isSkillInstalled(projectDir, skillName)) {
                continue;
            }

            // Keyword matching
            if (triggers.keywords) {
                const keywordMatch = triggers.keywords.some(kw =>
                    prompt.includes(kw.toLowerCase())
                );
                if (keywordMatch) {
                    matchedSkills.push({ name: skillName, matchType: 'keyword', config });
                    continue;
                }
            }

            // Intent pattern matching
            if (triggers.intentPatterns) {
                const intentMatch = triggers.intentPatterns.some(pattern => {
                    const regex = new RegExp(pattern, 'i');
                    return regex.test(prompt);
                });
                if (intentMatch) {
                    matchedSkills.push({ name: skillName, matchType: 'intent', config });
                }
            }
        }

        // 2. Check file triggers (only if user asks to check/review code)
        if (shouldCheckFiles(data.prompt)) {
            const fileMatches = checkFileTriggers(data.session_id, projectDir, rules);
            matchedSkills.push(...fileMatches);
        }

        // Remove duplicates (same skill matched by different triggers)
        const uniqueSkills = new Map<string, MatchedSkill>();
        for (const skill of matchedSkills) {
            if (!uniqueSkills.has(skill.name)) {
                uniqueSkills.set(skill.name, skill);
            } else {
                // If already exists, prefer file match (more specific)
                const existing = uniqueSkills.get(skill.name)!;
                if (skill.matchType === 'file' && existing.matchType !== 'file') {
                    uniqueSkills.set(skill.name, skill);
                }
            }
        }

        const finalMatches = Array.from(uniqueSkills.values());

        // Generate output if matches found
        if (finalMatches.length > 0) {
            let output = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            output += '🎯 SKILL ACTIVATION CHECK\n';
            output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

            // Group by priority
            const critical = finalMatches.filter(s => s.config.priority === 'critical');
            const high = finalMatches.filter(s => s.config.priority === 'high');
            const medium = finalMatches.filter(s => s.config.priority === 'medium');
            const low = finalMatches.filter(s => s.config.priority === 'low');

            if (critical.length > 0) {
                output += '⚠️  CRITICAL SKILLS (REQUIRED):\n';
                critical.forEach(s => {
                    output += `  → ${s.name}`;
                    if (s.matchType === 'file' && s.matchedFiles) {
                        output += ` (匹配 ${s.matchedFiles} 个文件)`;
                    }
                    output += '\n';
                });
                output += '\n';
            }

            if (high.length > 0) {
                output += '📚 RECOMMENDED SKILLS:\n';
                high.forEach(s => {
                    output += `  → ${s.name}`;
                    if (s.matchType === 'file' && s.matchedFiles) {
                        output += ` (匹配 ${s.matchedFiles} 个文件)`;
                    }
                    output += '\n';
                });
                output += '\n';
            }

            if (medium.length > 0) {
                output += '💡 SUGGESTED SKILLS:\n';
                medium.forEach(s => {
                    output += `  → ${s.name}`;
                    if (s.matchType === 'file' && s.matchedFiles) {
                        output += ` (匹配 ${s.matchedFiles} 个文件)`;
                    }
                    output += '\n';
                });
                output += '\n';
            }

            if (low.length > 0) {
                output += '📌 OPTIONAL SKILLS:\n';
                low.forEach(s => {
                    output += `  → ${s.name}`;
                    if (s.matchType === 'file' && s.matchedFiles) {
                        output += ` (匹配 ${s.matchedFiles} 个文件)`;
                    }
                    output += '\n';
                });
                output += '\n';
            }

            output += 'ACTION: Use Skill tool BEFORE responding\n';
            output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

            console.log(output);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error in skill-activation-prompt hook:', err);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Uncaught error:', err);
    process.exit(1);
});
