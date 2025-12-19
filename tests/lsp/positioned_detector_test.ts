/**
 * PositionedDetectorテスト
 * Process5 Sub1: 位置追跡付き検出エンジンのテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  PositionedDetector,
} from "@storyteller/lsp/detection/positioned_detector.ts";

// テスト用のモックエンティティデータ
const mockEntities = [
  {
    kind: "character" as const,
    id: "hero",
    name: "勇者",
    displayNames: ["勇者", "ヒーロー"],
    aliases: ["主人公"],
    filePath: "src/characters/hero.ts",
  },
  {
    kind: "character" as const,
    id: "princess",
    name: "姫",
    displayNames: ["姫", "王女"],
    aliases: [],
    filePath: "src/characters/princess.ts",
  },
  {
    kind: "setting" as const,
    id: "castle",
    name: "城",
    displayNames: ["城", "王城"],
    aliases: ["城塞"],
    filePath: "src/settings/castle.ts",
  },
];

Deno.test("PositionedDetector - detects character with position info", () => {
  const detector = new PositionedDetector(mockEntities);

  const content = "勇者は剣を抜いた。";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 1);
  assertEquals(results[0].id, "hero");
  assertEquals(results[0].positions.length, 1);
  assertEquals(results[0].positions[0].line, 0);
  assertEquals(results[0].positions[0].character, 0);
  assertEquals(results[0].positions[0].length, 2);
});

Deno.test("PositionedDetector - calculates multi-byte character positions correctly", () => {
  const detector = new PositionedDetector(mockEntities);

  // "こんにちは勇者さん" - "勇者" は文字位置5から
  const content = "こんにちは勇者さん";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 1);
  assertEquals(results[0].id, "hero");
  assertEquals(results[0].positions[0].character, 5);
  assertEquals(results[0].positions[0].length, 2);
});

Deno.test("PositionedDetector - tracks multiple occurrences", () => {
  const detector = new PositionedDetector(mockEntities);

  const content = "勇者は城に向かった。勇者は姫を助けた。";
  const results = detector.detectWithPositions(content);

  // hero, castle, princess が検出されるはず
  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);
  assertEquals(heroResult.positions.length, 2);

  // 1回目の "勇者" は位置0
  assertEquals(heroResult.positions[0].character, 0);
  // 2回目の "勇者" は位置10 ("勇者は城に向かった。" = 10文字)
  assertEquals(heroResult.positions[1].character, 10);
});

Deno.test("PositionedDetector - handles multi-line content", () => {
  const detector = new PositionedDetector(mockEntities);

  const content = "第一章\n勇者は旅に出た。\n姫は城で待っていた。";
  const results = detector.detectWithPositions(content);

  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);
  assertEquals(heroResult.positions[0].line, 1);
  assertEquals(heroResult.positions[0].character, 0);

  const princessResult = results.find((r) => r.id === "princess");
  assertExists(princessResult);
  assertEquals(princessResult.positions[0].line, 2);
  assertEquals(princessResult.positions[0].character, 0);
});

Deno.test("PositionedDetector - includes confidence from patterns", () => {
  const detector = new PositionedDetector(mockEntities);

  const content = "勇者が登場した。";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 1);
  // displayNamesでのマッチは confidence: 0.9
  assertEquals(results[0].confidence >= 0.9, true);
});

Deno.test("PositionedDetector - detects aliases", () => {
  const detector = new PositionedDetector(mockEntities);

  const content = "主人公は冒険を始めた。";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 1);
  assertEquals(results[0].id, "hero");
  // aliasでのマッチは confidence: 0.8
  assertEquals(results[0].confidence, 0.8);
});

Deno.test("PositionedDetector - returns empty array for no matches", () => {
  const detector = new PositionedDetector(mockEntities);

  const content = "何も関連するものがない文章。";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 0);
});

Deno.test("PositionedDetector - detects both characters and settings", () => {
  const detector = new PositionedDetector(mockEntities);

  const content = "勇者は城に到着した。";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 2);

  const heroResult = results.find((r) =>
    r.kind === "character" && r.id === "hero"
  );
  assertExists(heroResult);

  const castleResult = results.find((r) =>
    r.kind === "setting" && r.id === "castle"
  );
  assertExists(castleResult);
});

Deno.test("PositionedDetector - getEntityAtPosition returns correct entity", () => {
  const detector = new PositionedDetector(mockEntities);

  const content = "勇者は城に向かった。";
  detector.detectWithPositions(content);

  // 位置0の "勇" の位置
  const entity = detector.getEntityAtPosition(content, {
    line: 0,
    character: 0,
  });
  assertExists(entity);
  assertEquals(entity.id, "hero");

  // 位置3の "城" の位置
  const castleEntity = detector.getEntityAtPosition(content, {
    line: 0,
    character: 3,
  });
  assertExists(castleEntity);
  assertEquals(castleEntity.id, "castle");

  // 位置2は "は" なので何もマッチしない
  const noEntity = detector.getEntityAtPosition(content, {
    line: 0,
    character: 2,
  });
  assertEquals(noEntity, undefined);
});

Deno.test("PositionedDetector - handles emoji and special characters", () => {
  const detector = new PositionedDetector(mockEntities);

  // 絵文字の後に勇者
  const content = "冒険開始!勇者は出発した。";
  const results = detector.detectWithPositions(content);

  assertEquals(results.length, 1);
  assertEquals(results[0].id, "hero");
  // "冒険開始!" = 5文字なので、"勇者" は位置5から
  assertEquals(results[0].positions[0].character, 5);
});

Deno.test("PositionedDetector - detects entity by id (for frontmatter)", () => {
  const detector = new PositionedDetector(mockEntities);

  // Frontmatter内のIDで検出
  const content = `---
storyteller:
  characters:
    - hero
    - princess
  settings:
    - castle
---`;
  const results = detector.detectWithPositions(content);

  // hero, princess, castle がIDで検出される
  assertEquals(results.length, 3);

  const heroResult = results.find((r) => r.id === "hero");
  assertExists(heroResult);
  assertEquals(heroResult.confidence, 1.0); // IDは confidence 1.0

  const princessResult = results.find((r) => r.id === "princess");
  assertExists(princessResult);

  const castleResult = results.find((r) => r.id === "castle");
  assertExists(castleResult);
});

Deno.test("PositionedDetector - getEntityAtPosition works with id in frontmatter", () => {
  const detector = new PositionedDetector(mockEntities);

  const content = `---
storyteller:
  characters:
    - hero
---`;
  detector.detectWithPositions(content);

  // "hero" は行3、位置6から
  const entity = detector.getEntityAtPosition(content, {
    line: 3,
    character: 6,
  });
  assertExists(entity);
  assertEquals(entity.id, "hero");
  assertEquals(entity.kind, "character");
});

// ========================================
// process2: foreshadowing検出のテスト
// ========================================

// 伏線のモックエンティティ
const mockForeshadowingEntities = [
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

Deno.test("PositionedDetector - detects foreshadowing by id", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  const content = `---
storyteller:
  foreshadowings:
    - glass_slipper
---`;
  const results = detector.detectWithPositions(content);

  const foreshadowingResult = results.find((r) =>
    r.kind === "foreshadowing" && r.id === "glass_slipper"
  );
  assertExists(foreshadowingResult);
  assertEquals(foreshadowingResult.confidence, 1.0);
});

Deno.test("PositionedDetector - detects foreshadowing by displayName in body", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  const content = "シンデレラはガラスの靴を見つめた。";
  const results = detector.detectWithPositions(content);

  const foreshadowingResult = results.find((r) =>
    r.kind === "foreshadowing" && r.id === "glass_slipper"
  );
  assertExists(foreshadowingResult);
  assertEquals(foreshadowingResult.positions.length, 1);
  assertEquals(foreshadowingResult.confidence >= 0.9, true);
});

Deno.test("PositionedDetector - detects foreshadowing by explicit @reference", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  const content = "妖精は@真夜中の期限について警告した。";
  const results = detector.detectWithPositions(content);

  const foreshadowingResult = results.find((r) =>
    r.kind === "foreshadowing" && r.id === "midnight_deadline"
  );
  assertExists(foreshadowingResult);
});

Deno.test("PositionedDetector - includes status in foreshadowing match", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  const content = "ガラスの靴と真夜中の期限が物語を動かす。";
  const results = detector.detectWithPositions(content);

  const plantedResult = results.find((r) => r.id === "glass_slipper");
  assertExists(plantedResult);
  assertEquals(plantedResult.status, "planted");

  const resolvedResult = results.find((r) => r.id === "midnight_deadline");
  assertExists(resolvedResult);
  assertEquals(resolvedResult.status, "resolved");
});

Deno.test("PositionedDetector - getEntityAtPosition returns foreshadowing", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  const content = "ガラスの靴を見つけた。";
  detector.detectWithPositions(content);

  // "ガラスの靴" は位置0から
  const entity = detector.getEntityAtPosition(content, {
    line: 0,
    character: 0,
  });
  assertExists(entity);
  assertEquals(entity.id, "glass_slipper");
  assertEquals(entity.kind, "foreshadowing");
});
