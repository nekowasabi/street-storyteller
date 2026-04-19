/**
 * Subplot型定義のテスト（TDD Red Phase）
 *
 * Subplot/PlotBeat/PlotIntersection/SubplotDetails/SubplotRelations型が
 * 正しく定義されていることを検証
 */

import { assertEquals, assertExists } from "@std/assert";

// インポートテスト（この時点では失敗する）
import type {
  BeatStructurePosition,
  IntersectionInfluenceDirection,
  IntersectionInfluenceLevel,
  PlotBeat,
  PlotIntersection,
  Subplot,
  SubplotDetails,
  SubplotFocusCharacterWeight,
  SubplotImportance,
  SubplotRelations,
  SubplotStatus,
  SubplotType,
} from "@storyteller/types/v2/subplot.ts";

Deno.test("Subplot型定義", async (t) => {
  // ========================================
  // リテラル型テスト
  // ========================================

  await t.step("SubplotType型が4種類のリテラル型であること", () => {
    const types: SubplotType[] = [
      "main",
      "subplot",
      "parallel",
      "background",
    ];
    assertEquals(types.length, 4);
  });

  await t.step("SubplotStatus型が2種類のリテラル型であること", () => {
    const statuses: SubplotStatus[] = [
      "active",
      "completed",
    ];
    assertEquals(statuses.length, 2);
  });

  await t.step("SubplotImportance型が2種類のリテラル型であること", () => {
    const importances: SubplotImportance[] = [
      "major",
      "minor",
    ];
    assertEquals(importances.length, 2);
  });

  await t.step("BeatStructurePosition型が5種類のリテラル型であること", () => {
    const positions: BeatStructurePosition[] = [
      "setup",
      "rising",
      "climax",
      "falling",
      "resolution",
    ];
    assertEquals(positions.length, 5);
  });

  await t.step(
    "IntersectionInfluenceDirection型が3種類のリテラル型であること",
    () => {
      const directions: IntersectionInfluenceDirection[] = [
        "forward",
        "backward",
        "mutual",
      ];
      assertEquals(directions.length, 3);
    },
  );

  await t.step(
    "IntersectionInfluenceLevel型が3種類のリテラル型であること",
    () => {
      const levels: IntersectionInfluenceLevel[] = [
        "high",
        "medium",
        "low",
      ];
      assertEquals(levels.length, 3);
    },
  );

  await t.step(
    "SubplotFocusCharacterWeight型が2種類のリテラル型であること",
    () => {
      const weights: SubplotFocusCharacterWeight[] = [
        "primary",
        "secondary",
      ];
      assertEquals(weights.length, 2);
    },
  );

  // ========================================
  // PlotBeatテスト
  // ========================================

  await t.step(
    "PlotBeat型が必須フィールド(id, title, summary, structurePosition)を持つこと",
    () => {
      const beat: PlotBeat = {
        id: "ball_announcement",
        title: "舞踏会の告知",
        summary: "王子の舞踏会が発表される",
        structurePosition: "setup",
      };
      assertExists(beat.id);
      assertExists(beat.title);
      assertExists(beat.summary);
      assertExists(beat.structurePosition);
    },
  );

  await t.step(
    "PlotBeat型がオプショナルフィールド(chapter, characters, settings等)を持てること",
    () => {
      const beat: PlotBeat = {
        id: "meets_mysterious_lady",
        title: "謎の女性との出会い",
        summary: "王子が舞踏会で謎の美しい女性と出会う",
        chapter: "chapter_02",
        characters: ["prince", "cinderella"],
        settings: ["castle_ballroom"],
        structurePosition: "rising",
        preconditionBeatIds: ["ball_announcement"],
        timelineEventId: "event_ball_dance",
      };
      assertExists(beat.chapter);
      assertExists(beat.characters);
      assertExists(beat.settings);
      assertExists(beat.structurePosition);
      assertExists(beat.preconditionBeatIds);
      assertExists(beat.timelineEventId);
      assertEquals(beat.preconditionBeatIds, ["ball_announcement"]);
      assertEquals(beat.timelineEventId, "event_ball_dance");
    },
  );

  // ========================================
  // PlotIntersectionテスト
  // ========================================

  await t.step("PlotIntersection型が必須フィールドを持つこと", () => {
    const intersection: PlotIntersection = {
      id: "intersection_001",
      sourceSubplotId: "main_story",
      sourceBeatId: "cinderella_at_ball",
      targetSubplotId: "prince_story",
      targetBeatId: "meets_mysterious_lady",
      summary: "シンデレラと王子が出会う",
      influenceDirection: "mutual",
    };
    assertExists(intersection.id);
    assertExists(intersection.sourceSubplotId);
    assertExists(intersection.sourceBeatId);
    assertExists(intersection.targetSubplotId);
    assertExists(intersection.targetBeatId);
    assertExists(intersection.summary);
    assertExists(intersection.influenceDirection);
  });

  await t.step(
    "PlotIntersection型がオプショナルフィールド(influenceLevel)を持てること",
    () => {
      const intersection: PlotIntersection = {
        id: "intersection_002",
        sourceSubplotId: "fairy_plot",
        sourceBeatId: "grants_wish",
        targetSubplotId: "main_story",
        targetBeatId: "cinderella_transformed",
        summary: "妖精の魔法がシンデレラに影響",
        influenceDirection: "forward",
        influenceLevel: "high",
      };
      assertExists(intersection.influenceLevel);
      assertEquals(intersection.influenceLevel, "high");
    },
  );

  await t.step("PlotIntersection型が全ての影響方向をサポートすること", () => {
    const intersections: PlotIntersection[] = [
      {
        id: "intersection_mutual",
        sourceSubplotId: "main_story",
        sourceBeatId: "cinderella_at_ball",
        targetSubplotId: "prince_story",
        targetBeatId: "meets_mysterious_lady",
        summary: "双方向の運命的出会い",
        influenceDirection: "mutual",
      },
      {
        id: "intersection_forward",
        sourceSubplotId: "fairy_plot",
        sourceBeatId: "grants_wish",
        targetSubplotId: "main_story",
        targetBeatId: "cinderella_transformed",
        summary: "妖精の魔法がシンデレラに影響",
        influenceDirection: "forward",
      },
      {
        id: "intersection_backward",
        sourceSubplotId: "stepmother_plot",
        sourceBeatId: "discovers_truth",
        targetSubplotId: "main_story",
        targetBeatId: "glass_slipper_test",
        summary: "継母の発見がメインプロットに影響",
        influenceDirection: "backward",
      },
    ];
    assertEquals(intersections.length, 3);
    assertEquals(intersections[0].influenceDirection, "mutual");
    assertEquals(intersections[1].influenceDirection, "forward");
    assertEquals(intersections[2].influenceDirection, "backward");
  });

  // ========================================
  // Subplotメイン型テスト
  // ========================================

  await t.step(
    "Subplot型が全ての必須フィールド(id, name, type, status, summary, beats)を持つこと",
    () => {
      const subplot: Subplot = {
        id: "prince_story",
        name: "王子の花嫁探し",
        type: "subplot",
        status: "active",
        summary: "王子が運命の人を探す物語",
        beats: [],
      };
      assertExists(subplot.id);
      assertExists(subplot.name);
      assertExists(subplot.type);
      assertExists(subplot.status);
      assertExists(subplot.summary);
      assertExists(subplot.beats);
    },
  );

  await t.step("Subplot型のtypeが全てのPlotType値を取れること", () => {
    const main: Subplot = {
      id: "main_story",
      name: "メインストーリー",
      type: "main",
      status: "active",
      summary: "メインの物語",
      beats: [],
    };
    assertEquals(main.type, "main");

    const subplot: Subplot = {
      id: "side_story",
      name: "サブストーリー",
      type: "subplot",
      status: "active",
      summary: "サブプロット",
      beats: [],
    };
    assertEquals(subplot.type, "subplot");

    const parallel: Subplot = {
      id: "parallel_story",
      name: "並行ストーリー",
      type: "parallel",
      status: "active",
      summary: "並行プロット",
      beats: [],
    };
    assertEquals(parallel.type, "parallel");

    const background: Subplot = {
      id: "bg_story",
      name: "背景ストーリー",
      type: "background",
      status: "active",
      summary: "背景プロット",
      beats: [],
    };
    assertEquals(background.type, "background");
  });

  // ========================================
  // Subplotオプショナルフィールドテスト
  // ========================================

  await t.step("Subplot型のfocusCharactersがオプショナルであること", () => {
    const withFocus: Subplot = {
      id: "prince_story",
      name: "王子の花嫁探し",
      type: "subplot",
      status: "active",
      summary: "王子が運命の人を探す物語",
      beats: [],
      focusCharacters: {
        prince: "primary",
        king: "secondary",
      },
    };
    assertExists(withFocus.focusCharacters);
    assertEquals(Object.keys(withFocus.focusCharacters!).length, 2);
    assertEquals(withFocus.focusCharacters!.prince, "primary");
    assertEquals(withFocus.focusCharacters!.king, "secondary");
  });

  await t.step("Subplot型のintersectionsがオプショナルであること", () => {
    const withIntersections: Subplot = {
      id: "main_story",
      name: "メインストーリー",
      type: "main",
      status: "active",
      summary: "メインの物語",
      beats: [],
      intersections: [
        {
          id: "intersection_003",
          sourceSubplotId: "main_story",
          sourceBeatId: "ball_dance",
          targetSubplotId: "prince_story",
          targetBeatId: "meets_mysterious_lady",
          summary: "運命的な出会い",
          influenceDirection: "mutual",
        },
      ],
    };
    assertExists(withIntersections.intersections);
    assertEquals(withIntersections.intersections!.length, 1);
  });

  await t.step("Subplot型のimportanceがオプショナルであること", () => {
    const withImportance: Subplot = {
      id: "main_story",
      name: "メインストーリー",
      type: "main",
      status: "active",
      summary: "メインの物語",
      beats: [],
      importance: "major",
    };
    assertExists(withImportance.importance);
    assertEquals(withImportance.importance, "major");
  });

  await t.step("Subplot型のparentSubplotIdがオプショナルであること", () => {
    const withParent: Subplot = {
      id: "side_quest",
      name: "サブクエスト",
      type: "subplot",
      status: "active",
      summary: "サブのクエスト",
      beats: [],
      parentSubplotId: "main_story",
    };
    assertExists(withParent.parentSubplotId);
    assertEquals(withParent.parentSubplotId, "main_story");
  });

  await t.step("Subplot型のdisplayNamesがオプショナルであること", () => {
    const withDisplayNames: Subplot = {
      id: "prince_story",
      name: "王子の花嫁探し",
      type: "subplot",
      status: "active",
      summary: "王子が運命の人を探す物語",
      beats: [],
      displayNames: ["王子の物語", "花嫁探し"],
    };
    assertExists(withDisplayNames.displayNames);
    assertEquals(withDisplayNames.displayNames!.length, 2);
  });

  await t.step("Subplot型のdetailsがオプショナルであること", () => {
    const withDetails: Subplot = {
      id: "prince_story",
      name: "王子の花嫁探し",
      type: "subplot",
      status: "active",
      summary: "王子が運命の人を探す物語",
      beats: [],
      details: {
        description: "王子が舞踏会で運命の人を見つけるまでの物語",
        theme: "王位継承と個人の幸福の両立",
      },
    };
    assertExists(withDetails.details);
  });

  await t.step("Subplot型のrelationsがオプショナルであること", () => {
    const withRelations: Subplot = {
      id: "prince_story",
      name: "王子の花嫁探し",
      type: "subplot",
      status: "active",
      summary: "王子が運命の人を探す物語",
      beats: [],
      relations: {
        characters: ["prince", "king"],
        settings: ["castle"],
      },
    };
    assertExists(withRelations.relations);
    assertEquals(withRelations.relations!.characters.length, 2);
  });

  // ========================================
  // Subplot全フィールド統合テスト
  // ========================================

  await t.step(
    "Subplot型が全フィールドを持つ完全なオブジェクトを作成できること",
    () => {
      const fullSubplot: Subplot = {
        id: "stepmother_plot",
        name: "継母の野望",
        type: "subplot",
        status: "active",
        summary: "娘を王妃にしようとする継母の計画",
        beats: [
          {
            id: "stepmother_plan",
            title: "野望の始まり",
            summary: "継母が娘を王妃にする計画を立てる",
            structurePosition: "setup",
            chapter: "chapter_01",
            characters: ["stepmother"],
            settings: ["mansion"],
          },
        ],
        focusCharacters: {
          stepmother: "primary",
          stepsister_elder: "secondary",
          stepsister_younger: "secondary",
        },
        intersections: [
          {
            id: "intersection_stepmother_main",
            sourceSubplotId: "stepmother_plot",
            sourceBeatId: "stepmother_plan",
            targetSubplotId: "main_story",
            targetBeatId: "cinderella_sadness",
            summary: "継母の計画がシンデレラを苦しめる",
            influenceDirection: "forward",
            influenceLevel: "medium",
          },
        ],
        importance: "minor",
        parentSubplotId: "main_story",
        displayNames: ["継母の計画", "義母の野望"],
        details: {
          theme: "社会的地位の向上と娘たちの幸福",
          notes: { file: "subplots/stepmother_resolution.md" },
        },
        relations: {
          characters: ["stepmother", "stepsister_elder", "stepsister_younger"],
          settings: ["mansion"],
          foreshadowings: ["glass_slipper"],
        },
      };

      assertEquals(fullSubplot.id, "stepmother_plot");
      assertEquals(fullSubplot.name, "継母の野望");
      assertEquals(fullSubplot.type, "subplot");
      assertEquals(fullSubplot.status, "active");
      assertEquals(fullSubplot.beats.length, 1);
      assertEquals(Object.keys(fullSubplot.focusCharacters!).length, 3);
      assertEquals(fullSubplot.intersections!.length, 1);
      assertEquals(fullSubplot.importance, "minor");
      assertEquals(fullSubplot.parentSubplotId, "main_story");
      assertEquals(fullSubplot.displayNames!.length, 2);
      assertExists(fullSubplot.details);
      assertExists(fullSubplot.relations);
      assertEquals(fullSubplot.relations!.characters.length, 3);
      assertEquals(fullSubplot.relations!.settings.length, 1);
      assertEquals(fullSubplot.relations!.foreshadowings!.length, 1);
    },
  );

  // ========================================
  // SubplotDetailsテスト（ハイブリッドパターン）
  // ========================================

  await t.step("SubplotDetails型がstring値をサポートすること", () => {
    const details: SubplotDetails = {
      description: "インラインの説明文",
      theme: "インラインのテーマ",
      notes: "インラインのメモ",
    };
    assertEquals(details.description, "インラインの説明文");
    assertEquals(details.theme, "インラインのテーマ");
    assertEquals(details.notes, "インラインのメモ");
  });

  await t.step("SubplotDetails型がファイル参照をサポートすること", () => {
    const details: SubplotDetails = {
      description: { file: "subplots/main_story_description.md" },
      theme: { file: "subplots/main_story_theme.md" },
      notes: { file: "subplots/main_story_notes.md" },
    };
    assertExists(details.description);
    assertExists(details.theme);
    assertExists(details.notes);
  });

  await t.step(
    "SubplotDetails型がハイブリッド（stringとファイル参照の混在）をサポートすること",
    () => {
      const details: SubplotDetails = {
        description: "インラインの説明",
        notes: { file: "subplots/notes.md" },
      };
      assertExists(details.description);
      assertExists(details.notes);
    },
  );

  // ========================================
  // SubplotRelationsテスト
  // ========================================

  await t.step(
    "SubplotRelations型が必須フィールド(characters, settings)を持つこと",
    () => {
      const relations: SubplotRelations = {
        characters: ["hero", "villain"],
        settings: ["castle", "forest"],
      };
      assertExists(relations.characters);
      assertExists(relations.settings);
      assertEquals(relations.characters.length, 2);
      assertEquals(relations.settings.length, 2);
    },
  );

  await t.step(
    "SubplotRelations型のforeshadowingsがオプショナルであること",
    () => {
      const withoutForeshadowings: SubplotRelations = {
        characters: ["hero"],
        settings: ["village"],
      };
      assertEquals(withoutForeshadowings.foreshadowings, undefined);

      const withForeshadowings: SubplotRelations = {
        characters: ["hero"],
        settings: ["village"],
        foreshadowings: ["ancient_sword", "prophecy"],
      };
      assertExists(withForeshadowings.foreshadowings);
      assertEquals(withForeshadowings.foreshadowings.length, 2);
    },
  );

  await t.step(
    "SubplotRelations型のrelatedSubplotsがオプショナルであること",
    () => {
      const withoutRelated: SubplotRelations = {
        characters: ["hero"],
        settings: ["village"],
      };
      assertEquals(withoutRelated.relatedSubplots, undefined);

      const withRelated: SubplotRelations = {
        characters: ["hero"],
        settings: ["village"],
        relatedSubplots: ["prince_story", "fairy_plot"],
      };
      assertExists(withRelated.relatedSubplots);
      assertEquals(withRelated.relatedSubplots.length, 2);
    },
  );

  // ========================================
  // PlotBeat因果関係テスト
  // ========================================

  await t.step(
    "PlotBeat型がpreconditionBeatIdsで因果関係を表現できること",
    () => {
      const beat1: PlotBeat = {
        id: "ball_announcement",
        title: "舞踏会の告知",
        summary: "王子の舞踏会が発表される",
        structurePosition: "setup",
      };

      const beat2: PlotBeat = {
        id: "meets_mysterious_lady",
        title: "謎の女性との出会い",
        summary: "王子が舞踏会で謎の女性と出会う",
        structurePosition: "rising",
        preconditionBeatIds: [beat1.id],
      };

      assertEquals(beat2.preconditionBeatIds, [beat1.id]);
    },
  );

  await t.step("PlotBeat型が複数の前提ビートを持てること", () => {
    const beat: PlotBeat = {
      id: "climax_battle",
      title: "クライマックスの戦い",
      summary: "最終決戦",
      structurePosition: "climax",
      preconditionBeatIds: [
        "training_complete",
        "weapon_acquired",
        "allies_gathered",
      ],
    };
    assertEquals(beat.preconditionBeatIds!.length, 3);
  });

  // ========================================
  // 状態遷移テスト
  // ========================================

  await t.step("Subplotのstatusがactiveからcompletedに遷移できること", () => {
    const activeSubplot: Subplot = {
      id: "prince_story",
      name: "王子の花嫁探し",
      type: "subplot",
      status: "active",
      summary: "王子が運命の人を探す物語",
      beats: [],
    };
    assertEquals(activeSubplot.status, "active");

    const completedSubplot: Subplot = {
      ...activeSubplot,
      status: "completed",
    };
    assertEquals(completedSubplot.status, "completed");
  });
});
