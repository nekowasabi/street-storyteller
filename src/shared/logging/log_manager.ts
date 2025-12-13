import {
  compareLogLevel,
  type LogContext,
  type LogEvent,
  type Logger,
  type LoggerFactory,
  type LogLevel,
  type LogMetadata,
  type LogWriter,
} from "./types.ts";

export interface LogManagerOptions {
  readonly level: LogLevel;
  readonly factory: LoggerFactory;
  readonly globalContext?: LogContext;
  readonly clock?: () => Date;
}

export class LogManager {
  #level: LogLevel;
  #factory: LoggerFactory;
  #globalContext: LogContext;
  #clock: () => Date;

  constructor(options: LogManagerOptions) {
    this.#level = options.level;
    this.#factory = options.factory;
    this.#globalContext = options.globalContext ?? {};
    this.#clock = options.clock ?? (() => new Date());
  }

  createLogger(scope: string, context: LogContext = {}): Logger {
    const baseContext = { ...this.#globalContext, ...context };
    const writer = this.#factory.create(scope, baseContext);
    return this.#createManagedLogger(scope, writer, baseContext);
  }

  #createManagedLogger(
    scope: string,
    writer: LogWriter,
    context: LogContext,
  ): Logger {
    const baseContext = { ...context };

    const emit = (level: LogLevel, message: string, metadata?: LogMetadata) => {
      if (!this.#shouldLog(level)) {
        return;
      }

      const event: LogEvent = {
        level,
        message,
        timestamp: this.#clock(),
        scope,
        context: baseContext,
        metadata,
      };

      writer.write(event);
    };

    const withContext = (extra: LogContext): Logger => {
      const merged = { ...baseContext, ...extra };
      return this.#createManagedLogger(scope, writer, merged);
    };

    return {
      scope,
      log: emit,
      trace: (message, metadata) => emit("trace", message, metadata),
      debug: (message, metadata) => emit("debug", message, metadata),
      info: (message, metadata) => emit("info", message, metadata),
      warn: (message, metadata) => emit("warn", message, metadata),
      error: (message, metadata) => emit("error", message, metadata),
      fatal: (message, metadata) => emit("fatal", message, metadata),
      withContext,
    };
  }

  #shouldLog(level: LogLevel): boolean {
    return compareLogLevel(level, this.#level) >= 0;
  }
}
