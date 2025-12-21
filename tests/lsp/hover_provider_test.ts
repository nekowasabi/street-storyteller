/**
 * HoverProviderテスト
 * Process8 Sub1: ホバー情報機能のテスト
 *
 * TDD Red Phase: 実装がないため、このテストは失敗する
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  type EntityInfo,
  HoverProvider,
} from "@storyteller/lsp/providers/hover_provider.ts";
import {
  type DetectableEntity,
  PositionedDetector,
} from "@storyteller/lsp/detection/positioned_detector.ts";

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

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  assertExists(result.contents);
  assertEquals(result.contents.kind, "markdown");

  // Markdownに名前が含まれている
  assertEquals(result.contents.value.includes("勇者"), true);
  // 役割が含まれている
  assertEquals(result.contents.value.includes("protagonist"), true);
  // 概要が含まれている
  assertEquals(
    result.contents.value.includes("魔王を倒すために旅立った若者"),
    true,
  );
});

Deno.test("HoverProvider - displays confidence level", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  // alias "主人公" での参照（confidence: 0.8）
  const content = "主人公は冒険を始めた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  // 信頼度が含まれている
  assertEquals(
    result.contents.value.includes("信頼度") ||
      result.contents.value.includes("80%"),
    true,
  );
});

Deno.test("HoverProvider - displays relationships", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "勇者は城に向かった。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  // 関係性情報が含まれている（"関係性"または関連キャラクター名）
  assertEquals(
    result.contents.value.includes("関係性") ||
      result.contents.value.includes("princess") ||
      result.contents.value.includes("ally"),
    true,
  );
});

Deno.test("HoverProvider - returns null for non-entity position", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "勇者は剣を抜いた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  // "は"の位置（0行目、2文字目）- エンティティではない
  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 2,
  }, projectPath);

  assertEquals(result, null);
});

Deno.test("HoverProvider - displays setting info", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "城の前で待ち合わせた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

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

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  // エンティティの種類が表示される
  assertEquals(
    result.contents.value.includes("キャラクター") ||
      result.contents.value.includes("character"),
    true,
  );
});

Deno.test("HoverProvider - returns null for empty content", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertEquals(result, null);
});

Deno.test("HoverProvider - includes range in hover result", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = "勇者は城に向かった。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

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

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  // info mapにエントリがなくても基本情報は表示される
  assertExists(result);
  assertEquals(result.contents.value.includes("勇者"), true);
});

// ========================================
// process3: foreshadowingホバーのテスト
// ========================================

// 伏線を含むモックエンティティ
const mockEntitiesWithForeshadowing: DetectableEntity[] = [
  ...mockEntities,
  {
    kind: "foreshadowing" as const,
    id: "glass_slipper",
    name: "ガラスの靴の伏線",
    displayNames: ["ガラスの靴", "ガラスの靴の伏線"],
    aliases: ["輝く靴"],
    filePath: "src/foreshadowings/glass_slipper.ts",
    status: "planted" as const,
  },
  {
    kind: "foreshadowing" as const,
    id: "midnight_deadline",
    name: "真夜中の期限",
    displayNames: ["真夜中", "真夜中の期限"],
    aliases: ["12時"],
    filePath: "src/foreshadowings/midnight_deadline.ts",
    status: "resolved" as const,
  },
];

// 伏線用のEntityInfo
const mockEntityInfoMapWithForeshadowing = new Map<string, EntityInfo>([
  ...mockEntityInfoMap,
  [
    "glass_slipper",
    {
      id: "glass_slipper",
      name: "ガラスの靴の伏線",
      kind: "foreshadowing" as const,
      type: "chekhov",
      status: "planted",
      summary: "シンデレラが落としたガラスの靴",
      plantingChapter: "chapter_01",
      plantingDescription: "舞踏会の帰り道に落とす",
      relatedCharacters: ["cinderella", "prince"],
    },
  ],
  [
    "midnight_deadline",
    {
      id: "midnight_deadline",
      name: "真夜中の期限",
      kind: "foreshadowing" as const,
      type: "prophecy",
      status: "resolved",
      summary: "魔法が解ける期限",
      plantingChapter: "chapter_02",
      plantingDescription: "妖精が警告を与える",
      resolutions: [
        {
          chapter: "chapter_05",
          description: "シンデレラが真夜中に走り去る",
          completeness: 1.0,
        },
      ],
      relatedCharacters: ["cinderella", "fairy_godmother"],
    },
  ],
]);

Deno.test("HoverProvider - returns hover with foreshadowing info (planted)", async () => {
  const detector = new PositionedDetector(mockEntitiesWithForeshadowing);
  const provider = new HoverProvider(
    detector,
    mockEntityInfoMapWithForeshadowing,
  );

  const content = "シンデレラはガラスの靴を見つめた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 6, // "ガラスの靴" の位置
  }, projectPath);

  assertExists(result);
  assertExists(result.contents);
  assertEquals(result.contents.kind, "markdown");

  // 伏線情報が含まれている
  assertEquals(result.contents.value.includes("伏線"), true);
  // ステータスが含まれている
  assertEquals(
    result.contents.value.includes("planted") ||
      result.contents.value.includes("未回収"),
    true,
  );
  // 概要が含まれている
  assertEquals(
    result.contents.value.includes("シンデレラが落としたガラスの靴"),
    true,
  );
});

Deno.test("HoverProvider - displays foreshadowing status (resolved)", async () => {
  const detector = new PositionedDetector(mockEntitiesWithForeshadowing);
  const provider = new HoverProvider(
    detector,
    mockEntityInfoMapWithForeshadowing,
  );

  const content = "妖精は真夜中の期限について警告した。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 3, // "真夜中" の位置
  }, projectPath);

  assertExists(result);
  // 回収済みステータスが表示される
  assertEquals(
    result.contents.value.includes("resolved") ||
      result.contents.value.includes("回収済み"),
    true,
  );
});

Deno.test("HoverProvider - displays foreshadowing type", async () => {
  const detector = new PositionedDetector(mockEntitiesWithForeshadowing);
  const provider = new HoverProvider(
    detector,
    mockEntityInfoMapWithForeshadowing,
  );

  const content = "ガラスの靴が光っていた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  // 伏線タイプが含まれている
  assertEquals(
    result.contents.value.includes("chekhov") ||
      result.contents.value.includes("チェーホフの銃"),
    true,
  );
});

Deno.test("HoverProvider - displays foreshadowing planting info", async () => {
  const detector = new PositionedDetector(mockEntitiesWithForeshadowing);
  const provider = new HoverProvider(
    detector,
    mockEntityInfoMapWithForeshadowing,
  );

  const content = "ガラスの靴を手に取った。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  // 設置章の情報が含まれている
  assertEquals(
    result.contents.value.includes("chapter_01") ||
      result.contents.value.includes("設置"),
    true,
  );
});

Deno.test("HoverProvider - displays foreshadowing related characters", async () => {
  const detector = new PositionedDetector(mockEntitiesWithForeshadowing);
  const provider = new HoverProvider(
    detector,
    mockEntityInfoMapWithForeshadowing,
  );

  const content = "ガラスの靴が残っていた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(result);
  // 関連キャラクターが含まれている
  assertEquals(
    result.contents.value.includes("cinderella") ||
      result.contents.value.includes("prince") ||
      result.contents.value.includes("関連"),
    true,
  );
});

// ========================================
// process2: ファイル参照ホバーのテスト
// ========================================

Deno.test("HoverProvider - returns hover with file reference info when file not found", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  // TypeScriptファイル内のファイル参照（存在しないファイル）
  const content = `const character = {
  name: "hero",
  description: { file: "./nonexistent.md" },
};`;
  const uri = "file:///project/samples/cinderella/characters/hero.ts";
  const projectPath = "/project";

  // カーソルがファイル参照内（description.md の位置）
  const result = await provider.getHover(uri, content, {
    line: 2,
    character: 20, // { file: 内
  }, projectPath);

  // ファイル参照ホバーはエラーメッセージを返す
  assertExists(result);
  assertEquals(result.contents.kind, "markdown");
  // エラーメッセージが含まれる
  assertEquals(result.contents.value.includes("エラー"), true);
  assertEquals(
    result.contents.value.includes("ファイルが見つかりません"),
    true,
  );
});

Deno.test("HoverProvider - file reference hover shows markdown format", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = `description: { file: "./description.md" },`;
  const uri = "file:///project/samples/cinderella/characters/hero.ts";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 15,
  }, projectPath);

  // ファイル参照ホバーが返される
  assertExists(result);
  assertEquals(result.contents.kind, "markdown");
  // ファイル参照情報が含まれる
  assertEquals(result.contents.value.includes("ファイル参照"), true);
});

Deno.test("HoverProvider - file reference hover includes range", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = `description: { file: "./description.md" },`;
  const uri = "file:///project/samples/cinderella/characters/hero.ts";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 15,
  }, projectPath);

  assertExists(result);
  assertExists(result.range);
  assertEquals(result.range.start.line, 0);
});

Deno.test("HoverProvider - returns null for file reference outside storyteller directory", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = `description: { file: "./description.md" },`;
  // storyteller専用ディレクトリ外（characters/, settings/, samples/以外）
  const uri = "file:///project/src/utils/helper.ts";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 15,
  }, projectPath);

  // storyteller外ではファイル参照ホバーは動作しない
  assertEquals(result, null);
});

Deno.test("HoverProvider - returns null for non-file-reference position", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = `const name = "hero";`;
  const uri = "file:///project/samples/cinderella/characters/hero.ts";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 5,
  }, projectPath);

  // ファイル参照でもエンティティでもない位置ではnull
  assertEquals(result, null);
});
