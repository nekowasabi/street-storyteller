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

// ========================================
// process1: HTMLコメントアノテーション検出のテスト
// ========================================

Deno.test("PositionedDetector - detects foreshadowing annotation comment (long form)", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  const content = `<!-- @foreshadowing:ガラスの靴の伏線 -->
「魔法は真夜中に解けます」`;

  const results = detector.detectWithPositions(content);

  // アノテーション行が検出されること
  const annotationResult = results.find(
    (r) => r.kind === "foreshadowing" && r.id === "glass_slipper",
  );
  assertExists(annotationResult);
  // アノテーション行の位置 (line 0)
  const annotationPos = annotationResult.positions.find((p) => p.line === 0);
  assertExists(annotationPos);
  // アノテーション全体がマッチすること
  assertEquals(annotationPos.character, 0);
  assertEquals(annotationPos.length, 32); // <!-- @foreshadowing:ガラスの靴の伏線 --> (JS length)
  // ステータスが正しいこと
  assertEquals(annotationResult.status, "planted");
});

Deno.test("PositionedDetector - detects foreshadowing annotation comment (short form @fs)", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  const content = `<!-- @fs:ガラスの靴の伏線 -->
「魔法は真夜中に解けます」`;

  const results = detector.detectWithPositions(content);

  const annotationResult = results.find(
    (r) => r.kind === "foreshadowing" && r.id === "glass_slipper",
  );
  assertExists(annotationResult);
  const annotationPos = annotationResult.positions.find((p) => p.line === 0);
  assertExists(annotationPos);
  assertEquals(annotationResult.status, "planted");
});

Deno.test("PositionedDetector - detects multiple annotations in same comment", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  const content = `<!-- @fs:ガラスの靴の伏線 @fs:真夜中の期限 -->
「魔法は真夜中に解けます」`;

  const results = detector.detectWithPositions(content);

  // 両方の伏線が検出されること
  const glassSlipperResult = results.find((r) => r.id === "glass_slipper");
  assertExists(glassSlipperResult);
  assertEquals(glassSlipperResult.status, "planted");

  const midnightResult = results.find((r) => r.id === "midnight_deadline");
  assertExists(midnightResult);
  assertEquals(midnightResult.status, "resolved");
});

Deno.test("PositionedDetector - skips annotation with undefined foreshadowing id", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  const content = `<!-- @foreshadowing:存在しない伏線ID -->
「この伏線は定義されていない」`;

  const results = detector.detectWithPositions(content);

  // 存在しないIDはスキップされる（検出されない）
  const undefinedResult = results.find(
    (r) => r.id === "存在しない伏線ID",
  );
  assertEquals(undefinedResult, undefined);
});

Deno.test("PositionedDetector - annotation detection confidence is 1.0", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  const content = `<!-- @foreshadowing:ガラスの靴の伏線 -->
「魔法は真夜中に解けます」`;

  const results = detector.detectWithPositions(content);

  const annotationResult = results.find(
    (r) => r.kind === "foreshadowing" && r.id === "glass_slipper",
  );
  assertExists(annotationResult);
  // 明示的アノテーションなので confidence は 1.0
  assertEquals(annotationResult.confidence, 1.0);
});

Deno.test("PositionedDetector - detects annotation with ID match (not name)", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  // IDで指定
  const content = `<!-- @foreshadowing:glass_slipper -->
「ガラスの靴が輝く」`;

  const results = detector.detectWithPositions(content);

  const annotationResult = results.find(
    (r) => r.kind === "foreshadowing" && r.id === "glass_slipper",
  );
  assertExists(annotationResult);
  assertEquals(annotationResult.status, "planted");
});

// ========================================
// updateEntities: エンティティ動的更新テスト
// ========================================

Deno.test("PositionedDetector - updateEntities replaces existing entities", () => {
  const detector = new PositionedDetector(mockEntities);

  // 初期状態: 勇者が検出される
  const content = "勇者は魔法使いと冒険した。";
  const results1 = detector.detectWithPositions(content);
  assertEquals(results1.length, 1);
  assertEquals(results1[0].id, "hero");

  // エンティティを更新: 新しいキャラクター「魔法使い」を追加
  const newEntities = [
    ...mockEntities,
    {
      kind: "character" as const,
      id: "mage",
      name: "魔法使い",
      displayNames: ["魔法使い"],
      aliases: [],
      filePath: "src/characters/mage.ts",
    },
  ];
  detector.updateEntities(newEntities);

  // 更新後: 両方のキャラクターが検出される
  const results2 = detector.detectWithPositions(content);
  assertEquals(results2.length, 2);
  const heroResult = results2.find((r) => r.id === "hero");
  const mageResult = results2.find((r) => r.id === "mage");
  assertExists(heroResult);
  assertExists(mageResult);
});

Deno.test("PositionedDetector - updateEntities clears internal cache", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  // 初期状態でstatus=plantedで検出される
  const content = "ガラスの靴が輝いていた。";
  const results1 = detector.detectWithPositions(content);
  const foreshadowing1 = results1.find((r) => r.id === "glass_slipper");
  assertExists(foreshadowing1);
  assertEquals(foreshadowing1.status, "planted");

  // エンティティのstatusを変更してupdateEntities
  const updatedEntities = [
    {
      kind: "foreshadowing" as const,
      id: "glass_slipper",
      name: "ガラスの靴の伏線",
      displayNames: ["ガラスの靴"],
      aliases: [],
      filePath: "src/foreshadowings/glass_slipper.ts",
      status: "resolved" as const, // planted → resolved に変更
    },
    {
      kind: "foreshadowing" as const,
      id: "midnight_deadline",
      name: "真夜中の期限",
      displayNames: ["真夜中の期限", "真夜中"],
      aliases: [],
      filePath: "src/foreshadowings/midnight_deadline.ts",
      status: "resolved" as const,
    },
  ];
  detector.updateEntities(updatedEntities);

  // 更新後: status=resolvedで検出される
  const results2 = detector.detectWithPositions(content);
  const foreshadowing2 = results2.find((r) => r.id === "glass_slipper");
  assertExists(foreshadowing2);
  assertEquals(foreshadowing2.status, "resolved");
});

Deno.test("PositionedDetector - updateEntities with empty array clears all entities", () => {
  const detector = new PositionedDetector(mockEntities);

  // 初期状態: 勇者が検出される
  const content = "勇者は剣を抜いた。";
  const results1 = detector.detectWithPositions(content);
  assertEquals(results1.length, 1);

  // 空の配列で更新
  detector.updateEntities([]);

  // 更新後: 何も検出されない
  const results2 = detector.detectWithPositions(content);
  assertEquals(results2.length, 0);
});

// ========================================
// process3: updateSingleEntity 単一エンティティ部分更新テスト
// ========================================

Deno.test("PositionedDetector - updateSingleEntity updates only specified entity", () => {
  const detector = new PositionedDetector(mockForeshadowingEntities);

  // 初期状態でstatus=plantedで検出される
  const content = "ガラスの靴が輝いていた。";
  const results1 = detector.detectWithPositions(content);
  const foreshadowing1 = results1.find((r) => r.id === "glass_slipper");
  assertExists(foreshadowing1);
  assertEquals(foreshadowing1.status, "planted");

  // updateSingleEntityでstatusを変更
  const updatedEntity = {
    kind: "foreshadowing" as const,
    id: "glass_slipper",
    name: "ガラスの靴の伏線",
    displayNames: ["ガラスの靴", "ガラスの靴の伏線"],
    aliases: ["輝く靴"],
    filePath: "src/foreshadowings/glass_slipper.ts",
    status: "resolved" as const, // planted → resolved に変更
  };
  detector.updateSingleEntity(updatedEntity);

  // 更新後: status=resolvedで検出される
  const results2 = detector.detectWithPositions(content);
  const foreshadowing2 = results2.find((r) => r.id === "glass_slipper");
  assertExists(foreshadowing2);
  assertEquals(foreshadowing2.status, "resolved");

  // 他のエンティティは影響を受けない
  const content2 = "真夜中の期限が迫る。";
  const results3 = detector.detectWithPositions(content2);
  const midnight = results3.find((r) => r.id === "midnight_deadline");
  assertExists(midnight);
  assertEquals(midnight.status, "resolved"); // 元のまま
});

Deno.test("PositionedDetector - updateSingleEntity adds new entity if not exists", () => {
  const detector = new PositionedDetector(mockEntities);

  // 初期状態: 魔法使いは検出されない
  const content = "勇者と魔法使いが冒険した。";
  const results1 = detector.detectWithPositions(content);
  const mage1 = results1.find((r) => r.id === "mage");
  assertEquals(mage1, undefined);

  // 新しいエンティティを追加
  const newEntity = {
    kind: "character" as const,
    id: "mage",
    name: "魔法使い",
    displayNames: ["魔法使い"],
    aliases: [],
    filePath: "src/characters/mage.ts",
  };
  detector.updateSingleEntity(newEntity);

  // 更新後: 魔法使いが検出される
  const results2 = detector.detectWithPositions(content);
  const mage2 = results2.find((r) => r.id === "mage");
  assertExists(mage2);
  assertEquals(mage2.kind, "character");
});

Deno.test("PositionedDetector - updateSingleEntity with null does nothing", () => {
  const detector = new PositionedDetector(mockEntities);

  // 初期状態: 勇者が検出される
  const content = "勇者は剣を抜いた。";
  const results1 = detector.detectWithPositions(content);
  assertEquals(results1.length, 1);

  // nullを渡しても何も変わらない
  detector.updateSingleEntity(null);

  // 更新後も同じ
  const results2 = detector.detectWithPositions(content);
  assertEquals(results2.length, 1);
  assertEquals(results2[0].id, "hero");
});

Deno.test("PositionedDetector - updateSingleEntity clears internal cache", () => {
  const detector = new PositionedDetector(mockEntities);

  // 初期検出
  const content = "勇者は城に向かった。";
  detector.detectWithPositions(content);

  // 城のdisplayNamesを更新
  const updatedCastle = {
    kind: "setting" as const,
    id: "castle",
    name: "城",
    displayNames: ["城", "王城", "大城塞"], // "大城塞" を追加
    aliases: ["城塞"],
    filePath: "src/settings/castle.ts",
  };
  detector.updateSingleEntity(updatedCastle);

  // 新しいdisplayNamesで検出される
  const content2 = "勇者は大城塞に向かった。";
  const results = detector.detectWithPositions(content2);
  const castleResult = results.find((r) => r.id === "castle");
  assertExists(castleResult);
});
