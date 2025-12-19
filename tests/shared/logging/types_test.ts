import { assertEquals } from "@std/assert";
import {
  compareLogLevel,
  LOG_LEVELS,
  type LogLevel,
  logLevelWeight,
} from "@storyteller/shared/logging/types.ts";

Deno.test("logLevelWeight returns ordered weights", () => {
  // Each level should have a higher weight than the previous one
  let previousWeight = -Infinity;
  for (const level of LOG_LEVELS) {
    const weight = logLevelWeight(level);
    assertEquals(weight > previousWeight, true);
    previousWeight = weight;
  }
});

Deno.test("logLevelWeight returns specific values for each level", () => {
  assertEquals(logLevelWeight("trace"), 10);
  assertEquals(logLevelWeight("debug"), 20);
  assertEquals(logLevelWeight("info"), 30);
  assertEquals(logLevelWeight("warn"), 40);
  assertEquals(logLevelWeight("error"), 50);
  assertEquals(logLevelWeight("fatal"), 60);
});

Deno.test("compareLogLevel returns negative when a < b", () => {
  assertEquals(compareLogLevel("trace", "info") < 0, true);
  assertEquals(compareLogLevel("debug", "error") < 0, true);
  assertEquals(compareLogLevel("warn", "fatal") < 0, true);
});

Deno.test("compareLogLevel returns positive when a > b", () => {
  assertEquals(compareLogLevel("error", "debug") > 0, true);
  assertEquals(compareLogLevel("fatal", "trace") > 0, true);
  assertEquals(compareLogLevel("info", "trace") > 0, true);
});

Deno.test("compareLogLevel returns zero when a === b", () => {
  const levels: LogLevel[] = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
  ];
  for (const level of levels) {
    assertEquals(compareLogLevel(level, level), 0);
  }
});
