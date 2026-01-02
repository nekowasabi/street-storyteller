/**
 * StorytellerDiagnosticSourceのテスト
 * Process 2: Red Phase
 */

import { assertEquals } from "@std/assert";
import { beforeEach, describe, it } from "@std/testing/bdd";
import { StorytellerDiagnosticSource } from "@storyteller/lsp/diagnostics/storyteller_diagnostic_source.ts";
import { DiagnosticsGenerator } from "@storyteller/lsp/diagnostics/diagnostics_generator.ts";
import { PositionedDetector } from "@storyteller/lsp/detection/positioned_detector.ts";

describe("StorytellerDiagnosticSource", () => {
  let source: StorytellerDiagnosticSource;

  beforeEach(() => {
    const detector = new PositionedDetector([]);
    const generator = new DiagnosticsGenerator(detector);
    source = new StorytellerDiagnosticSource(generator);
  });

  it("should have name 'storyteller'", () => {
    assertEquals(source.name, "storyteller");
  });

  it("should always be available", async () => {
    const available = await source.isAvailable();
    assertEquals(available, true);
  });

  it("should generate diagnostics via generator", async () => {
    const diagnostics = await source.generate(
      "file:///test.md",
      "テスト内容",
      "/project",
    );
    // 空の検出器なので診断なし
    assertEquals(diagnostics.length, 0);
  });
});
