import type { Result } from "../shared/result.ts";
import type { Logger } from "../shared/logging/types.ts";
import type { AppConfig } from "../shared/config/schema.ts";

export interface CommandContext {
  readonly args?: Record<string, unknown>;
  readonly presenter: OutputPresenter;
  readonly config: ConfigurationManagerRef;
  readonly logger: Logger;
}

export interface OutputPresenter {
  showInfo(message: string): void;
  showSuccess(message: string): void;
  showWarning(message: string): void;
  showError(message: string): void;
}

export interface CommandExecutionError {
  readonly code: string;
  readonly message: string;
}

export interface CommandHandler {
  readonly name: string;
  readonly dependencies?: readonly string[];
  execute(context: CommandContext): Promise<Result<unknown, CommandExecutionError>>;
}

export interface CommandRegistrationError {
  readonly code: "duplicate_command" | "missing_dependency";
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface CliDependencies {
  readonly presenter?: OutputPresenter;
  readonly createConfigurationManager?: () => ConfigurationManagerRef;
  readonly loggingServiceFactory?: (deps: {
    configurationManager: ConfigurationManagerRef;
  }) => LoggingServiceRef;
}

export interface ConfigurationManagerRef {
  resolve(): Promise<AppConfig>;
  refresh?(): Promise<AppConfig>;
  get?<T>(path: string, fallback?: T): Promise<T | undefined>;
  require?<T>(path: string): Promise<T>;
}

export interface LoggingServiceRef {
  initialize(): Promise<void>;
  getLogger(scope: string, context?: Record<string, unknown>): Logger;
}
