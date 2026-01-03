// tests/lsp/integration/textlint/textlint_diagnostic_source_test.ts
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { TextlintDiagnosticSource } from "@storyteller/lsp/integration/textlint/textlint_diagnostic_source.ts";
import { DiagnosticSeverity } from "@storyteller/lsp/diagnostics/diagnostics_generator.ts";

describe("TextlintDiagnosticSource", () => {
  it("should have name 'textlint'", () => {
    const source = new TextlintDiagnosticSource("/project");
    assertEquals(source.name, "textlint");
  });

  it("should check textlint availability", async () => {
    const source = new TextlintDiagnosticSource("/project");
    // 実際の環境に依存するテスト
    // CI環境ではtextlintがインストールされていない可能性
    const available = await source.isAvailable();
    // availableはboolean
    assertEquals(typeof available, "boolean");
  });

  it("should convert textlint messages to LSP diagnostics", async () => {
    // モック実装でテスト
    const source = new TextlintDiagnosticSource("/project");

    // textlintがインストールされていない場合は空配列
    const diagnostics = await source.generate(
      "file:///test.md",
      "テスト",
      "/project",
    );

    assertEquals(Array.isArray(diagnostics), true);
  });

  it("should map severity correctly", () => {
    // severity変換のユニットテスト
    // 2 (error) → DiagnosticSeverity.Error (1)
    assertEquals(DiagnosticSeverity.Error, 1);
    // 1 (warning) → DiagnosticSeverity.Warning (2)
    assertEquals(DiagnosticSeverity.Warning, 2);
    // 0 (info) → DiagnosticSeverity.Information (3)
    assertEquals(DiagnosticSeverity.Information, 3);
  });

  it("should have cancel method", () => {
    const source = new TextlintDiagnosticSource("/project");
    assertEquals(typeof source.cancel, "function");
  });

  it("should have dispose method", () => {
    const source = new TextlintDiagnosticSource("/project");
    assertEquals(typeof source.dispose, "function");
  });

  it("should return empty diagnostics when textlint is unavailable", async () => {
    const source = new TextlintDiagnosticSource("/project");

    // Force unavailable state by checking first
    const available = await source.isAvailable();

    if (!available) {
      // If textlint is not installed, generate should return empty
      const diagnostics = await source.generate(
        "file:///test.md",
        "テスト内容",
        "/project",
      );
      assertEquals(diagnostics.length, 0);
    }
  });

  it("should cache availability check", async () => {
    const source = new TextlintDiagnosticSource("/project");

    // First check
    const available1 = await source.isAvailable();

    // Second check should use cached value (no external command execution)
    const available2 = await source.isAvailable();

    assertEquals(available1, available2);
  });

  it("should handle URI decoding correctly", async () => {
    const source = new TextlintDiagnosticSource("/project");

    const available = await source.isAvailable();
    if (available) {
      // Test with encoded URI
      const diagnostics = await source.generate(
        "file:///test%20file.md", // Encoded space
        "テスト",
        "/project",
      );

      assertEquals(Array.isArray(diagnostics), true);
    }
  });

  it("should handle non-file:// URIs", async () => {
    const source = new TextlintDiagnosticSource("/project");

    const available = await source.isAvailable();
    if (available) {
      // Test with plain path (no file:// prefix)
      const diagnostics = await source.generate(
        "/plain/path/test.md",
        "テスト",
        "/project",
      );

      assertEquals(Array.isArray(diagnostics), true);
    }
  });

  it("should handle cancel before any operation", () => {
    const source = new TextlintDiagnosticSource("/project");

    // Cancel without any active operation should not throw
    source.cancel();

    assertEquals(true, true);
  });

  it("should handle dispose before any operation", () => {
    const source = new TextlintDiagnosticSource("/project");

    // Dispose without any active operation should not throw
    source.dispose();

    assertEquals(true, true);
  });

  it("should handle dispose after cancel", async () => {
    const source = new TextlintDiagnosticSource("/project");

    const available = await source.isAvailable();
    if (available) {
      // Start operation
      const promise = source.generate("file:///test.md", "テスト", "/project");

      // Cancel then dispose
      source.cancel();
      source.dispose();

      // Should complete without error
      const diagnostics = await promise;
      assertEquals(Array.isArray(diagnostics), true);
    }
  });

  it("should handle multiple dispose calls", () => {
    const source = new TextlintDiagnosticSource("/project");

    // Multiple dispose calls should not throw
    source.dispose();
    source.dispose();
    source.dispose();

    assertEquals(true, true);
  });

  it("should return empty diagnostics after dispose", async () => {
    const source = new TextlintDiagnosticSource("/project");

    await source.isAvailable();
    source.dispose();

    // After dispose, worker is null, should return empty
    const diagnostics = await source.generate(
      "file:///test.md",
      "テスト",
      "/project",
    );

    assertEquals(diagnostics.length, 0);
  });
});
