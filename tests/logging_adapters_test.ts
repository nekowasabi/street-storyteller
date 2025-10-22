import { assert, assertEquals } from "./asserts.ts";
import { LogManager } from "../src/shared/logging/log_manager.ts";
import { ConsoleLoggerFactory } from "../src/infrastructure/logging/console_logger.ts";
import { MemoryLoggerFactory } from "../src/infrastructure/logging/memory_logger.ts";

class BufferWriter {
  #chunks: string[] = [];

  write(text: string): void {
    this.#chunks.push(text);
  }

  toString(): string {
    return this.#chunks.join("");
  }

  get length(): number {
    return this.#chunks.length;
  }
}

Deno.test("ConsoleLoggerFactory routes info logs to stdout", () => {
  const stdout = new BufferWriter();
  const stderr = new BufferWriter();

  const factory = new ConsoleLoggerFactory({
    format: "human",
    color: false,
    timestamps: false,
    stdout,
    stderr,
  });

  const manager = new LogManager({
    level: "info",
    factory,
  });

  const logger = manager.createLogger("cli.generate");
  logger.info("project created", { project: "demo" });

  assertEquals(stderr.length, 0);
  assertEquals(stdout.length, 1);
  const output = stdout.toString();
  assert(output.includes("INFO"));
  assert(output.includes("cli.generate"));
  assert(output.includes("project created"));
});

Deno.test("ConsoleLoggerFactory routes warn logs to stderr", () => {
  const stdout = new BufferWriter();
  const stderr = new BufferWriter();

  const factory = new ConsoleLoggerFactory({
    format: "human",
    color: false,
    timestamps: false,
    stdout,
    stderr,
  });

  const manager = new LogManager({
    level: "debug",
    factory,
  });

  const logger = manager.createLogger("cli.generate");
  logger.warn("disk nearly full");

  assertEquals(stdout.length, 0);
  assertEquals(stderr.length, 1);
  const output = stderr.toString();
  assert(output.includes("WARN"));
  assert(output.includes("disk nearly full"));
});

Deno.test("MemoryLoggerFactory captures structured events", () => {
  const factory = new MemoryLoggerFactory();
  const manager = new LogManager({
    level: "debug",
    factory,
    globalContext: { environment: "test" },
  });
  const logger = manager.createLogger("cli.generate", { requestId: "abc" });

  logger.error("failed", { reason: "boom" });

  const events = factory.events;
  assertEquals(events.length, 1);
  const event = events[0];
  assertEquals(event.level, "error");
  assertEquals(event.scope, "cli.generate");
  assertEquals(event.context?.environment, "test");
  assertEquals(event.context?.requestId, "abc");
  assertEquals(event.metadata?.reason, "boom");
});

