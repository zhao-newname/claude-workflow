/**
 * ConfigManager - Manages workflow configuration
 *
 * Features:
 * - JSON Schema validation
 * - Configuration read/write with dot notation
 * - Configuration migration support
 * - Custom validators
 * - Dirty tracking for efficient saves
 */

import Ajv, { type JSONSchemaType } from 'ajv';
import type {
  WorkflowConfig,
  ValidationResult,
  ValidationError,
} from '../types/index.js';
import type { IConfigManager, IConfigValidator, IConfigTransformer } from '../types/interfaces.js';
import { get, set, deepMerge, readJson, writeJson, fileExists } from '../utils/fs.js';
import { logger } from '../utils/logger.js';

/**
 * JSON Schema for WorkflowConfig validation
 */
const configSchema: JSONSchemaType<WorkflowConfig> = {
  type: 'object',
  properties: {
    version: { type: 'string' },
    mode: { type: 'string', enum: ['single-agent', 'multi-agent'] },
    skills: {
      type: 'object',
      nullable: true,
      required: [],
      additionalProperties: true,
    } as any,
    hooks: {
      type: 'object',
      nullable: true,
      required: [],
      additionalProperties: true,
    } as any,
    extensions: {
      type: 'object',
      nullable: true,
      required: [],
      additionalProperties: true,
    },
  },
  required: ['version', 'mode'],
  additionalProperties: false,
};

export class ConfigManager implements IConfigManager {
  private config: WorkflowConfig;
  private validators: IConfigValidator[] = [];
  private transformers: IConfigTransformer[] = [];
  private dirty: boolean = false;
  private ajv: Ajv;

  private constructor(
    private configPath: string,
    config: WorkflowConfig
  ) {
    this.config = config;
    this.ajv = new Ajv();

    // Register default JSON Schema validator
    this.registerValidator(new JSONSchemaValidator(this.ajv, configSchema));
  }

  /**
   * Load config from file or create default
   */
  static async load(configPath: string): Promise<ConfigManager> {
    let config: WorkflowConfig;

    if (await fileExists(configPath)) {
      try {
        config = await readJson<WorkflowConfig>(configPath);
        logger.debug(`Config loaded from ${configPath}`);
      } catch (error) {
        logger.error(`Failed to load config from ${configPath}:`, error);
        config = ConfigManager.getDefaultConfig();
      }
    } else {
      config = ConfigManager.getDefaultConfig();
      // Save default config
      await writeJson(configPath, config);
      logger.info(`Created default config at ${configPath}`);
    }

    return new ConfigManager(configPath, config);
  }

  /**
   * Get default configuration
   */
  private static getDefaultConfig(): WorkflowConfig {
    return {
      version: '1.0',
      mode: 'single-agent',
      skills: {},
      hooks: {},
    };
  }

  /**
   * Get config value by key (supports dot notation)
   */
  get<T>(key: string): T | undefined {
    return get<T>(this.config as unknown as Record<string, unknown>, key);
  }

  /**
   * Get all config
   */
  getAll(): WorkflowConfig {
    return { ...this.config };
  }

  /**
   * Set config value by key (supports dot notation)
   */
  set(key: string, value: unknown): void {
    set(this.config as unknown as Record<string, unknown>, key, value);
    this.dirty = true;
    logger.debug(`Config updated: ${key} = ${JSON.stringify(value)}`);
  }

  /**
   * Merge partial config (deep merge)
   */
  merge(config: Partial<WorkflowConfig>): void {
    this.config = deepMerge(
      this.config as unknown as Record<string, unknown>,
      config as unknown as Record<string, unknown>
    ) as unknown as WorkflowConfig;
    this.dirty = true;
    logger.debug('Config merged');
  }

  /**
   * Validate config using all registered validators
   */
  validate(): ValidationResult {
    const allErrors: ValidationError[] = [];

    for (const validator of this.validators) {
      const result = validator.validate(this.config);
      if (!result.valid) {
        allErrors.push(...result.errors);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  /**
   * Register a custom validator
   */
  registerValidator(validator: IConfigValidator): void {
    this.validators.push(validator);
    logger.debug('Validator registered');
  }

  /**
   * Register a config transformer for migration
   */
  registerTransformer(transformer: IConfigTransformer): void {
    this.transformers.push(transformer);
    logger.debug(`Transformer registered: ${transformer.from} → ${transformer.to}`);
  }

  /**
   * Migrate config to target version
   */
  async migrate(targetVersion: string): Promise<void> {
    const currentVersion = this.config.version;

    if (currentVersion === targetVersion) {
      logger.info('Config already at target version');
      return;
    }

    // Find migration path
    const transformer = this.transformers.find(
      (t) => t.from === currentVersion && t.to === targetVersion
    );

    if (!transformer) {
      throw new Error(
        `No migration path from version ${currentVersion} to ${targetVersion}`
      );
    }

    // Apply transformation
    this.config = transformer.transform(this.config);
    this.dirty = true;

    logger.info(`Config migrated from ${currentVersion} to ${targetVersion}`);

    // Save migrated config
    await this.save();
  }

  /**
   * Save config to file (only if dirty)
   */
  async save(): Promise<void> {
    if (!this.dirty) {
      logger.debug('Config not dirty, skipping save');
      return;
    }

    try {
      await writeJson(this.configPath, this.config);
      this.dirty = false;
      logger.info(`Config saved to ${this.configPath}`);
    } catch (error) {
      logger.error(`Failed to save config to ${this.configPath}:`, error);
      throw error;
    }
  }

  /**
   * Reset config to default
   */
  reset(): void {
    this.config = ConfigManager.getDefaultConfig();
    this.dirty = true;
    logger.info('Config reset to default');
  }

  /**
   * Check if config has unsaved changes
   */
  isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Get config file path
   */
  getConfigPath(): string {
    return this.configPath;
  }
}

/**
 * JSON Schema validator implementation
 */
class JSONSchemaValidator implements IConfigValidator {
  private validateFn: ReturnType<Ajv['compile']>;

  constructor(ajv: Ajv, schema: JSONSchemaType<WorkflowConfig>) {
    this.validateFn = ajv.compile(schema);
  }

  validate(config: WorkflowConfig): ValidationResult {
    const valid = this.validateFn(config);

    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors: ValidationError[] = (this.validateFn.errors || []).map((error) => ({
      path: error.instancePath || error.schemaPath,
      message: error.message || 'Validation error',
    }));

    return { valid: false, errors };
  }
}
