/**
 * Core type definitions for Claude Workflow
 */

// ============================================================================
// Skill Types
// ============================================================================

export type SkillSource = 'universal' | 'tech-stack' | 'project' | 'remote' | 'plugin';
export type SkillType = 'domain' | 'guardrail';
export type SkillEnforcement = 'suggest' | 'block' | 'warn';
export type SkillPriority = 'critical' | 'high' | 'medium' | 'low';

export interface SkillMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  tags?: string[];
}

export interface SkillTriggers {
  promptTriggers?: {
    keywords?: string[];
    intentPatterns?: string[];
  };
  fileTriggers?: {
    pathPatterns?: string[];
    contentPatterns?: string[];
  };
}

export interface SkillConfig {
  source: SkillSource;
  type: SkillType;
  enforcement: SkillEnforcement;
  priority: SkillPriority;
  triggers?: SkillTriggers;
}

export interface Skill {
  metadata: SkillMetadata;
  config: SkillConfig;
  content: string;
  resourcePaths?: string[];
}

export interface SkillQuery {
  keywords?: string[];
  files?: string[];
  source?: SkillSource;
  type?: SkillType;
}

// ============================================================================
// Hook Types
// ============================================================================

export type HookEvent = 'UserPromptSubmit' | 'PostToolUse' | 'PreToolUse' | 'SessionStart';
export type HookType = 'command' | 'script' | 'plugin';

export interface HookConfig {
  type: HookType;
  command?: string;
  script?: string;
  priority?: number;
}

export interface HookContext {
  event: HookEvent;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface HookResult {
  success: boolean;
  output?: string;
  error?: string;
  stop?: boolean;
}

export interface IHook {
  id: string;
  name: string;
  priority: number;
  execute(context: HookContext): Promise<HookResult>;
  shouldExecute?(context: HookContext): boolean;
}

// ============================================================================
// Config Types
// ============================================================================

export type WorkflowMode = 'single-agent' | 'multi-agent';

export interface WorkflowConfig {
  version: string;
  mode: WorkflowMode;
  skills?: Record<string, SkillConfig>;
  hooks?: Partial<Record<HookEvent, HookConfig[]>>;
  extensions?: Record<string, unknown>;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// Context Types
// ============================================================================

export interface Context {
  [key: string]: unknown;
}

// ============================================================================
// Agent Types
// ============================================================================

export type AgentRole = 'executor' | 'planner' | 'reviewer';

export interface Task {
  id: string;
  description: string;
  keywords?: string[];
  files?: string[];
  metadata?: Record<string, unknown>;
}

export interface Result {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  type: MessageType;
  payload: unknown;
  timestamp: number;
}

export type MessageType = 'task' | 'result' | 'question' | 'answer' | 'review' | 'approval';

// ============================================================================
// Orchestrator Types
// ============================================================================

export interface OrchestratorConfig {
  mode: WorkflowMode;
  projectDir: string;
  workflowDir: string;
  [key: string]: unknown;
}

// ============================================================================
// Template Types
// ============================================================================

export interface Template {
  name: string;
  description: string;
  files: TemplateFile[];
}

export interface TemplateFile {
  path: string;
  content: string;
}

// ============================================================================
// Dev Task Types
// ============================================================================

export type DevTaskStatus = 'planned' | 'in-progress' | 'blocked' | 'complete';

export interface DevTaskInfo {
  name: string;
  status: DevTaskStatus;
  progress: number;
  lastUpdated: string;
  path: string;
  description?: string;
}

export interface DevTaskContext {
  status: DevTaskStatus;
  lastUpdated: string;
  sessionProgress?: {
    completed: string[];
    inProgress: string[];
    notStarted: string[];
    blockers: string[];
  };
}

export interface IncompleteTask {
  name: string;
  path: string;
  missingFiles: string[];
}

// ============================================================================
// Health Checker Types
// ============================================================================

export * from './health-checker.js';
