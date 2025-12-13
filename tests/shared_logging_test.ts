import { assert, assertEquals } from "./asserts.ts";
import {
  LogManager,
  type LogManagerOptions,
} from "../src/shared/logging/log_manager.ts";
import type {
  LogContext,
  LogEvent,
  LoggerFactory,
  LogWriter,
} from "../src/shared/logging/types.ts";

class TestLoggerFactory implements LoggerFactory {
  #records: LogEvent[] = [];

  get events(): readonly LogEvent[] {
    return this.#records;
  }

  create(scope: string, baseContext?: LogContext): LogWriter {
    const context = baseContext ?? {};
    return {
      write: (event: LogEvent) => {
        this.#records.push({
          ...event,
          scope,
          context: {
            ...context,
            ...(event.context ?? {}),
          },
        });
      },
    };
  }
}

function createManager(overrides: Partial<LogManagerOptions> = {}): {
  manager: LogManager;
  factory: TestLoggerFactory;
} {
  const factory = new TestLoggerFactory();
  const manager = new LogManager({
    level: "info",
    factory,
    globalContext: { service: "test-suite" },
    ...overrides,
  });
  return { manager, factory };
}

Deno.test("LogManager filters events below the configured level", () => {
  const { manager, factory } = createManager({ level: "warn" });
  const logger = manager.createLogger("cli.generate", { requestId: "abc" });

  logger.debug("debug message");
  logger.info("info message");
  logger.error("error message", { detail: "boom" });

  assertEquals(factory.events.length, 1);
  const [event] = factory.events;
  assertEquals(event.level, "error");
  assertEquals(event.message, "error message");
  assertEquals(event.scope, "cli.generate");
  assertEquals(event.context?.service, "test-suite");
  assertEquals(event.context?.requestId, "abc");
  assertEquals(event.metadata?.detail, "boom");
  assert(event.timestamp instanceof Date);
});

Deno.test("LogManager child logger merges additional context and respects level order", () => {
  const { manager, factory } = createManager({ level: "debug" });
  const logger = manager.createLogger("cli.help", { correlationId: "root" });
  const child = logger.withContext({ correlationId: "child", userId: "u-1" });

  child.warn("child warning", { stage: "preflight" });

  assertEquals(factory.events.length, 1);
  const event = factory.events[0];
  assertEquals(event.level, "warn");
  assertEquals(event.scope, "cli.help");
  assertEquals(event.context?.service, "test-suite");
  assertEquals(event.context?.correlationId, "child");
  assertEquals(event.context?.userId, "u-1");
  assertEquals(event.metadata?.stage, "preflight");
  assert(event.timestamp instanceof Date);
});
