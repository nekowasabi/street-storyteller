/**
 * 伏線ドキュメントテンプレートテスト
 * Process 20: 全要素タイプ対応
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { generateForeshadowingDocument } from "@storyteller/rag/templates/foreshadowing.ts";
import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

Deno.test("generateForeshadowingDocument - 設置済み伏線", () => {
  const foreshadowing: Foreshadowing = {
    id: "glass_slipper",
    name: "ガラスの靴の伏線",
    type: "chekhov",
    summary: "ガラスの靴による身元判明",
    planting: {
      chapter: "chapter02",
      description: "妖精のおばあさんが特別なガラスの靴を用意する",
    },
    status: "planted",
    importance: "major",
    relations: {
      characters: ["fairy_godmother", "cinderella"],
      settings: ["glass_slipper_item"],
    },
  };

  const doc = generateForeshadowingDocument(foreshadowing);

  // タイトル確認
  assertStringIncludes(doc.title, "Foreshadowing:");
  assertStringIncludes(doc.title, "ガラスの靴の伏線");

  // ID確認
  assertEquals(doc.id, "foreshadowing_glass_slipper");

  // タグ確認
  assertEquals(doc.tags.includes("foreshadowing"), true);
  assertEquals(doc.tags.includes("planted"), true);
  assertEquals(doc.tags.includes("chekhov"), true);
  assertEquals(doc.tags.includes("major"), true);

  // コンテンツ確認
  assertStringIncludes(doc.content, "## 設置情報");
  assertStringIncludes(doc.content, "chapter02");
  assertStringIncludes(doc.content, "## 関連エンティティ");
  assertStringIncludes(doc.content, "fairy_godmother");
});

Deno.test("generateForeshadowingDocument - 回収済み伏線", () => {
  const foreshadowing: Foreshadowing = {
    id: "prophecy",
    name: "予言の伏線",
    type: "prophecy",
    summary: "王子との結婚を予言",
    planting: {
      chapter: "chapter01",
      description: "冒頭で予言される",
    },
    status: "resolved",
    resolutions: [
      {
        chapter: "chapter10",
        description: "王子と結婚し予言が成就",
        completeness: 1.0,
      },
    ],
  };

  const doc = generateForeshadowingDocument(foreshadowing);

  assertEquals(doc.tags.includes("resolved"), true);
  assertStringIncludes(doc.content, "## 回収情報");
  assertStringIncludes(doc.content, "chapter10");
  assertStringIncludes(doc.content, "100%");
});

Deno.test("generateForeshadowingDocument - 部分回収伏線", () => {
  const foreshadowing: Foreshadowing = {
    id: "mystery",
    name: "謎の伏線",
    type: "mystery",
    summary: "謎が徐々に解明される",
    planting: {
      chapter: "chapter03",
      description: "謎が提示される",
    },
    status: "partially_resolved",
    resolutions: [
      {
        chapter: "chapter05",
        description: "一部が解明",
        completeness: 0.5,
      },
    ],
  };

  const doc = generateForeshadowingDocument(foreshadowing);

  assertEquals(doc.tags.includes("partially_resolved"), true);
  assertStringIncludes(doc.content, "50%");
});

Deno.test("generateForeshadowingDocument - displayNames付き", () => {
  const foreshadowing: Foreshadowing = {
    id: "symbol",
    name: "象徴の伏線",
    type: "symbol",
    summary: "繰り返し登場するモチーフ",
    planting: {
      chapter: "chapter01",
      description: "モチーフ初出",
    },
    status: "planted",
    displayNames: ["象徴", "モチーフ"],
  };

  const doc = generateForeshadowingDocument(foreshadowing);

  assertEquals(doc.tags.includes("象徴"), true);
  assertEquals(doc.tags.includes("モチーフ"), true);
});

Deno.test("generateForeshadowingDocument - 日付形式確認", () => {
  const foreshadowing: Foreshadowing = {
    id: "test",
    name: "テスト",
    type: "hint",
    summary: "テスト用",
    planting: { chapter: "chapter01", description: "設置" },
    status: "planted",
  };

  const doc = generateForeshadowingDocument(foreshadowing);

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  assertEquals(datePattern.test(doc.date), true);
});
