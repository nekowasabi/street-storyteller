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
  path?: readonly string[];
  aliases?: readonly string[];
  readonly dependencies?: readonly string[];
  execute(context: CommandContext): Promise<Result<unknown, CommandExecutionError>>;
}

export interface CommandRegistrationError {
  readonly code: "duplicate_command" | "missing_dependency";
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface CommandOptionDescriptor {
  readonly name: string;
  readonly summary: string;
  readonly aliases?: readonly string[];
  readonly type: "string" | "number" | "boolean";
  readonly required?: boolean;
  readonly defaultValue?: string | number | boolean;
}

export interface CommandExampleDescriptor {
  readonly summary: string;
  readonly command: string;
}

export interface CommandDescriptor {
  readonly name: string;
  readonly summary: string;
  readonly description?: string;
  readonly usage?: string;
  readonly path?: readonly string[];
  readonly aliases?: readonly string[];
  readonly options?: readonly CommandOptionDescriptor[];
  readonly examples?: readonly CommandExampleDescriptor[];
  readonly children?: readonly CommandDescriptor[];
  readonly handler: CommandHandler;
}

export interface CommandTreeNode {
  readonly name: string;
  readonly path: readonly string[];
  readonly aliases: readonly string[];
  readonly summary?: string;
  readonly description?: string;
  readonly usage?: string;
  readonly options: readonly CommandOptionDescriptor[];
  readonly examples: readonly CommandExampleDescriptor[];
  readonly children: readonly CommandTreeNode[];
  readonly executable: boolean;
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
