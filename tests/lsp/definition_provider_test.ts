/**
 * DefinitionProviderテスト
 * Process7 Sub1: 定義ジャンプ機能のテスト
 *
 * TDD Red Phase: 実装がないため、このテストは失敗する
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  DefinitionProvider,
} from "../../src/lsp/providers/definition_provider.ts";
import {
  type DetectableEntity,
  PositionedDetector,
} from "../../src/lsp/detection/positioned_detector.ts";

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

Deno.test("DefinitionProvider - returns location for character reference", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DefinitionProvider(detector);

  const content = "勇者は剣を抜いた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  // "勇者"の位置（0行目、0文字目）をクリック
  const result = await provider.getDefinition(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  assertEquals(result.uri.endsWith("src/characters/hero.ts"), true);
  assertExists(result.range);
});

Deno.test("DefinitionProvider - returns location for setting reference", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DefinitionProvider(detector);

  const content = "城の前で待ち合わせた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  // "城"の位置（0行目、0文字目）をクリック
  const result = await provider.getDefinition(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  assertEquals(result.uri.endsWith("src/settings/castle.ts"), true);
});

Deno.test("DefinitionProvider - returns null for non-entity position", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DefinitionProvider(detector);

  const content = "勇者は剣を抜いた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  // "は"の位置（0行目、2文字目）- エンティティではない
  const result = await provider.getDefinition(uri, content, {
    line: 0,
    character: 2,
  }, projectPath);

  assertEquals(result, null);
});

Deno.test("DefinitionProvider - returns correct location for multi-line content", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DefinitionProvider(detector);

  const content = "第一章\n勇者は旅に出た。\n姫は城で待っていた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  // 2行目の "勇者" の位置（1行目、0文字目）
  const result1 = await provider.getDefinition(uri, content, {
    line: 1,
    character: 0,
  }, projectPath);
  assertExists(result1);
  assertEquals(result1.uri.endsWith("src/characters/hero.ts"), true);

  // 3行目の "姫" の位置（2行目、0文字目）
  const result2 = await provider.getDefinition(uri, content, {
    line: 2,
    character: 0,
  }, projectPath);
  assertExists(result2);
  assertEquals(result2.uri.endsWith("src/characters/princess.ts"), true);
});

Deno.test("DefinitionProvider - works with alias references", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DefinitionProvider(detector);

  const content = "主人公は冒険を始めた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  // "主人公"（aliasで勇者にマッチ）の位置
  const result = await provider.getDefinition(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  assertEquals(result.uri.endsWith("src/characters/hero.ts"), true);
});

Deno.test("DefinitionProvider - uses absolute path for location URI", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DefinitionProvider(detector);

  const content = "勇者が現れた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/home/user/project";

  const result = await provider.getDefinition(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  // URI形式でプロジェクトパスが含まれている
  assertEquals(result.uri.startsWith("file://"), true);
  assertEquals(result.uri.includes("src/characters/hero.ts"), true);
});

Deno.test("DefinitionProvider - returns null for empty content", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DefinitionProvider(detector);

  const content = "";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getDefinition(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertEquals(result, null);
});

Deno.test("DefinitionProvider - location range points to start of definition", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DefinitionProvider(detector);

  const content = "勇者が登場した。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getDefinition(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  // 定義ファイルの先頭を指す
  assertEquals(result.range.start.line, 0);
  assertEquals(result.range.start.character, 0);
});
