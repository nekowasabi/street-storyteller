/**
 * DiagnosticsPublisherテスト
 * Process6 Sub2: 診断発行機能のテスト
 *
 * TDD Red Phase: 実装がないため、このテストは失敗する
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DiagnosticsPublisher,
} from "../../src/lsp/diagnostics/diagnostics_publisher.ts";
import {
  type Diagnostic,
  DiagnosticSeverity,
} from "../../src/lsp/diagnostics/diagnostics_generator.ts";
import { createMockWriter } from "./helpers.ts";

// テスト用の診断データ
function createTestDiagnostic(
  line: number,
  character: number,
  message: string
): Diagnostic {
  return {
    range: {
      start: { line, character },
      end: { line, character: character + 2 },
    },
    severity: DiagnosticSeverity.Hint,
    message,
    source: "storyteller",
  };
}

Deno.test("DiagnosticsPublisher - publishes diagnostics notification", async () => {
  const mockWriter = createMockWriter();
  const publisher = new DiagnosticsPublisher(mockWriter);

  const uri = "file:///test.md";
  const diagnostics = [
    createTestDiagnostic(0, 0, "テスト診断1"),
    createTestDiagnostic(1, 5, "テスト診断2"),
  ];

  await publisher.publish(uri, diagnostics);

  // 書き込まれたデータを確認
  const writtenData = mockWriter.getData();
  assertExists(writtenData);

  // Content-Lengthヘッダーが含まれている
  assertEquals(writtenData.includes("Content-Length:"), true);

  // textDocument/publishDiagnostics通知が含まれている
  assertEquals(writtenData.includes("textDocument/publishDiagnostics"), true);

  // URIが含まれている
  assertEquals(writtenData.includes(uri), true);
});

Deno.test("DiagnosticsPublisher - clears diagnostics with empty array", async () => {
  const mockWriter = createMockWriter();
  const publisher = new DiagnosticsPublisher(mockWriter);

  const uri = "file:///test.md";

  // 空の配列で診断をクリア
  await publisher.publish(uri, []);

  const writtenData = mockWriter.getData();
  assertExists(writtenData);

  // 通知が送信されている
  assertEquals(writtenData.includes("textDocument/publishDiagnostics"), true);

  // diagnosticsが空の配列
  assertEquals(writtenData.includes('"diagnostics":[]'), true);
});

Deno.test("DiagnosticsPublisher - debounces rapid calls", async () => {
  const mockWriter = createMockWriter();
  const publisher = new DiagnosticsPublisher(mockWriter, { debounceMs: 50 });

  const uri = "file:///test.md";
  const diagnostics1 = [createTestDiagnostic(0, 0, "診断1")];
  const diagnostics2 = [createTestDiagnostic(0, 0, "診断2")];
  const diagnostics3 = [createTestDiagnostic(0, 0, "診断3")];

  // 短い間隔で複数回呼び出し
  publisher.publishDebounced(uri, diagnostics1);
  publisher.publishDebounced(uri, diagnostics2);
  publisher.publishDebounced(uri, diagnostics3);

  // デバウンス期間中は何も送信されない
  assertEquals(mockWriter.getData(), "");

  // デバウンス期間を待つ
  await new Promise((resolve) => setTimeout(resolve, 100));

  // 最後の診断のみが送信される
  const writtenData = mockWriter.getData();
  assertEquals(writtenData.includes("診断3"), true);
  assertEquals(writtenData.includes("診断1"), false);
  assertEquals(writtenData.includes("診断2"), false);
});

Deno.test("DiagnosticsPublisher - handles multiple URIs independently", async () => {
  const mockWriter = createMockWriter();
  const publisher = new DiagnosticsPublisher(mockWriter, { debounceMs: 50 });

  const uri1 = "file:///test1.md";
  const uri2 = "file:///test2.md";
  const diagnostics1 = [createTestDiagnostic(0, 0, "ファイル1の診断")];
  const diagnostics2 = [createTestDiagnostic(0, 0, "ファイル2の診断")];

  // 異なるURIに対して呼び出し
  publisher.publishDebounced(uri1, diagnostics1);
  publisher.publishDebounced(uri2, diagnostics2);

  // デバウンス期間を待つ
  await new Promise((resolve) => setTimeout(resolve, 100));

  const writtenData = mockWriter.getData();
  // 両方のURIの診断が送信される
  assertEquals(writtenData.includes(uri1), true);
  assertEquals(writtenData.includes(uri2), true);
});

Deno.test("DiagnosticsPublisher - cancel cancels pending publish", async () => {
  const mockWriter = createMockWriter();
  const publisher = new DiagnosticsPublisher(mockWriter, { debounceMs: 100 });

  const uri = "file:///test.md";
  const diagnostics = [createTestDiagnostic(0, 0, "キャンセルされる診断")];

  // 発行予約してすぐキャンセル
  publisher.publishDebounced(uri, diagnostics);
  publisher.cancel(uri);

  // デバウンス期間を待つ
  await new Promise((resolve) => setTimeout(resolve, 150));

  // 何も送信されていない
  assertEquals(mockWriter.getData(), "");
});

Deno.test("DiagnosticsPublisher - dispose cancels all pending publishes", async () => {
  const mockWriter = createMockWriter();
  const publisher = new DiagnosticsPublisher(mockWriter, { debounceMs: 100 });

  const uri1 = "file:///test1.md";
  const uri2 = "file:///test2.md";
  const diagnostics = [createTestDiagnostic(0, 0, "キャンセルされる診断")];

  // 複数の発行予約
  publisher.publishDebounced(uri1, diagnostics);
  publisher.publishDebounced(uri2, diagnostics);

  // 全てをキャンセル
  publisher.dispose();

  // デバウンス期間を待つ
  await new Promise((resolve) => setTimeout(resolve, 150));

  // 何も送信されていない
  assertEquals(mockWriter.getData(), "");
});
