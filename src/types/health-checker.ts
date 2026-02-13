/**
 * Health Checker Types and Interfaces
 *
 * Defines the core types and interfaces for the health checking system.
 */

/**
 * Check level - severity of the check result
 */
export enum CheckLevel {
  /** Critical error that blocks functionality */
  Error = 'error',
  /** Warning that may affect functionality */
  Warning = 'warning',
  /** Informational message */
  Info = 'info',
  /** Success message */
  Success = 'success',
}

/**
 * Check category - type of check being performed
 */
export enum CheckCategory {
  /** Project initialization and structure */
  Initialization = 'initialization',
  /** CLAUDE.md configuration */
  ClaudeMd = 'claude-md',
  /** skill-rules.json configuration */
  SkillRules = 'skill-rules',
  /** settings.json configuration */
  Configuration = 'configuration',
  /** Skills system */
  Skills = 'skills',
  /** Hooks system */
  Hooks = 'hooks',
  /** File structure */
  Files = 'files',
  /** Environment and dependencies */
  Environment = 'environment',
  /** Security */
  Security = 'security',
  /** Performance */
  Performance = 'performance',
  /** Cross-platform compatibility */
  Platform = 'platform',
}

/**
 * Check result from a health checker
 */
export interface CheckResult {
  /** Unique identifier for this check */
  id: string;

  /** Category of the check */
  category: CheckCategory;

  /** Level/severity of the result */
  level: CheckLevel;

  /** Short title of the check */
  title: string;

  /** Detailed message */
  message: string;

  /** Suggested fix or action */
  suggestion?: string;

  /** File path related to this check (if applicable) */
  filePath?: string;

  /** Line number in the file (if applicable) */
  line?: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  /** Whether this issue can be auto-fixed */
  fixable?: boolean;

  /** Function to auto-fix this issue */
  fix?: () => Promise<void>;
}

/**
 * Health checker interface
 *
 * All health checkers must implement this interface.
 */
export interface IHealthChecker {
  /** Unique name of the checker */
  name: string;

  /** Category of checks this checker performs */
  category: CheckCategory;

  /** Priority level (0 = highest, 3 = lowest) */
  priority: 0 | 1 | 2 | 3;

  /** Description of what this checker does */
  description: string;

  /**
   * Run the health check
   *
   * @param context - Check context with project information
   * @returns Array of check results
   */
  check(context: CheckContext): Promise<CheckResult[]>;

  /**
   * Whether this checker is enabled
   *
   * @param context - Check context
   * @returns True if enabled
   */
  isEnabled?(context: CheckContext): boolean;
}

/**
 * Context passed to health checkers
 */
export interface CheckContext {
  /** Current working directory */
  cwd: string;

  /** Path to .claude directory */
  claudeDir: string;

  /** Check mode */
  mode: 'quick' | 'standard' | 'full' | 'detailed';

  /** Verbose output */
  verbose: boolean;

  /** Specific check type filter */
  checkType?: string;

  /** Additional options */
  options?: Record<string, unknown>;
}

/**
 * Check mode configuration
 */
export interface CheckModeConfig {
  /** Mode name */
  name: string;

  /** Description */
  description: string;

  /** Priority levels to include (0-3) */
  priorities: number[];

  /** Estimated time in seconds */
  estimatedTime: number;
}

/**
 * Available check modes
 */
export const CHECK_MODES: Record<string, CheckModeConfig> = {
  quick: {
    name: 'Quick',
    description: 'P0 critical errors only',
    priorities: [0],
    estimatedTime: 2,
  },
  standard: {
    name: 'Standard',
    description: 'P0 + P1 errors (default)',
    priorities: [0, 1],
    estimatedTime: 5,
  },
  full: {
    name: 'Full',
    description: 'P0 + P1 + P2 errors',
    priorities: [0, 1, 2],
    estimatedTime: 10,
  },
  detailed: {
    name: 'Detailed',
    description: 'All checks with detailed report',
    priorities: [0, 1, 2, 3],
    estimatedTime: 0, // No limit
  },
};
