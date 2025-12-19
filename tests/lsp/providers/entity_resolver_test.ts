/**
 * EntityResolverテスト
 * process2 sub2: EntityResolverにforeshadowing解決追加
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  PositionedDetector,
} from "@storyteller/lsp/detection/positioned_detector.ts";
import {
  createEntityResolver,
} from "@storyteller/lsp/providers/entity_resolver.ts";

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
    kind: "setting" as const,
    id: "castle",
    name: "城",
    displayNames: ["城", "王城"],
    aliases: ["城塞"],
    filePath: "src/settings/castle.ts",
  },
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

Deno.test("EntityResolver - resolves foreshadowing at position", () => {
  const detector = new PositionedDetector(mockEntities);
  const resolver = createEntityResolver(detector);

  const content = "ガラスの靴を見つけた。";
  const entity = resolver.resolveAtPosition(content, { line: 0, character: 0 });

  assertExists(entity);
  assertEquals(entity.kind, "foreshadowing");
  assertEquals(entity.id, "glass_slipper");
  assertEquals(entity.status, "planted");
});

Deno.test("EntityResolver - detects all foreshadowings", () => {
  const detector = new PositionedDetector(mockEntities);
  const resolver = createEntityResolver(detector);

  const content = "ガラスの靴と真夜中の期限が物語を動かす。";
  const results = resolver.detectAll(content);

  const foreshadowings = results.filter((r) => r.kind === "foreshadowing");
  assertEquals(foreshadowings.length, 2);

  const plantedResult = foreshadowings.find((r) => r.id === "glass_slipper");
  assertExists(plantedResult);
  assertEquals(plantedResult.status, "planted");

  const resolvedResult = foreshadowings.find((r) =>
    r.id === "midnight_deadline"
  );
  assertExists(resolvedResult);
  assertEquals(resolvedResult.status, "resolved");
});

Deno.test("EntityResolver - resolves foreshadowing in frontmatter", () => {
  const detector = new PositionedDetector(mockEntities);
  const resolver = createEntityResolver(detector);

  const content = `---
storyteller:
  foreshadowings:
    - glass_slipper
---`;

  // "glass_slipper" は行3、位置6から
  const entity = resolver.resolveAtPosition(content, { line: 3, character: 6 });

  assertExists(entity);
  assertEquals(entity.kind, "foreshadowing");
  assertEquals(entity.id, "glass_slipper");
});

Deno.test("EntityResolver - returns undefined for non-entity position", () => {
  const detector = new PositionedDetector(mockEntities);
  const resolver = createEntityResolver(detector);

  const content = "何も関連するものがない文章。";
  const entity = resolver.resolveAtPosition(content, { line: 0, character: 0 });

  assertEquals(entity, undefined);
});

Deno.test("EntityResolver - handles empty content", () => {
  const detector = new PositionedDetector(mockEntities);
  const resolver = createEntityResolver(detector);

  const entity = resolver.resolveAtPosition("", { line: 0, character: 0 });
  assertEquals(entity, undefined);

  const results = resolver.detectAll("");
  assertEquals(results.length, 0);
});
