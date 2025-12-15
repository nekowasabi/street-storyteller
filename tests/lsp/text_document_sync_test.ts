/**
 * テキストドキュメント同期ハンドラテスト
 * Process4 Sub2: didOpen, didChange, didClose の処理テスト
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  TextDocumentSyncHandler,
} from "../../src/lsp/handlers/text_document_sync.ts";
import { DocumentManager } from "../../src/lsp/document/document_manager.ts";

Deno.test("TextDocumentSyncHandler - handleDidOpen opens document", () => {
  const documentManager = new DocumentManager();
  const handler = new TextDocumentSyncHandler(documentManager);

  handler.handleDidOpen({
    textDocument: {
      uri: "file:///test.md",
      languageId: "markdown",
      version: 1,
      text: "Hello World",
    },
  });

  const doc = documentManager.get("file:///test.md");
  assertExists(doc);
  assertEquals(doc.content, "Hello World");
  assertEquals(doc.version, 1);
  assertEquals(doc.languageId, "markdown");
});

Deno.test("TextDocumentSyncHandler - handleDidChange updates document", () => {
  const documentManager = new DocumentManager();
  const handler = new TextDocumentSyncHandler(documentManager);

  // まず開く
  handler.handleDidOpen({
    textDocument: {
      uri: "file:///test.md",
      languageId: "markdown",
      version: 1,
      text: "Original",
    },
  });

  // 変更を適用
  handler.handleDidChange({
    textDocument: {
      uri: "file:///test.md",
      version: 2,
    },
    contentChanges: [{ text: "Updated" }],
  });

  const doc = documentManager.get("file:///test.md");
  assertExists(doc);
  assertEquals(doc.content, "Updated");
  assertEquals(doc.version, 2);
});

Deno.test("TextDocumentSyncHandler - handleDidClose closes document", () => {
  const documentManager = new DocumentManager();
  const handler = new TextDocumentSyncHandler(documentManager);

  // まず開く
  handler.handleDidOpen({
    textDocument: {
      uri: "file:///test.md",
      languageId: "markdown",
      version: 1,
      text: "Content",
    },
  });

  // 閉じる
  handler.handleDidClose({
    textDocument: {
      uri: "file:///test.md",
    },
  });

  const doc = documentManager.get("file:///test.md");
  assertEquals(doc, undefined);
});

Deno.test("TextDocumentSyncHandler - handleDidChange with incremental update", () => {
  const documentManager = new DocumentManager();
  const handler = new TextDocumentSyncHandler(documentManager);

  // まず開く
  handler.handleDidOpen({
    textDocument: {
      uri: "file:///test.md",
      languageId: "markdown",
      version: 1,
      text: "Hello World",
    },
  });

  // 増分更新
  handler.handleDidChange({
    textDocument: {
      uri: "file:///test.md",
      version: 2,
    },
    contentChanges: [
      {
        range: {
          start: { line: 0, character: 6 },
          end: { line: 0, character: 11 },
        },
        text: "Deno",
      },
    ],
  });

  const doc = documentManager.get("file:///test.md");
  assertExists(doc);
  assertEquals(doc.content, "Hello Deno");
});

Deno.test("TextDocumentSyncHandler - triggers callback on change", () => {
  const documentManager = new DocumentManager();
  const handler = new TextDocumentSyncHandler(documentManager);

  let callbackCalled = false;
  let callbackUri = "";

  handler.onDidChange((uri: string) => {
    callbackCalled = true;
    callbackUri = uri;
  });

  // 開く
  handler.handleDidOpen({
    textDocument: {
      uri: "file:///test.md",
      languageId: "markdown",
      version: 1,
      text: "Content",
    },
  });

  // 変更を適用
  handler.handleDidChange({
    textDocument: {
      uri: "file:///test.md",
      version: 2,
    },
    contentChanges: [{ text: "New Content" }],
  });

  assertEquals(callbackCalled, true);
  assertEquals(callbackUri, "file:///test.md");
});

Deno.test("TextDocumentSyncHandler - triggers callback on open", () => {
  const documentManager = new DocumentManager();
  const handler = new TextDocumentSyncHandler(documentManager);

  let callbackCalled = false;
  let callbackUri = "";

  handler.onDidOpen((uri: string) => {
    callbackCalled = true;
    callbackUri = uri;
  });

  handler.handleDidOpen({
    textDocument: {
      uri: "file:///test.md",
      languageId: "markdown",
      version: 1,
      text: "Content",
    },
  });

  assertEquals(callbackCalled, true);
  assertEquals(callbackUri, "file:///test.md");
});
