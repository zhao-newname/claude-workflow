/**
 * Core interfaces for Claude Workflow
 */

import type {
  Skill,
  SkillQuery,
  WorkflowConfig,
  ValidationResult,
  Context,
  HookEvent,
  HookContext,
  HookResult,
  IHook,
  Task,
  Result,
  Message,
  AgentRole,
  OrchestratorConfig,
  Template,
} from './index.js';

// ============================================================================
// Skill Manager Interface
// ============================================================================

export interface ISkillLoader {
  load(name: string): Promise<Skill | null>;
  list(): Promise<Skill[]>;
  getSkillPath(name: string): string;
  getSource(): 'universal' | 'tech-stack' | 'project' | 'plugin';
}

export interface SkillStatus {
  name: string;
  installed: boolean;
  location: 'project' | 'user' | 'global' | 'both' | 'none';
  source?: 'universal' | 'tech-stack' | 'custom' | 'plugin';
  size?: number;
}

export interface ISkillManager {
  // Basic operations
  list(): Promise<Skill[]>;
  get(name: string): Promise<Skill | null>;
  add(skill: Skill): Promise<void>;
  remove(name: string): Promise<void>;

  // Search operations
  find(query: SkillQuery): Promise<Skill[]>;
  search(keyword: string): Promise<Skill[]>;

  // Activation operations
  activate(name: string): Promise<void>;
  deactivate(name: string): Promise<void>;

  // Status operations
  getSkillStatus(name: string): Promise<SkillStatus>;
  listAllSkills(): Promise<SkillStatus[]>;

  // Extension point
  registerLoader(loader: ISkillLoader): void;
}

// ============================================================================
// Config Manager Interface
// ============================================================================

export interface IConfigValidator {
  validate(config: WorkflowConfig): ValidationResult;
}

export interface IConfigTransformer {
  from: string;
  to: string;
  transform(config: WorkflowConfig): WorkflowConfig;
}

export interface IConfigManager {
  // Read config
  get<T>(key: string): T | undefined;
  getAll(): WorkflowConfig;

  // Write config
  set(key: string, value: unknown): void;
  merge(config: Partial<WorkflowConfig>): void;

  // Validate config
  validate(): ValidationResult;

  // Extension points
  registerValidator(validator: IConfigValidator): void;
  registerTransformer(transformer: IConfigTransformer): void;
}

// ============================================================================
// Hook Manager Interface
// ============================================================================

export interface IHookExecutor {
  type: string;
  execute(hook: IHook, context: HookContext): Promise<HookResult>;
}

export interface IHookManager {
  // Register hooks
  register(event: HookEvent, hook: IHook): void;
  unregister(event: HookEvent, hookId: string): void;

  // Execute hooks
  execute(event: HookEvent, context: HookContext): Promise<HookResult>;

  // Extension point
  registerExecutor(executor: IHookExecutor): void;
}

// ============================================================================
// Context Manager Interface
// ============================================================================

export interface IContextManager {
  // Read context
  get(key: string): unknown;
  getAll(): Context;

  // Write context
  set(key: string, value: unknown): void;
  update(updates: Partial<Context>): void;

  // Share context (multi-agent only, no-op for single-agent)
  share(agentId: string, keys: string[]): void;

  // Persistence
  save(): Promise<void>;
  load(): Promise<void>;
}

// ============================================================================
// Agent Interface
// ============================================================================

export interface IAgent {
  id: string;
  role: AgentRole;

  // Core capabilities
  skills: ISkillManager;
  config: IConfigManager;
  context: IContextManager;

  // Execute method
  execute(task: Task): Promise<Result>;

  // Communication methods (multi-agent only, optional for single-agent)
  sendMessage?(to: string, message: Message): Promise<void>;
  receiveMessage?(from: string, message: Message): Promise<void>;
}

// ============================================================================
// Orchestrator Interface
// ============================================================================

export interface IAgentOrchestrator {
  // Initialize
  initialize(config: OrchestratorConfig): Promise<void>;

  // Execute task
  execute(task: Task): Promise<Result>;

  // Agent management
  getAgents(): IAgent[];
  getAgent(id: string): IAgent | null;

  // Extension point
  registerAgent(agent: IAgent): void;
}

// ============================================================================
// Message Bus Interface (for multi-agent, reserved)
// ============================================================================

export type MessageHandler = (message: Message) => Promise<void>;

export interface IMessageBus {
  // Send message
  send(message: Message): Promise<void>;

  // Subscribe to messages
  subscribe(agentId: string, handler: MessageHandler): void;

  // Broadcast message
  broadcast(message: Omit<Message, 'to'>): Promise<void>;
}

// ============================================================================
// Template Manager Interface
// ============================================================================

export interface ITemplateProvider {
  list(): Promise<Template[]>;
  get(name: string): Promise<Template | null>;
}

export interface ITemplateManager {
  // List templates
  list(): Promise<Template[]>;
  get(name: string): Promise<Template | null>;

  // Apply template
  apply(name: string, target: string): Promise<void>;

  // Save template
  save(name: string, source: string): Promise<void>;

  // Extension point
  registerProvider(provider: ITemplateProvider): void;
}
