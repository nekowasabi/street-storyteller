/**
 * LSP型定義テスト
 * Process1 Sub1: セマンティックトークン関連の型定義テスト
 *
 * TDD Red → Green Phase: 型の存在確認テスト
 */

import { assertEquals, assertExists } from "@std/assert";
import type {
  SemanticTokens,
  SemanticTokensParams,
  SemanticTokensRangeParams,
  TextDocumentIdentifier,
} from "../../../src/lsp/providers/lsp_types.ts";

// ランタイムチェック用のダミーオブジェクトをimport
import {
  SemanticTokens as SemanticTokensRuntime,
  SemanticTokensParams as SemanticTokensParamsRuntime,
  SemanticTokensRangeParams as SemanticTokensRangeParamsRuntime,
  TextDocumentIdentifier as TextDocumentIdentifierRuntime,
} from "../../../src/lsp/providers/lsp_types.ts";

// ===== SemanticTokens型テスト =====

Deno.test("LSP types - SemanticTokens type is exported", () => {
  // ランタイムダミーオブジェクトの存在確認
  assertExists(SemanticTokensRuntime);
});

Deno.test("LSP types - SemanticTokens has data property", () => {
  // 型チェック: dataプロパティがnumber[]であること
  const validTokens: SemanticTokens = {
    data: [0, 0, 3, 0, 1],
  };

  assertExists(validTokens.data);
  assertEquals(Array.isArray(validTokens.data), true);
  assertEquals(validTokens.data.length, 5);
});

Deno.test("LSP types - SemanticTokens resultId is optional", () => {
  // resultIdなしでも有効
  const withoutResultId: SemanticTokens = {
    data: [],
  };
  assertExists(withoutResultId);

  // resultIdありでも有効
  const withResultId: SemanticTokens = {
    data: [],
    resultId: "test-id",
  };
  assertExists(withResultId);
  assertEquals(withResultId.resultId, "test-id");
});

// ===== SemanticTokensParams型テスト =====

Deno.test("LSP types - SemanticTokensParams type is exported", () => {
  assertExists(SemanticTokensParamsRuntime);
});

Deno.test("LSP types - SemanticTokensParams has textDocument property", () => {
  const params: SemanticTokensParams = {
    textDocument: {
      uri: "file:///test.md",
    },
  };

  assertExists(params.textDocument);
  assertEquals(params.textDocument.uri, "file:///test.md");
});

// ===== SemanticTokensRangeParams型テスト =====

Deno.test("LSP types - SemanticTokensRangeParams type is exported", () => {
  assertExists(SemanticTokensRangeParamsRuntime);
});

Deno.test("LSP types - SemanticTokensRangeParams has textDocument and range", () => {
  const params: SemanticTokensRangeParams = {
    textDocument: {
      uri: "file:///test.md",
    },
    range: {
      start: { line: 0, character: 0 },
      end: { line: 10, character: 0 },
    },
  };

  assertExists(params.textDocument);
  assertExists(params.range);
  assertEquals(params.range.start.line, 0);
  assertEquals(params.range.end.line, 10);
});

// ===== TextDocumentIdentifier型テスト =====

Deno.test("LSP types - TextDocumentIdentifier type is exported", () => {
  assertExists(TextDocumentIdentifierRuntime);
});

Deno.test("LSP types - TextDocumentIdentifier has uri property", () => {
  const textDocument: TextDocumentIdentifier = {
    uri: "file:///test.md",
  };

  assertExists(textDocument.uri);
  assertEquals(textDocument.uri, "file:///test.md");
});
