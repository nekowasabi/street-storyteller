/**
 * DiagnosticSourceインターフェースのテスト
 * Process 1: Red Phase
 */

import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import type { DiagnosticSource } from "@storyteller/lsp/diagnostics/diagnostic_source.ts";

describe("DiagnosticSource interface", () => {
  it("should have required properties", () => {
    // モック実装で型チェック
    const mockSource: DiagnosticSource = {
      name: "test",
      isAvailable: async () => true,
      generate: async () => [],
    };

    assertEquals(mockSource.name, "test");
    assertExists(mockSource.isAvailable);
    assertExists(mockSource.generate);
  });

  it("should support optional cancel method", () => {
    const mockSource: DiagnosticSource = {
      name: "test",
      isAvailable: async () => true,
      generate: async () => [],
      cancel: () => {},
    };

    assertExists(mockSource.cancel);
  });

  it("should support optional dispose method", () => {
    const mockSource: DiagnosticSource = {
      name: "test",
      isAvailable: async () => true,
      generate: async () => [],
      dispose: () => {},
    };

    assertExists(mockSource.dispose);
  });

  it("should generate diagnostics with correct structure", async () => {
    const mockSource: DiagnosticSource = {
      name: "test-source",
      isAvailable: async () => true,
      generate: async (_uri, _content, _projectRoot) => [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 5 },
          },
          message: "Test diagnostic",
          severity: 2,
          source: "test-source",
        },
      ],
    };

    const diagnostics = await mockSource.generate(
      "file:///test.md",
      "content",
      "/project",
    );

    assertEquals(diagnostics.length, 1);
    assertEquals(diagnostics[0].message, "Test diagnostic");
    assertEquals(diagnostics[0].source, "test-source");
  });
});
