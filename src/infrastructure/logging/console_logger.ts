import {
  type LogContext,
  type LogEvent,
  type LogLevel,
  type LoggerFactory,
  type LogWriter,
  logLevelWeight,
} from "../../shared/logging/types.ts";

const encoder = new TextEncoder();

export type ConsoleLoggerFormat = "human" | "json";

export interface WritableStream {
  write(chunk: string): void;
}

interface ConsoleLoggerFactoryOptions {
  readonly format: ConsoleLoggerFormat;
  readonly color: boolean;
  readonly timestamps: boolean;
  readonly stdout?: WritableStream;
  readonly stderr?: WritableStream;
  readonly clock?: () => Date;
}

const SEVERITY_THRESHOLD = logLevelWeight("warn");

export class ConsoleLoggerFactory implements LoggerFactory {
  #format: ConsoleLoggerFormat;
  #color: boolean;
  #timestamps: boolean;
  #stdout: WritableStream;
  #stderr: WritableStream;
  #clock: () => Date;

  constructor(options: ConsoleLoggerFactoryOptions) {
    this.#format = options.format;
    this.#color = options.color;
    this.#timestamps = options.timestamps;
    this.#stdout = options.stdout ?? defaultStdout();
    this.#stderr = options.stderr ?? defaultStderr();
    this.#clock = options.clock ?? (() => new Date());
  }

  create(scope: string, baseContext?: LogContext): LogWriter {
    const context = baseContext ?? {};
    return {
      write: (event) => {
        const enriched: LogEvent = {
          ...event,
          scope,
          context: {
            ...context,
            ...(event.context ?? {}),
          },
          timestamp: this.#timestamps ? event.timestamp : this.#clock(),
        };

        const formatted = this.#format === "json"
          ? this.#formatJson(enriched)
          : this.#formatHuman(enriched);

        const writer = this.#selectStream(event.level);
        writer.write(formatted + "\n");
      },
    };
  }

  #formatHuman(event: LogEvent): string {
    const timestamp = this.#timestamps
      ? event.timestamp.toISOString() + " "
      : "";
    const level = event.level.toUpperCase();
    const scope = event.scope;
    const metadata = event.metadata
      ? ` ${JSON.stringify(event.metadata)}`
      : "";
    const context = event.context && Object.keys(event.context).length > 0
      ? ` ${JSON.stringify(event.context)}`
      : "";
    const message = `${timestamp}[${level}] ${scope} ${event.message}${metadata}${context}`;
    return this.#color ? applyColor(event.level, message) : message;
  }

  #formatJson(event: LogEvent): string {
    const payload: Record<string, unknown> = {
      level: event.level,
      scope: event.scope,
      message: event.message,
      timestamp: event.timestamp.toISOString(),
      context: event.context,
      metadata: event.metadata,
    };

    return JSON.stringify(payload);
  }

  #selectStream(level: LogLevel): WritableStream {
    return logLevelWeight(level) >= SEVERITY_THRESHOLD ? this.#stderr
      : this.#stdout;
  }
}

function defaultStdout(): WritableStream {
  const writer = (text: string) => {
    try {
      Deno.stdout.writeSync(encoder.encode(text));
    } catch {
      console.log(text);
    }
  };
  return { write: writer };
}

function defaultStderr(): WritableStream {
  const writer = (text: string) => {
    try {
      Deno.stderr.writeSync(encoder.encode(text));
    } catch {
      console.error(text);
    }
  };
  return { write: writer };
}

function applyColor(level: LogLevel, message: string): string {
  const RESET = "\u001b[0m";
  const colors: Record<LogLevel, string> = {
    trace: "\u001b[90m",
    debug: "\u001b[36m",
    info: "\u001b[32m",
    warn: "\u001b[33m",
    error: "\u001b[31m",
    fatal: "\u001b[35m",
  };
  const color = colors[level] ?? "";
  if (!color) {
    return message;
  }
  return `${color}${message}${RESET}`;
}

