/**
 * Foreshadowingバリデーター テスト（TDD Red Phase）
 *
 * validateForeshadowing()関数の動作を検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { validateForeshadowing } from "../../../../src/plugins/core/foreshadowing/validator.ts";
import type { Foreshadowing } from "../../../../src/type/v2/foreshadowing.ts";

Deno.test("validateForeshadowing", async (t) => {
  await t.step("有効なForeshadowingを検証できること", () => {
    const validForeshadowing: Foreshadowing = {
      id: "valid_foreshadowing",
      name: "有効な伏線",
      type: "hint",
      summary: "有効な概要",
      planting: {
        chapter: "chapter_01",
        description: "設置の説明",
      },
      status: "planted",
    };

    const result = validateForeshadowing(validForeshadowing);
    assertEquals(result.valid, true);
    assertEquals(result.errors, undefined);
  });

  await t.step("idが空の場合にエラーを返すこと", () => {
    const invalidForeshadowing = {
      id: "",
      name: "テスト",
      type: "hint",
      summary: "概要",
      planting: {
        chapter: "chapter_01",
        description: "設置",
      },
      status: "planted",
    };

    const result = validateForeshadowing(invalidForeshadowing);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const idError = result.errors.find((e) => e.field === "id");
    assertExists(idError);
  });

  await t.step("nameが空の場合にエラーを返すこと", () => {
    const invalidForeshadowing = {
      id: "test",
      name: "",
      type: "hint",
      summary: "概要",
      planting: {
        chapter: "chapter_01",
        description: "設置",
      },
      status: "planted",
    };

    const result = validateForeshadowing(invalidForeshadowing);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const nameError = result.errors.find((e) => e.field === "name");
    assertExists(nameError);
  });

  await t.step("typeが無効な値の場合にエラーを返すこと", () => {
    const invalidForeshadowing = {
      id: "test",
      name: "テスト",
      type: "invalid_type",
      summary: "概要",
      planting: {
        chapter: "chapter_01",
        description: "設置",
      },
      status: "planted",
    };

    const result = validateForeshadowing(invalidForeshadowing);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const typeError = result.errors.find((e) => e.field === "type");
    assertExists(typeError);
  });

  await t.step("summaryが空の場合にエラーを返すこと", () => {
    const invalidForeshadowing = {
      id: "test",
      name: "テスト",
      type: "hint",
      summary: "",
      planting: {
        chapter: "chapter_01",
        description: "設置",
      },
      status: "planted",
    };

    const result = validateForeshadowing(invalidForeshadowing);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const summaryError = result.errors.find((e) => e.field === "summary");
    assertExists(summaryError);
  });

  await t.step("plantingがない場合にエラーを返すこと", () => {
    const invalidForeshadowing = {
      id: "test",
      name: "テスト",
      type: "hint",
      summary: "概要",
      status: "planted",
    };

    const result = validateForeshadowing(invalidForeshadowing);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const plantingError = result.errors.find((e) => e.field === "planting");
    assertExists(plantingError);
  });

  await t.step("planting.chapterが空の場合にエラーを返すこと", () => {
    const invalidForeshadowing = {
      id: "test",
      name: "テスト",
      type: "hint",
      summary: "概要",
      planting: {
        chapter: "",
        description: "設置",
      },
      status: "planted",
    };

    const result = validateForeshadowing(invalidForeshadowing);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const chapterError = result.errors.find((e) =>
      e.field === "planting.chapter"
    );
    assertExists(chapterError);
  });

  await t.step("planting.descriptionが空の場合にエラーを返すこと", () => {
    const invalidForeshadowing = {
      id: "test",
      name: "テスト",
      type: "hint",
      summary: "概要",
      planting: {
        chapter: "chapter_01",
        description: "",
      },
      status: "planted",
    };

    const result = validateForeshadowing(invalidForeshadowing);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const descError = result.errors.find((e) =>
      e.field === "planting.description"
    );
    assertExists(descError);
  });

  await t.step("statusが無効な値の場合にエラーを返すこと", () => {
    const invalidForeshadowing = {
      id: "test",
      name: "テスト",
      type: "hint",
      summary: "概要",
      planting: {
        chapter: "chapter_01",
        description: "設置",
      },
      status: "invalid_status",
    };

    const result = validateForeshadowing(invalidForeshadowing);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const statusError = result.errors.find((e) => e.field === "status");
    assertExists(statusError);
  });

  await t.step(
    "resolved/partially_resolvedでresolutionsがない場合にエラーを返すこと",
    () => {
      const resolvedWithoutResolutions = {
        id: "test",
        name: "テスト",
        type: "hint",
        summary: "概要",
        planting: {
          chapter: "chapter_01",
          description: "設置",
        },
        status: "resolved",
        // resolutionsがない
      };

      const result = validateForeshadowing(resolvedWithoutResolutions);
      assertEquals(result.valid, false);
      assertExists(result.errors);
      const resolutionError = result.errors.find((e) =>
        e.field === "resolutions"
      );
      assertExists(resolutionError);

      const partiallyResolvedWithoutResolutions = {
        id: "test2",
        name: "テスト2",
        type: "hint",
        summary: "概要",
        planting: {
          chapter: "chapter_01",
          description: "設置",
        },
        status: "partially_resolved",
        // resolutionsがない
      };

      const result2 = validateForeshadowing(
        partiallyResolvedWithoutResolutions,
      );
      assertEquals(result2.valid, false);
      assertExists(result2.errors);
      const resolutionError2 = result2.errors.find((e) =>
        e.field === "resolutions"
      );
      assertExists(resolutionError2);
    },
  );

  await t.step("completenessが0.0未満の場合にエラーを返すこと", () => {
    const invalidCompleteness = {
      id: "test",
      name: "テスト",
      type: "hint",
      summary: "概要",
      planting: {
        chapter: "chapter_01",
        description: "設置",
      },
      status: "resolved",
      resolutions: [
        {
          chapter: "chapter_10",
          description: "回収",
          completeness: -0.1, // 無効
        },
      ],
    };

    const result = validateForeshadowing(invalidCompleteness);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const completenessError = result.errors.find((e) =>
      e.field.includes("completeness")
    );
    assertExists(completenessError);
  });

  await t.step("completenessが1.0を超える場合にエラーを返すこと", () => {
    const invalidCompleteness = {
      id: "test",
      name: "テスト",
      type: "hint",
      summary: "概要",
      planting: {
        chapter: "chapter_01",
        description: "設置",
      },
      status: "resolved",
      resolutions: [
        {
          chapter: "chapter_10",
          description: "回収",
          completeness: 1.5, // 無効
        },
      ],
    };

    const result = validateForeshadowing(invalidCompleteness);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const completenessError = result.errors.find((e) =>
      e.field.includes("completeness")
    );
    assertExists(completenessError);
  });

  await t.step("resolution.chapterが空の場合にエラーを返すこと", () => {
    const invalidResolution = {
      id: "test",
      name: "テスト",
      type: "hint",
      summary: "概要",
      planting: {
        chapter: "chapter_01",
        description: "設置",
      },
      status: "resolved",
      resolutions: [
        {
          chapter: "",
          description: "回収",
          completeness: 1.0,
        },
      ],
    };

    const result = validateForeshadowing(invalidResolution);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const chapterError = result.errors.find((e) =>
      e.field.includes("resolutions") && e.field.includes("chapter")
    );
    assertExists(chapterError);
  });

  await t.step("red_herringでabandonedステータスを許容すること", () => {
    const redHerring: Foreshadowing = {
      id: "red_herring_01",
      name: "ミスリード",
      type: "red_herring",
      summary: "読者を惑わすための偽の手がかり",
      planting: {
        chapter: "chapter_03",
        description: "従者が怪しい行動をとる",
      },
      status: "abandoned",
    };

    const result = validateForeshadowing(redHerring);
    assertEquals(result.valid, true);
  });

  await t.step("red_herring以外でabandonedは警告レベル（許容）", () => {
    // red_herring以外でabandonedは技術的に許容するが、
    // 実際の運用では意図しない可能性がある
    // 現時点では検証を緩めにして許容する
    const abandonedHint = {
      id: "abandoned_hint",
      name: "放棄された伏線",
      type: "hint",
      summary: "最終的に使わなくなった伏線",
      planting: {
        chapter: "chapter_01",
        description: "設置",
      },
      status: "abandoned",
    };

    const result = validateForeshadowing(abandonedHint);
    // 技術的には有効（警告が望ましいが、現実装では許容）
    assertEquals(result.valid, true);
  });

  await t.step("nullを渡した場合にエラーを返すこと", () => {
    const result = validateForeshadowing(null);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    const rootError = result.errors.find((e) => e.field === "root");
    assertExists(rootError);
  });

  await t.step("オブジェクトでない値を渡した場合にエラーを返すこと", () => {
    const result = validateForeshadowing("not an object");
    assertEquals(result.valid, false);
    assertExists(result.errors);
  });
});
