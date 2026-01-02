/**
 * CLI lint コマンドのテスト
 * Process 10-13: CLI lint基本コマンド + オプション拡充
 */
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { lintCommandDescriptor } from "@storyteller/cli/modules/lint/lint.ts";

describe("CLI lint command", () => {
  it("should have correct name", () => {
    assertEquals(lintCommandDescriptor.name, "lint");
  });

  it("should have summary", () => {
    assertEquals(typeof lintCommandDescriptor.summary, "string");
    assertEquals(lintCommandDescriptor.summary.length > 0, true);
  });

  it("should have handler", () => {
    assertEquals(typeof lintCommandDescriptor.handler, "object");
    assertEquals(typeof lintCommandDescriptor.handler.name, "string");
    assertEquals(typeof lintCommandDescriptor.handler.execute, "function");
  });

  it("should have options for path, dir, fix, json", () => {
    const optionNames =
      lintCommandDescriptor.options?.map((o) => o.name) ?? [];
    assertEquals(optionNames.includes("path"), true);
    assertEquals(optionNames.includes("dir"), true);
    assertEquals(optionNames.includes("fix"), true);
    assertEquals(optionNames.includes("json"), true);
  });

  it("should have recursive option", () => {
    const optionNames =
      lintCommandDescriptor.options?.map((o) => o.name) ?? [];
    assertEquals(optionNames.includes("recursive"), true);
  });

  it("should have rule option (Process 13)", () => {
    const optionNames =
      lintCommandDescriptor.options?.map((o) => o.name) ?? [];
    assertEquals(optionNames.includes("rule"), true);
  });

  it("should have config option (Process 13)", () => {
    const optionNames =
      lintCommandDescriptor.options?.map((o) => o.name) ?? [];
    assertEquals(optionNames.includes("config"), true);
  });

  it("should have severity option (Process 13)", () => {
    const optionNames =
      lintCommandDescriptor.options?.map((o) => o.name) ?? [];
    assertEquals(optionNames.includes("severity"), true);
  });

  it("should have with-entity-check option (Process 13)", () => {
    const optionNames =
      lintCommandDescriptor.options?.map((o) => o.name) ?? [];
    assertEquals(optionNames.includes("with-entity-check"), true);
  });

  it("should have examples", () => {
    assertEquals(Array.isArray(lintCommandDescriptor.examples), true);
    assertEquals((lintCommandDescriptor.examples?.length ?? 0) > 0, true);
  });
});
