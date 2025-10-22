export type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal";

export const LOG_LEVELS: readonly LogLevel[] = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
] as const;

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export type LogContext = Readonly<Record<string, unknown>>;

export type LogMetadata = Readonly<Record<string, unknown>>;

export interface LogEvent {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: Date;
  readonly scope: string;
  readonly context?: LogContext;
  readonly metadata?: LogMetadata;
  readonly error?: unknown;
}

export interface LogWriter {
  write(event: LogEvent): void;
}

export interface Logger {
  readonly scope: string;
  log(level: LogLevel, message: string, metadata?: LogMetadata): void;
  trace(message: string, metadata?: LogMetadata): void;
  debug(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
  fatal(message: string, metadata?: LogMetadata): void;
  withContext(context: LogContext): Logger;
}

export interface LoggerFactory {
  create(scope: string, baseContext?: LogContext): LogWriter;
}

export function logLevelWeight(level: LogLevel): number {
  return LOG_LEVEL_ORDER[level];
}

export function compareLogLevel(a: LogLevel, b: LogLevel): number {
  return logLevelWeight(a) - logLevelWeight(b);
}

