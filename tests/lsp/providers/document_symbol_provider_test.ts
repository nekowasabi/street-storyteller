/**
 * DocumentSymbolProviderテスト
 * TDD Red Phase: テスト先行で実装
 *
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_documentSymbol
 */

import { assertEquals, assertExists } from "@std/assert";
import { DocumentSymbolProvider } from "@storyteller/lsp/providers/document_symbol_provider.ts";
import {
  type DetectableEntity,
  PositionedDetector,
} from "@storyteller/lsp/detection/positioned_detector.ts";
import { SymbolKind } from "@storyteller/lsp/providers/lsp_types.ts";

// テスト用のモックエンティティデータ
const mockEntities: DetectableEntity[] = [
  {
    kind: "character",
    id: "hero",
    name: "勇者",
    displayNames: ["勇者", "ヒーロー"],
    aliases: ["主人公"],
    filePath: "src/characters/hero.ts",
  },
  {
    kind: "character",
    id: "princess",
    name: "姫",
    displayNames: ["姫", "王女"],
    aliases: [],
    filePath: "src/characters/princess.ts",
  },
  {
    kind: "setting",
    id: "castle",
    name: "城",
    displayNames: ["城", "王城"],
    aliases: ["城塞"],
    filePath: "src/settings/castle.ts",
  },
];

// ===== markdownヘッダーテスト =====

Deno.test("DocumentSymbolProvider - detects single markdown header", async () => {
  const detector = new PositionedDetector([]);
  const provider = new DocumentSymbolProvider(detector);

  const content = "# 第1章";
  const projectPath = "/project";

  const result = await provider.getDocumentSymbols(content, projectPath);

  assertExists(result);
  assertEquals(result.length, 1);
  assertEquals(result[0].name, "第1章");
  assertEquals(result[0].kind, SymbolKind.String);
});

Deno.test("DocumentSymbolProvider - detects multiple markdown headers", async () => {
  const detector = new PositionedDetector([]);
  const provider = new DocumentSymbolProvider(detector);

  const content = `# 第1章
## シーン1
## シーン2
# 第2章`;
  const projectPath = "/project";

  const result = await provider.getDocumentSymbols(content, projectPath);

  assertExists(result);
  // トップレベルは2つ（第1章、第2章）
  assertEquals(result.length, 2);
  assertEquals(result[0].name, "第1章");
  assertEquals(result[1].name, "第2章");
});

Deno.test("DocumentSymbolProvider - builds hierarchical header structure", async () => {
  const detector = new PositionedDetector([]);
  const provider = new DocumentSymbolProvider(detector);

  const content = `# 第1章
## シーン1
### 詳細1
## シーン2
# 第2章`;
  const projectPath = "/project";

  const result = await provider.getDocumentSymbols(content, projectPath);

  assertExists(result);
  assertEquals(result.length, 2); // 第1章, 第2章

  // 第1章の子要素
  const chapter1 = result[0];
  assertEquals(chapter1.name, "第1章");
  assertExists(chapter1.children);
  assertEquals(chapter1.children.length, 2); // シーン1, シーン2

  // シーン1の子要素
  const scene1 = chapter1.children[0];
  assertEquals(scene1.name, "シーン1");
  assertExists(scene1.children);
  assertEquals(scene1.children.length, 1); // 詳細1

  // シーン2は子要素なし
  const scene2 = chapter1.children[1];
  assertEquals(scene2.name, "シーン2");
  assertEquals(scene2.children, undefined);
});

// ===== エンティティ検出テスト =====

Deno.test("DocumentSymbolProvider - detects character entity", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DocumentSymbolProvider(detector);

  const content = "勇者は冒険を始めた。";
  const projectPath = "/project";

  const result = await provider.getDocumentSymbols(content, projectPath);

  assertExists(result);
  // エンティティがシンボルとして検出される
  const characterSymbol = result.find((s) => s.name === "勇者");
  assertExists(characterSymbol);
  assertEquals(characterSymbol.kind, SymbolKind.Variable);
});

Deno.test("DocumentSymbolProvider - detects setting entity", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DocumentSymbolProvider(detector);

  const content = "城に到着した。";
  const projectPath = "/project";

  const result = await provider.getDocumentSymbols(content, projectPath);

  assertExists(result);
  const settingSymbol = result.find((s) => s.name === "城");
  assertExists(settingSymbol);
  assertEquals(settingSymbol.kind, SymbolKind.Object);
});

// ===== 複合テスト（ヘッダー + エンティティ） =====

Deno.test("DocumentSymbolProvider - combines headers and entities", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DocumentSymbolProvider(detector);

  const content = `# 第1章
勇者は城に向かった。
## シーン1
姫が待っていた。`;
  const projectPath = "/project";

  const result = await provider.getDocumentSymbols(content, projectPath);

  assertExists(result);
  // トップレベルには第1章とエンティティ（勇者、城）
  const chapter = result.find((s) => s.name === "第1章");
  assertExists(chapter);
  assertEquals(chapter.kind, SymbolKind.String);

  // シーン1は第1章の子
  assertExists(chapter.children);
  const scene = chapter.children.find((s) => s.name === "シーン1");
  assertExists(scene);
});

// ===== エッジケーステスト =====

Deno.test("DocumentSymbolProvider - returns empty array for empty content", async () => {
  const detector = new PositionedDetector([]);
  const provider = new DocumentSymbolProvider(detector);

  const content = "";
  const projectPath = "/project";

  const result = await provider.getDocumentSymbols(content, projectPath);

  assertExists(result);
  assertEquals(result.length, 0);
});

Deno.test("DocumentSymbolProvider - handles content without headers or entities", async () => {
  const detector = new PositionedDetector([]);
  const provider = new DocumentSymbolProvider(detector);

  const content = "これは普通の文章です。";
  const projectPath = "/project";

  const result = await provider.getDocumentSymbols(content, projectPath);

  assertExists(result);
  assertEquals(result.length, 0);
});

Deno.test("DocumentSymbolProvider - correct range for header", async () => {
  const detector = new PositionedDetector([]);
  const provider = new DocumentSymbolProvider(detector);

  const content = "# 第1章";
  const projectPath = "/project";

  const result = await provider.getDocumentSymbols(content, projectPath);

  assertExists(result);
  assertEquals(result.length, 1);

  const symbol = result[0];
  // ヘッダー行全体の範囲
  assertEquals(symbol.range.start.line, 0);
  assertEquals(symbol.range.start.character, 0);
  assertEquals(symbol.range.end.line, 0);
  assertEquals(symbol.range.end.character, 5); // "# 第1章" の長さ

  // 選択範囲はヘッダーテキスト部分
  assertEquals(symbol.selectionRange.start.line, 0);
  assertEquals(symbol.selectionRange.start.character, 2); // "# " の後
  assertEquals(symbol.selectionRange.end.line, 0);
  assertEquals(symbol.selectionRange.end.character, 5);
});
