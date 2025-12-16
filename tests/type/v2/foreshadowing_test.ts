/**
 * Foreshadowing型定義のテスト（TDD Red Phase）
 *
 * Foreshadowing/PlantingInfo/ResolutionInfo型が正しく定義されていることを検証
 */

import { assertEquals, assertExists } from "@std/assert";

// インポートテスト（この時点では失敗する）
import type {
  Foreshadowing,
  ForeshadowingDetails,
  ForeshadowingDetectionHints,
  ForeshadowingImportance,
  ForeshadowingRelations,
  ForeshadowingStatus,
  ForeshadowingType,
  PlantingInfo,
  ResolutionInfo,
} from "../../../src/type/v2/foreshadowing.ts";

Deno.test("Foreshadowing型定義", async (t) => {
  await t.step("ForeshadowingStatus型が4種類のリテラル型であること", () => {
    const statuses: ForeshadowingStatus[] = [
      "planted",
      "partially_resolved",
      "resolved",
      "abandoned",
    ];
    assertEquals(statuses.length, 4);
  });

  await t.step("ForeshadowingType型が6種類のリテラル型であること", () => {
    const types: ForeshadowingType[] = [
      "hint",
      "prophecy",
      "mystery",
      "symbol",
      "chekhov",
      "red_herring",
    ];
    assertEquals(types.length, 6);
  });

  await t.step("ForeshadowingImportance型が3種類のリテラル型であること", () => {
    const importances: ForeshadowingImportance[] = [
      "major",
      "minor",
      "subtle",
    ];
    assertEquals(importances.length, 3);
  });

  await t.step(
    "PlantingInfo型がchapter, descriptionを必須で持つこと",
    () => {
      // 必須フィールドのみ
      const minimalPlanting: PlantingInfo = {
        chapter: "chapter_01",
        description: "勇者が古びた剣を発見する",
      };
      assertExists(minimalPlanting.chapter);
      assertExists(minimalPlanting.description);

      // 全フィールド指定
      const fullPlanting: PlantingInfo = {
        chapter: "chapter_01",
        description: "勇者が古びた剣を発見する",
        excerpt: "床板の下には、錆びた剣が眠っていた。",
        eventId: "event_discover_sword",
      };
      assertExists(fullPlanting.excerpt);
      assertExists(fullPlanting.eventId);
    },
  );

  await t.step(
    "PlantingInfo型のexcerptがファイル参照をサポートすること",
    () => {
      const plantingWithFile: PlantingInfo = {
        chapter: "chapter_01",
        description: "伏線の説明",
        excerpt: { file: "foreshadowings/sword_excerpt.md" },
      };
      assertExists(plantingWithFile.excerpt);
    },
  );

  await t.step(
    "ResolutionInfo型がchapter, description, completenessを必須で持つこと",
    () => {
      // 必須フィールドのみ
      const minimalResolution: ResolutionInfo = {
        chapter: "chapter_10",
        description: "剣が実は伝説の聖剣だと判明する",
        completeness: 1.0,
      };
      assertExists(minimalResolution.chapter);
      assertExists(minimalResolution.description);
      assertExists(minimalResolution.completeness);

      // 全フィールド指定
      const fullResolution: ResolutionInfo = {
        chapter: "chapter_10",
        description: "剣が実は伝説の聖剣だと判明する",
        excerpt: "「これは...伝説の聖剣ではないか!」",
        eventId: "event_reveal_sword",
        completeness: 0.5,
      };
      assertExists(fullResolution.excerpt);
      assertExists(fullResolution.eventId);
      assertEquals(fullResolution.completeness, 0.5);
    },
  );

  await t.step(
    "ResolutionInfo型のcompletenessが0.0から1.0の範囲であること",
    () => {
      const resolution: ResolutionInfo = {
        chapter: "chapter_05",
        description: "部分的な回収",
        completeness: 0.3,
      };
      assertEquals(resolution.completeness >= 0.0, true);
      assertEquals(resolution.completeness <= 1.0, true);
    },
  );

  await t.step("ForeshadowingDetails型が詳細情報を持つこと", () => {
    const details: ForeshadowingDetails = {
      intent: "読者に剣の重要性を暗示する",
      readerImpact: "回収時の驚きを演出",
      resolutionIdea: "最終決戦で真価を発揮させる",
      notes: "第5話で少し触れておく",
    };
    assertExists(details.intent);
    assertExists(details.readerImpact);
    assertExists(details.resolutionIdea);
    assertExists(details.notes);
  });

  await t.step("ForeshadowingDetails型がファイル参照をサポートすること", () => {
    const details: ForeshadowingDetails = {
      intent: { file: "foreshadowings/sword_intent.md" },
      notes: "インラインのメモ",
    };
    assertExists(details.intent);
    assertExists(details.notes);
  });

  await t.step("ForeshadowingDetectionHints型が検出ヒントを持つこと", () => {
    const hints: ForeshadowingDetectionHints = {
      commonPatterns: ["古びた剣", "錆びた刀身"],
      excludePatterns: ["飾り剣"],
      confidence: 0.85,
    };
    assertEquals(hints.commonPatterns.length, 2);
    assertEquals(hints.excludePatterns.length, 1);
    assertEquals(hints.confidence, 0.85);
  });

  await t.step("ForeshadowingRelations型が関連エンティティを持つこと", () => {
    const relations: ForeshadowingRelations = {
      characters: ["hero", "mentor"],
      settings: ["ancient_temple"],
      relatedForeshadowings: ["prophecy_hero"],
    };
    assertEquals(relations.characters.length, 2);
    assertEquals(relations.settings.length, 1);
    assertEquals(relations.relatedForeshadowings?.length, 1);
  });

  await t.step("Foreshadowing型が必須フィールドを持つこと", () => {
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

    assertExists(foreshadowing.id);
    assertExists(foreshadowing.name);
    assertExists(foreshadowing.type);
    assertExists(foreshadowing.summary);
    assertExists(foreshadowing.planting);
    assertExists(foreshadowing.status);
  });

  await t.step("Foreshadowing型のオプショナルフィールドを持てること", () => {
    const foreshadowing: Foreshadowing = {
      id: "ancient_sword",
      name: "古びた剣の謎",
      type: "chekhov",
      summary: "物語序盤で発見される錆びた剣が、終盤で重要な役割を果たす",
      planting: {
        chapter: "chapter_01",
        description: "床板の下から古びた剣を発見する",
      },
      status: "resolved",
      importance: "major",
      resolutions: [
        {
          chapter: "chapter_05",
          description: "剣が光り始める",
          completeness: 0.3,
        },
        {
          chapter: "chapter_10",
          description: "聖剣と判明",
          completeness: 1.0,
        },
      ],
      plannedResolutionChapter: "chapter_10",
      relations: {
        characters: ["hero"],
        settings: ["ancient_temple"],
      },
      displayNames: ["古びた剣", "錆びた剣"],
      details: {
        intent: "読者に謎を提示",
        readerImpact: "驚きと納得感",
      },
      detectionHints: {
        commonPatterns: ["古びた剣"],
        excludePatterns: [],
        confidence: 0.9,
      },
    };

    assertExists(foreshadowing.importance);
    assertEquals(foreshadowing.importance, "major");
    assertExists(foreshadowing.resolutions);
    assertEquals(foreshadowing.resolutions?.length, 2);
    assertExists(foreshadowing.plannedResolutionChapter);
    assertExists(foreshadowing.relations);
    assertExists(foreshadowing.displayNames);
    assertExists(foreshadowing.details);
    assertExists(foreshadowing.detectionHints);
  });

  await t.step(
    "resolved/partially_resolvedステータスではresolutionsを持てること",
    () => {
      const resolvedForeshadowing: Foreshadowing = {
        id: "prophecy_01",
        name: "予言の成就",
        type: "prophecy",
        summary: "勇者が魔王を倒すという予言",
        planting: {
          chapter: "chapter_01",
          description: "老婆が予言を告げる",
        },
        status: "resolved",
        resolutions: [
          {
            chapter: "chapter_final",
            description: "魔王を倒して予言が成就",
            completeness: 1.0,
          },
        ],
      };
      assertEquals(resolvedForeshadowing.status, "resolved");
      assertEquals(resolvedForeshadowing.resolutions?.length, 1);

      const partiallyResolvedForeshadowing: Foreshadowing = {
        id: "mystery_01",
        name: "謎の手紙",
        type: "mystery",
        summary: "差出人不明の手紙の謎",
        planting: {
          chapter: "chapter_02",
          description: "謎の手紙が届く",
        },
        status: "partially_resolved",
        resolutions: [
          {
            chapter: "chapter_05",
            description: "手紙の一部が解読される",
            completeness: 0.5,
          },
        ],
      };
      assertEquals(partiallyResolvedForeshadowing.status, "partially_resolved");
      assertEquals(partiallyResolvedForeshadowing.resolutions?.length, 1);
      assertEquals(
        partiallyResolvedForeshadowing.resolutions?.[0].completeness,
        0.5,
      );
    },
  );

  await t.step("red_herringタイプではabandonedステータスを持てること", () => {
    const redHerring: Foreshadowing = {
      id: "red_herring_01",
      name: "ミスリード：怪しい従者",
      type: "red_herring",
      summary: "読者を惑わすための偽の手がかり",
      planting: {
        chapter: "chapter_03",
        description: "従者が怪しい行動をとる",
      },
      status: "abandoned",
    };
    assertEquals(redHerring.type, "red_herring");
    assertEquals(redHerring.status, "abandoned");
  });
});
