import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { TextlintRunner } from "@storyteller/shared/textlint/runner.ts";
import type {
  TextlintCheckOptions,
  TextlintFixOptions,
} from "@storyteller/shared/textlint/types.ts";

describe("TextlintRunner", () => {
  it("should instantiate with project root", () => {
    const runner = new TextlintRunner("/project");
    assertExists(runner);
  });

  it("should have check method", () => {
    const runner = new TextlintRunner("/project");
    assertEquals(typeof runner.check, "function");
  });

  it("should have fix method", () => {
    const runner = new TextlintRunner("/project");
    assertEquals(typeof runner.fix, "function");
  });

  it("check should accept TextlintCheckOptions", async () => {
    const runner = new TextlintRunner("/project");
    const options: TextlintCheckOptions = {
      path: "test.md",
    };
    // This will fail until implementation exists
    const result = await runner.check(options);
    assertEquals(typeof result.totalFiles, "number");
    assertEquals(typeof result.totalIssues, "number");
    assertEquals(typeof result.errorCount, "number");
    assertEquals(typeof result.warningCount, "number");
    assertEquals(typeof result.infoCount, "number");
    assertEquals(Array.isArray(result.results), true);
  });

  it("fix should accept TextlintFixOptions", async () => {
    const runner = new TextlintRunner("/project");
    const options: TextlintFixOptions = {
      path: "test.md",
    };
    // This will fail until implementation exists
    const result = await runner.fix(options);
    assertEquals(Array.isArray(result), true);
  });

  it("check should return proper structure for empty results", async () => {
    const runner = new TextlintRunner("/project");
    const result = await runner.check({ path: "nonexistent.md" });
    assertEquals(result.totalFiles, 0);
    assertEquals(result.totalIssues, 0);
    assertEquals(result.errorCount, 0);
    assertEquals(result.warningCount, 0);
    assertEquals(result.infoCount, 0);
    assertEquals(result.results, []);
  });
});
