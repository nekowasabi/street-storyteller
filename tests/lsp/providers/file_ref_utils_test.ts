/**
 * ファイル参照検出ユーティリティテスト
 * Process1: file_ref_utils.ts のTDD Red Phase
 *
 * ファイル参照パターン（{ file: "./path.md" }）の検出と
 * storyteller専用ディレクトリ判定のテスト
 */

import { assertEquals, assertExists } from "@std/assert";

// テスト対象モジュールをインポート
import {
  debugLog,
  detectAndResolveFileRef,
  detectFileReference,
  FILE_REF_PATTERN,
  getLineAtPosition,
  isStorytellerFile,
  resolveFileRefPath,
} from "@storyteller/lsp/providers/file_ref_utils.ts";

// ===== FILE_REF_PATTERN テスト =====

Deno.test("FILE_REF_PATTERN - detects { file: './path.md' } pattern", () => {
  const line = 'description: { file: "./description.md" },';
  const match = line.match(FILE_REF_PATTERN);

  assertExists(match);
  assertEquals(match[1], "./description.md");
});

Deno.test("FILE_REF_PATTERN - detects { 'file': 'path.md' } pattern with single quotes", () => {
  const line = "details: { 'file': 'backstory.md' },";
  const match = line.match(FILE_REF_PATTERN);

  assertExists(match);
  assertEquals(match[1], "backstory.md");
});

Deno.test('FILE_REF_PATTERN - detects { "file": "path.md" } pattern with double quotes on key', () => {
  const line = 'appearance: { "file": "./appearance.md" },';
  const match = line.match(FILE_REF_PATTERN);

  assertExists(match);
  assertEquals(match[1], "./appearance.md");
});

Deno.test("FILE_REF_PATTERN - detects pattern with spaces around colon", () => {
  const line = 'description: { file : "./with-spaces.md" },';
  const match = line.match(FILE_REF_PATTERN);

  assertExists(match);
  assertEquals(match[1], "./with-spaces.md");
});

Deno.test("FILE_REF_PATTERN - does not match non-file-ref patterns", () => {
  const lines = [
    'name: "hero",',
    "traits: ['brave', 'kind'],",
    "summary: 'A brave hero'",
    "file: './not-object.md'", // オブジェクトではない
  ];

  for (const line of lines) {
    const match = line.match(FILE_REF_PATTERN);
    assertEquals(match, null, `Should not match: ${line}`);
  }
});

// ===== isStorytellerFile テスト =====

Deno.test("isStorytellerFile - returns true for /characters/ path", () => {
  const uri = "file:///project/src/characters/hero.ts";
  assertEquals(isStorytellerFile(uri), true);
});

Deno.test("isStorytellerFile - returns true for /settings/ path", () => {
  const uri = "file:///project/src/settings/castle.ts";
  assertEquals(isStorytellerFile(uri), true);
});

Deno.test("isStorytellerFile - returns true for /samples/ path", () => {
  const uri = "file:///project/samples/cinderella/characters/cinderella.ts";
  assertEquals(isStorytellerFile(uri), true);
});

Deno.test("isStorytellerFile - returns false for other paths", () => {
  const uris = [
    "file:///project/src/utils/helper.ts",
    "file:///project/src/lsp/server.ts",
    "file:///project/tests/test.ts",
    "file:///project/main.ts",
  ];

  for (const uri of uris) {
    assertEquals(isStorytellerFile(uri), false, `Should be false: ${uri}`);
  }
});

// ===== detectFileReference テスト =====

Deno.test("detectFileReference - detects file reference at cursor position", () => {
  const line = 'description: { file: "./description.md" },';
  const result = detectFileReference(line, 20); // カーソルが file 参照内

  assertExists(result);
  assertEquals(result.path, "./description.md");
  assertEquals(result.startChar, 13); // { の位置
  assertEquals(result.endChar, 41); // } の位置 + 1
});

Deno.test("detectFileReference - returns null when cursor is outside file reference", () => {
  const line = 'description: { file: "./description.md" },';
  const result = detectFileReference(line, 5); // カーソルが description 部分

  assertEquals(result, null);
});

Deno.test("detectFileReference - returns null for line without file reference", () => {
  const line = 'name: "hero",';
  const result = detectFileReference(line, 5);

  assertEquals(result, null);
});

Deno.test("detectFileReference - handles multiple file references in different lines", () => {
  const line1 = 'description: { file: "./desc.md" },';
  const line2 = 'backstory: { file: "./backstory.md" },';

  const result1 = detectFileReference(line1, 20);
  const result2 = detectFileReference(line2, 18);

  assertExists(result1);
  assertEquals(result1.path, "./desc.md");

  assertExists(result2);
  assertEquals(result2.path, "./backstory.md");
});

// ===== resolveFileRefPath テスト =====

Deno.test("resolveFileRefPath - resolves relative path from current file", () => {
  const currentFileUri = "file:///project/src/characters/hero.ts";
  const refPath = "./description.md";

  const resolved = resolveFileRefPath(refPath, currentFileUri);

  assertEquals(resolved, "/project/src/characters/description.md");
});

Deno.test("resolveFileRefPath - resolves parent directory path", () => {
  const currentFileUri = "file:///project/src/characters/hero.ts";
  const refPath = "../shared/common.md";

  const resolved = resolveFileRefPath(refPath, currentFileUri);

  assertEquals(resolved, "/project/src/shared/common.md");
});

Deno.test("resolveFileRefPath - resolves absolute path (keeps as-is without file://)", () => {
  const currentFileUri = "file:///project/src/characters/hero.ts";
  const refPath = "/absolute/path/file.md";

  const resolved = resolveFileRefPath(refPath, currentFileUri);

  assertEquals(resolved, "/absolute/path/file.md");
});

Deno.test("resolveFileRefPath - handles path without ./ prefix", () => {
  const currentFileUri = "file:///project/src/characters/hero.ts";
  const refPath = "description.md";

  const resolved = resolveFileRefPath(refPath, currentFileUri);

  assertEquals(resolved, "/project/src/characters/description.md");
});

// ===== getLineAtPosition テスト（process100追加） =====

Deno.test("getLineAtPosition - returns correct line", () => {
  const content = "line0\nline1\nline2";
  const result = getLineAtPosition(content, { line: 1, character: 0 });

  assertEquals(result, "line1");
});

Deno.test("getLineAtPosition - returns null for out of range line", () => {
  const content = "line0\nline1";
  const result = getLineAtPosition(content, { line: 5, character: 0 });

  assertEquals(result, null);
});

Deno.test("getLineAtPosition - handles empty content", () => {
  const content = "";
  const result = getLineAtPosition(content, { line: 0, character: 0 });

  // 空文字列をsplitすると[""]になるため、line 0は取得可能
  assertEquals(result, "");
});

// ===== detectAndResolveFileRef テスト（process100追加） =====

Deno.test("detectAndResolveFileRef - detects and resolves file reference", () => {
  const uri = "file:///project/samples/cinderella/characters/hero.ts";
  const content = 'description: { file: "./description.md" },';
  const position = { line: 0, character: 20 };

  const result = detectAndResolveFileRef(uri, content, position);

  assertExists(result);
  assertEquals(result.fileRef.path, "./description.md");
  assertEquals(
    result.resolvedPath,
    "/project/samples/cinderella/characters/description.md",
  );
});

Deno.test("detectAndResolveFileRef - returns null for non-storyteller file", () => {
  const uri = "file:///project/src/utils/helper.ts";
  const content = 'description: { file: "./description.md" },';
  const position = { line: 0, character: 20 };

  const result = detectAndResolveFileRef(uri, content, position);

  assertEquals(result, null);
});

Deno.test("detectAndResolveFileRef - returns null when cursor is outside file ref", () => {
  const uri = "file:///project/samples/cinderella/characters/hero.ts";
  const content = 'description: { file: "./description.md" },';
  const position = { line: 0, character: 5 }; // "description" 部分

  const result = detectAndResolveFileRef(uri, content, position);

  assertEquals(result, null);
});

// ===== debugLog テスト（process100追加） =====

Deno.test("debugLog - does not throw without debug enabled", () => {
  // デバッグログが無効でもエラーにならないことを確認
  debugLog("test message");
  debugLog("test message with data", { key: "value" });
});
