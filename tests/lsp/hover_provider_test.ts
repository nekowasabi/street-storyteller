/**
 * HoverProviderテスト
 * Process8 Sub1: ホバー情報機能のテスト
 *
 * TDD Red Phase: 実装がないため、このテストは失敗する
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  HoverProvider,
  type Hover,
  type EntityInfo,
} from "../../src/lsp/providers/hover_provider.ts";
import {
  PositionedDetector,
  type DetectableEntity,
} from "../../src/lsp/detection/positioned_detector.ts";

// テスト用のモックエンティティデータ（拡張情報付き）
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

// テスト用のエンティティ情報マップ
const mockEntityInfoMap = new Map<string, EntityInfo>([
  [
    "hero",
    {
      id: "hero",
      name: "勇者",
      kind: "character" as const,
      role: "protagonist",
      summary: "魔王を倒すために旅立った若者",
      traits: ["勇敢", "正義感"],
      relationships: {
        princess: "ally",
        demon_king: "enemy",
      } as Record<string, string>,
    },
  ],
  [
    "princess",
    {
      id: "princess",
      name: "姫",
      kind: "character" as const,
      role: "supporting",
      summary: "王国の姫",
      traits: ["優しい", "聡明"],
      relationships: {
        hero: "romantic",
      } as Record<string, string>,
    },
  ],
  [
    "castle",
    {
      id: "castle",
      name: "城",
      kind: "setting" as const,
      summary: "王国の中心にそびえる城",
    },
  ],
]);

Deno.test("HoverProvider - returns hover with character info", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "勇者は剣を抜いた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, { line: 0, character: 0 }, projectPath);

  assertExists(result);
  assertExists(result.contents);
  assertEquals(result.contents.kind, "markdown");

  // Markdownに名前が含まれている
  assertEquals(result.contents.value.includes("勇者"), true);
  // 役割が含まれている
  assertEquals(result.contents.value.includes("protagonist"), true);
  // 概要が含まれている
  assertEquals(result.contents.value.includes("魔王を倒すために旅立った若者"), true);
});

Deno.test("HoverProvider - displays confidence level", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  // alias "主人公" での参照（confidence: 0.8）
  const content = "主人公は冒険を始めた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, { line: 0, character: 0 }, projectPath);

  assertExists(result);
  // 信頼度が含まれている
  assertEquals(result.contents.value.includes("信頼度") || result.contents.value.includes("80%"), true);
});

Deno.test("HoverProvider - displays relationships", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "勇者は城に向かった。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, { line: 0, character: 0 }, projectPath);

  assertExists(result);
  // 関係性情報が含まれている（"関係性"または関連キャラクター名）
  assertEquals(
    result.contents.value.includes("関係性") ||
    result.contents.value.includes("princess") ||
    result.contents.value.includes("ally"),
    true
  );
});

Deno.test("HoverProvider - returns null for non-entity position", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "勇者は剣を抜いた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  // "は"の位置（0行目、2文字目）- エンティティではない
  const result = await provider.getHover(uri, content, { line: 0, character: 2 }, projectPath);

  assertEquals(result, null);
});

Deno.test("HoverProvider - displays setting info", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "城の前で待ち合わせた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, { line: 0, character: 0 }, projectPath);

  assertExists(result);
  // 設定の情報が表示される
  assertEquals(result.contents.value.includes("城"), true);
  assertEquals(result.contents.value.includes("王国の中心にそびえる城"), true);
});

Deno.test("HoverProvider - includes entity kind in hover", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "勇者が登場した。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, { line: 0, character: 0 }, projectPath);

  assertExists(result);
  // エンティティの種類が表示される
  assertEquals(
    result.contents.value.includes("キャラクター") ||
    result.contents.value.includes("character"),
    true
  );
});

Deno.test("HoverProvider - returns null for empty content", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, { line: 0, character: 0 }, projectPath);

  assertEquals(result, null);
});

Deno.test("HoverProvider - includes range in hover result", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "勇者は城に向かった。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, { line: 0, character: 0 }, projectPath);

  assertExists(result);
  // range情報が含まれている
  assertExists(result.range);
  assertEquals(result.range.start.line, 0);
  assertEquals(result.range.start.character, 0);
  assertEquals(result.range.end.character, 2); // "勇者"は2文字
});

Deno.test("HoverProvider - handles entity without info map entry", async () => {
  const detector = new PositionedDetector(mockEntities);
  // 空のinfo mapで作成
  const provider = new HoverProvider(detector, new Map());

  const content = "勇者は城に向かった。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, { line: 0, character: 0 }, projectPath);

  // info mapにエントリがなくても基本情報は表示される
  assertExists(result);
  assertEquals(result.contents.value.includes("勇者"), true);
});
