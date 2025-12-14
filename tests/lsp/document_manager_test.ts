/**
 * DocumentManagerテスト
 * Process4 Sub1: ドキュメント管理機能のテスト
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DocumentManager,
  type TextDocument,
} from "../../src/lsp/document/document_manager.ts";

Deno.test("DocumentManager - open() saves document", () => {
  const manager = new DocumentManager();

  manager.open("file:///test.md", "Hello World", 1, "markdown");

  const doc = manager.get("file:///test.md");
  assertExists(doc);
  assertEquals(doc.uri, "file:///test.md");
  assertEquals(doc.content, "Hello World");
  assertEquals(doc.version, 1);
  assertEquals(doc.languageId, "markdown");
});

Deno.test("DocumentManager - get() returns document", () => {
  const manager = new DocumentManager();

  manager.open("file:///test.md", "Content", 1, "markdown");

  const doc = manager.get("file:///test.md");
  assertExists(doc);
  assertEquals(doc.content, "Content");
});

Deno.test("DocumentManager - get() returns undefined for unknown URI", () => {
  const manager = new DocumentManager();

  const doc = manager.get("file:///unknown.md");
  assertEquals(doc, undefined);
});

Deno.test("DocumentManager - close() removes document", () => {
  const manager = new DocumentManager();

  manager.open("file:///test.md", "Content", 1, "markdown");
  manager.close("file:///test.md");

  const doc = manager.get("file:///test.md");
  assertEquals(doc, undefined);
});

Deno.test("DocumentManager - change() applies full update", () => {
  const manager = new DocumentManager();

  manager.open("file:///test.md", "Original", 1, "markdown");
  manager.change("file:///test.md", [{ text: "Updated" }], 2);

  const doc = manager.get("file:///test.md");
  assertExists(doc);
  assertEquals(doc.content, "Updated");
  assertEquals(doc.version, 2);
});

Deno.test("DocumentManager - change() applies incremental update", () => {
  const manager = new DocumentManager();

  // 初期コンテンツ: "Hello World"
  manager.open("file:///test.md", "Hello World", 1, "markdown");

  // "World" を "Deno" に置換
  manager.change(
    "file:///test.md",
    [
      {
        range: {
          start: { line: 0, character: 6 },
          end: { line: 0, character: 11 },
        },
        text: "Deno",
      },
    ],
    2
  );

  const doc = manager.get("file:///test.md");
  assertExists(doc);
  assertEquals(doc.content, "Hello Deno");
  assertEquals(doc.version, 2);
});

Deno.test("DocumentManager - change() handles multi-line content", () => {
  const manager = new DocumentManager();

  // 複数行のコンテンツ
  const initial = "Line 1\nLine 2\nLine 3";
  manager.open("file:///test.md", initial, 1, "markdown");

  // "Line 2" を "Modified" に置換
  manager.change(
    "file:///test.md",
    [
      {
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 6 },
        },
        text: "Modified",
      },
    ],
    2
  );

  const doc = manager.get("file:///test.md");
  assertExists(doc);
  assertEquals(doc.content, "Line 1\nModified\nLine 3");
});

Deno.test("DocumentManager - version management works correctly", () => {
  const manager = new DocumentManager();

  manager.open("file:///test.md", "V1", 1, "markdown");
  assertEquals(manager.get("file:///test.md")?.version, 1);

  manager.change("file:///test.md", [{ text: "V2" }], 2);
  assertEquals(manager.get("file:///test.md")?.version, 2);

  manager.change("file:///test.md", [{ text: "V3" }], 3);
  assertEquals(manager.get("file:///test.md")?.version, 3);
});

Deno.test("DocumentManager - handles Japanese text positions correctly", () => {
  const manager = new DocumentManager();

  // 日本語テキスト: "こんにちは世界"
  manager.open("file:///test.md", "こんにちは世界", 1, "markdown");

  // "世界" を "Deno" に置換 (character 5 から 7)
  manager.change(
    "file:///test.md",
    [
      {
        range: {
          start: { line: 0, character: 5 },
          end: { line: 0, character: 7 },
        },
        text: "Deno",
      },
    ],
    2
  );

  const doc = manager.get("file:///test.md");
  assertExists(doc);
  assertEquals(doc.content, "こんにちはDeno");
});

Deno.test("DocumentManager - getAllUris returns all document URIs", () => {
  const manager = new DocumentManager();

  manager.open("file:///a.md", "A", 1, "markdown");
  manager.open("file:///b.md", "B", 1, "markdown");
  manager.open("file:///c.md", "C", 1, "markdown");

  const uris = manager.getAllUris();
  assertEquals(uris.length, 3);
  assertEquals(uris.includes("file:///a.md"), true);
  assertEquals(uris.includes("file:///b.md"), true);
  assertEquals(uris.includes("file:///c.md"), true);
});
