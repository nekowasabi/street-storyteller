/**
 * ForeshadowingPlugin テスト（TDD Red Phase）
 *
 * ForeshadowingPluginがElementPluginインターフェースを正しく実装していることを検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { ForeshadowingPlugin } from "../../../../src/plugins/core/foreshadowing/plugin.ts";
import type { Foreshadowing } from "../../../../src/type/v2/foreshadowing.ts";

Deno.test("ForeshadowingPlugin", async (t) => {
  const plugin = new ForeshadowingPlugin();

  await t.step("PluginMetadataが正しく設定されていること", () => {
    assertExists(plugin.meta);
    assertEquals(plugin.meta.id, "storyteller.element.foreshadowing");
    assertEquals(plugin.meta.version, "1.0.0");
    assertEquals(plugin.meta.name, "Foreshadowing Element Plugin");
  });

  await t.step("elementTypeがforeshadowingであること", () => {
    assertEquals(plugin.elementType, "foreshadowing");
  });

  await t.step(
    "createElementFile()で伏線ファイルを生成できること",
    async () => {
      const foreshadowing: Foreshadowing = {
        id: "ancient_sword",
        name: "古びた剣の謎",
        type: "chekhov",
        summary: "物語序盤で発見される錆びた剣が、終盤で重要な役割を果たす",
        planting: {
          chapter: "chapter_01",
          description: "床板の下から古びた剣を発見する",
        },
        status: "planted",
      };

      const result = await plugin.createElementFile(foreshadowing);

      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(
          result.value.filePath,
          "src/foreshadowings/ancient_sword.ts",
        );
        // 生成されたコンテンツにForeshadowing型インポートが含まれること
        assertEquals(
          result.value.content.includes("import type { Foreshadowing }"),
          true,
        );
        // エクスポートが含まれること
        assertEquals(
          result.value.content.includes("export const ancient_sword"),
          true,
        );
      }
    },
  );

  await t.step(
    "createElementFile()が必須フィールド欠落時にエラーを返すこと",
    async () => {
      const invalidForeshadowing = {
        id: "invalid",
        // name, type, summary, planting, status が欠落
      };

      const result = await plugin.createElementFile(invalidForeshadowing);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(
          result.error.message.includes("Missing required fields"),
          true,
        );
      }
    },
  );

  await t.step(
    "validateElement()がForeshadowing整合性チェックできること",
    () => {
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

      const result = plugin.validateElement(validForeshadowing);
      assertEquals(result.valid, true);
    },
  );

  await t.step("validateElement()が無効なForeshadowing検出できること", () => {
    const invalidForeshadowing = {
      id: "",
      name: "無効な伏線",
    };

    const result = plugin.validateElement(invalidForeshadowing);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    assertEquals(result.errors.length > 0, true);
  });

  await t.step("validateElement()がtype検証できること", () => {
    const invalidType = {
      id: "test",
      name: "テスト",
      type: "invalid_type", // 無効なタイプ
      summary: "概要",
      planting: {
        chapter: "chapter_01",
        description: "設置",
      },
      status: "planted",
    };

    const result = plugin.validateElement(invalidType);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    // typeエラーが含まれることを確認
    const typeError = result.errors.find((e: { field: string }) =>
      e.field === "type"
    );
    assertExists(typeError);
  });

  await t.step("validateElement()がstatus検証できること", () => {
    const invalidStatus = {
      id: "test",
      name: "テスト",
      type: "hint",
      summary: "概要",
      planting: {
        chapter: "chapter_01",
        description: "設置",
      },
      status: "invalid_status", // 無効なステータス
    };

    const result = plugin.validateElement(invalidStatus);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    // statusエラーが含まれることを確認
    const statusError = result.errors.find((e: { field: string }) =>
      e.field === "status"
    );
    assertExists(statusError);
  });

  await t.step(
    "exportElementSchema()がForeshadowing型スキーマを返すこと",
    () => {
      const schema = plugin.exportElementSchema();

      assertEquals(schema.type, "foreshadowing");
      assertExists(schema.properties.id);
      assertExists(schema.properties.name);
      assertExists(schema.properties.type);
      assertExists(schema.properties.summary);
      assertExists(schema.properties.planting);
      assertExists(schema.properties.status);
      assertEquals(schema.required?.includes("id"), true);
      assertEquals(schema.required?.includes("name"), true);
      assertEquals(schema.required?.includes("type"), true);
      assertEquals(schema.required?.includes("summary"), true);
      assertEquals(schema.required?.includes("planting"), true);
      assertEquals(schema.required?.includes("status"), true);
    },
  );

  await t.step("getElementPath()が正しいファイルパスを返すこと", () => {
    const path = plugin.getElementPath("ancient_sword", "/project");
    assertEquals(path, "/project/src/foreshadowings/ancient_sword.ts");
  });

  await t.step("getDetailsDir()が正しい詳細ディレクトリパスを返すこと", () => {
    const dir = plugin.getDetailsDir("ancient_sword", "/project");
    assertEquals(dir, "/project/src/foreshadowings/ancient_sword/details");
  });

  await t.step("回収情報付き伏線を生成できること", async () => {
    const foreshadowing: Foreshadowing = {
      id: "resolved_mystery",
      name: "解決された謎",
      type: "mystery",
      summary: "謎が解決される伏線",
      planting: {
        chapter: "chapter_01",
        description: "謎が提示される",
      },
      status: "resolved",
      resolutions: [
        {
          chapter: "chapter_05",
          description: "謎の一部が解ける",
          completeness: 0.5,
        },
        {
          chapter: "chapter_10",
          description: "謎が完全に解決",
          completeness: 1.0,
        },
      ],
    };

    const result = await plugin.createElementFile(foreshadowing);

    assertEquals(result.ok, true);
    if (result.ok) {
      // 回収情報が含まれること
      assertEquals(result.value.content.includes("resolutions"), true);
      assertEquals(result.value.content.includes("completeness"), true);
      assertEquals(result.value.content.includes("chapter_05"), true);
      assertEquals(result.value.content.includes("chapter_10"), true);
    }
  });

  await t.step("オプショナルフィールド付き伏線を生成できること", async () => {
    const foreshadowing: Foreshadowing = {
      id: "full_foreshadowing",
      name: "フル機能伏線",
      type: "prophecy",
      summary: "すべてのフィールドを持つ伏線",
      planting: {
        chapter: "chapter_01",
        description: "予言が告げられる",
        excerpt: "「勇者は魔王を倒すであろう」",
        eventId: "event_prophecy",
      },
      status: "partially_resolved",
      importance: "major",
      resolutions: [
        {
          chapter: "chapter_08",
          description: "予言の一部が成就",
          completeness: 0.5,
        },
      ],
      plannedResolutionChapter: "chapter_final",
      relations: {
        characters: ["hero", "prophet"],
        settings: ["temple"],
        relatedForeshadowings: ["ancient_sword"],
      },
      displayNames: ["運命の予言", "英雄の予言"],
      details: {
        intent: "物語の大きな流れを示唆",
        readerImpact: "期待感を高める",
      },
      detectionHints: {
        commonPatterns: ["予言", "運命"],
        excludePatterns: [],
        confidence: 0.9,
      },
    };

    const result = await plugin.createElementFile(foreshadowing);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.content.includes("importance"), true);
      assertEquals(result.value.content.includes("major"), true);
      assertEquals(
        result.value.content.includes("plannedResolutionChapter"),
        true,
      );
      assertEquals(result.value.content.includes("relations"), true);
      assertEquals(result.value.content.includes("displayNames"), true);
      assertEquals(result.value.content.includes("details"), true);
      assertEquals(result.value.content.includes("detectionHints"), true);
    }
  });
});
