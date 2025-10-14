import type { Result } from "../shared/result.ts";

export interface CommandContext {
  readonly args?: Record<string, unknown>;
  readonly presenter: OutputPresenter;
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
