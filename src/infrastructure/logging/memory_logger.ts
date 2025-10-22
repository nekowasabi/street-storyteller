import type {
  LogContext,
  LogEvent,
  LoggerFactory,
  LogWriter,
} from "../../shared/logging/types.ts";

export class MemoryLoggerFactory implements LoggerFactory {
  #events: LogEvent[] = [];

  get events(): readonly LogEvent[] {
    return this.#events;
  }

  clear(): void {
    this.#events = [];
  }

  create(scope: string, baseContext?: LogContext): LogWriter {
    return {
      write: (event) => {
        this.#events.push({
          ...event,
          scope,
          context: {
            ...(baseContext ?? {}),
            ...(event.context ?? {}),
          },
        });
      },
    };
  }
}

