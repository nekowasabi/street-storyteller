import { assertEquals } from "../../asserts.ts";
import { MemoryLoggerFactory } from "@storyteller/infrastructure/logging/memory_logger.ts";

Deno.test("MemoryLoggerFactory - write stores events", () => {
  const factory = new MemoryLoggerFactory();
  const logger = factory.create("test-scope");

  logger.write({
    timestamp: new Date(),
    level: "info",
    message: "test message",
    scope: "test-scope",
  });

  assertEquals(factory.events.length, 1);
  assertEquals(factory.events[0].scope, "test-scope");
  assertEquals(factory.events[0].message, "test message");
  assertEquals(factory.events[0].level, "info");
});

Deno.test("MemoryLoggerFactory - clear removes all events", () => {
  const factory = new MemoryLoggerFactory();
  const logger = factory.create("test-scope");

  logger.write({
    timestamp: new Date(),
    level: "info",
    message: "msg1",
    scope: "test-scope",
  });
  logger.write({
    timestamp: new Date(),
    level: "debug",
    message: "msg2",
    scope: "test-scope",
  });

  assertEquals(factory.events.length, 2);

  factory.clear();
  assertEquals(factory.events.length, 0);
});

Deno.test("MemoryLoggerFactory - merges base context with event context", () => {
  const factory = new MemoryLoggerFactory();
  const logger = factory.create("test-scope", { env: "test" });

  logger.write({
    timestamp: new Date(),
    level: "warn",
    message: "warning",
    scope: "test-scope",
    context: { detail: "extra" },
  });

  assertEquals(factory.events.length, 1);
  assertEquals(factory.events[0].context?.env, "test");
  assertEquals(factory.events[0].context?.detail, "extra");
});

Deno.test("MemoryLoggerFactory - handles undefined context", () => {
  const factory = new MemoryLoggerFactory();
  const logger = factory.create("test-scope");

  logger.write({
    timestamp: new Date(),
    level: "error",
    message: "error message",
    scope: "test-scope",
  });

  assertEquals(factory.events.length, 1);
  // context is merged as empty objects when both base and event context are undefined
  assertEquals(Object.keys(factory.events[0].context ?? {}).length, 0);
});
