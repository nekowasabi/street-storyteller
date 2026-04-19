/**
 * Subplotバリデーター テスト（TDD Red Phase）
 *
 * validateSubplot() と detectBeatPreconditionCycles() の動作を検証
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  detectBeatPreconditionCycles,
  validateSubplot,
} from "@storyteller/plugins/core/subplot/validator.ts";
import type { Subplot } from "@storyteller/types/v2/subplot.ts";

Deno.test("validateSubplot", async (t) => {
  await t.step("有効なSubplotを検証できること", () => {
    const validSubplot: Subplot = {
      id: "valid_subplot",
      name: "有効なサブプロット",
      type: "subplot",
      summary: "有効な概要",
      beats: [],
      focusCharacters: [{ characterId: "hero", weight: "primary" }],
    };

    const result = validateSubplot(validSubplot);
    assertEquals(result.valid, true);
    assertEquals(result.errors, undefined);
  });

  await t.step("nameが空の場合にエラーを返すこと", () => {
    const invalidSubplot = {
      id: "test",
      name: "",
      type: "subplot",
      summary: "概要",
      beats: [],
      focusCharacters: [{ characterId: "hero", weight: "primary" }],
    };

    const result = validateSubplot(invalidSubplot);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const nameError = result.errors.find((e: { field: string }) => e.field === "name");
    assertExists(nameError);
  });

  await t.step("typeが空の場合にエラーを返すこと", () => {
    const invalidSubplot = {
      id: "test",
      name: "テスト",
      type: "",
      summary: "概要",
      beats: [],
      focusCharacters: [{ characterId: "hero", weight: "primary" }],
    };

    const result = validateSubplot(invalidSubplot);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const typeError = result.errors.find((e: { field: string }) => e.field === "type");
    assertExists(typeError);
  });

  await t.step("summaryが空の場合にエラーを返すこと", () => {
    const invalidSubplot = {
      id: "test",
      name: "テスト",
      type: "subplot",
      summary: "",
      beats: [],
      focusCharacters: [{ characterId: "hero", weight: "primary" }],
    };

    const result = validateSubplot(invalidSubplot);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const summaryError = result.errors.find((e: { field: string }) => e.field === "summary");
    assertExists(summaryError);
  });

  await t.step("typeが無効な値の場合にエラーを返すこと", () => {
    const invalidSubplot = {
      id: "test",
      name: "テスト",
      type: "invalid_type",
      summary: "概要",
      beats: [],
      focusCharacters: [{ characterId: "hero", weight: "primary" }],
    };

    const result = validateSubplot(invalidSubplot);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const typeError = result.errors.find((e: { field: string }) => e.field === "type");
    assertExists(typeError);
  });

  await t.step("nullを渡した場合にエラーを返すこと", () => {
    const result = validateSubplot(null);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const rootError = result.errors.find((e: { field: string }) => e.field === "root");
    assertExists(rootError);
  });
});

Deno.test("detectBeatPreconditionCycles", async (t) => {
  await t.step("A->B->A の循環を検出すること", () => {
    const beats = [
      {
        id: "beat_a",
        title: "Beat A",
        summary: "Summary A",
        chapter: "chapter_01",
        characters: [],
        settings: [],
        preconditionBeatIds: ["beat_b"],
      },
      {
        id: "beat_b",
        title: "Beat B",
        summary: "Summary B",
        chapter: "chapter_01",
        characters: [],
        settings: [],
        preconditionBeatIds: ["beat_a"],
      },
    ];

    const cycles = detectBeatPreconditionCycles(beats);
    assertEquals(cycles.length > 0, true);
  });

  await t.step("自己参照 (A->A) を検出すること", () => {
    const beats = [
      {
        id: "beat_a",
        title: "Beat A",
        summary: "Summary A",
        chapter: "chapter_01",
        characters: [],
        settings: [],
        preconditionBeatIds: ["beat_a"],
      },
    ];

    const cycles = detectBeatPreconditionCycles(beats);
    assertEquals(cycles.length > 0, true);
  });

  await t.step("線形DAG (A->B->C) を許容すること", () => {
    const beats = [
      {
        id: "beat_a",
        title: "Beat A",
        summary: "Summary A",
        chapter: "chapter_01",
        characters: [],
        settings: [],
      },
      {
        id: "beat_b",
        title: "Beat B",
        summary: "Summary B",
        chapter: "chapter_02",
        characters: [],
        settings: [],
        preconditionBeatIds: ["beat_a"],
      },
      {
        id: "beat_c",
        title: "Beat C",
        summary: "Summary C",
        chapter: "chapter_03",
        characters: [],
        settings: [],
        preconditionBeatIds: ["beat_b"],
      },
    ];

    const cycles = detectBeatPreconditionCycles(beats);
    assertEquals(cycles.length, 0);
  });

  await t.step("前提条件なしのビートを許容すること", () => {
    const beats = [
      {
        id: "beat_a",
        title: "Beat A",
        summary: "Summary A",
        chapter: "chapter_01",
        characters: [],
        settings: [],
      },
      {
        id: "beat_b",
        title: "Beat B",
        summary: "Summary B",
        chapter: "chapter_02",
        characters: [],
        settings: [],
      },
    ];

    const cycles = detectBeatPreconditionCycles(beats);
    assertEquals(cycles.length, 0);
  });
});
