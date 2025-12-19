/**
 * Timeline型定義のテスト（TDD Red Phase）
 *
 * Timeline/TimelineEvent型が正しく定義されていることを検証
 */

import { assertEquals, assertExists } from "@std/assert";

// インポートテスト（この時点では失敗する）
import type {
  EventCategory,
  EventImportance,
  Timeline,
  TimelineDetails,
  TimelineDetectionHints,
  TimelineEvent,
  TimelineScope,
  TimePoint,
} from "@storyteller/types/v2/timeline.ts";

Deno.test("Timeline型定義", async (t) => {
  await t.step("EventCategory型が7種類のリテラル型であること", () => {
    // EventCategory型のテスト
    const categories: EventCategory[] = [
      "plot_point",
      "character_event",
      "world_event",
      "backstory",
      "foreshadow",
      "climax",
      "resolution",
    ];
    assertEquals(categories.length, 7);
  });

  await t.step("EventImportance型が3種類のリテラル型であること", () => {
    // EventImportance型のテスト
    const importances: EventImportance[] = ["major", "minor", "background"];
    assertEquals(importances.length, 3);
  });

  await t.step("TimelineScope型が4種類のリテラル型であること", () => {
    // TimelineScope型のテスト
    const scopes: TimelineScope[] = ["story", "world", "character", "arc"];
    assertEquals(scopes.length, 4);
  });

  await t.step(
    "TimePoint型がorder（必須）とオプショナルフィールドを持つこと",
    () => {
      // 必須のorderのみ
      const minimalTimePoint: TimePoint = {
        order: 1,
      };
      assertExists(minimalTimePoint.order);

      // 全フィールド指定
      const fullTimePoint: TimePoint = {
        order: 1,
        label: "物語開始",
        date: "春の初め",
        chapter: "chapter_01",
      };
      assertExists(fullTimePoint.order);
      assertEquals(fullTimePoint.label, "物語開始");
      assertEquals(fullTimePoint.date, "春の初め");
      assertEquals(fullTimePoint.chapter, "chapter_01");
    },
  );

  await t.step("TimelineEvent型が必須フィールドを持つこと", () => {
    const event: TimelineEvent = {
      id: "ball_invitation",
      title: "舞踏会への招待状",
      category: "plot_point",
      time: { order: 1 },
      summary: "シンデレラが舞踏会の招待状を受け取る",
      characters: ["cinderella", "stepmother"],
      settings: ["cinderella_house"],
      chapters: ["chapter_01"],
    };

    assertExists(event.id);
    assertExists(event.title);
    assertExists(event.category);
    assertExists(event.time);
    assertExists(event.summary);
    assertExists(event.characters);
    assertExists(event.settings);
    assertExists(event.chapters);
  });

  await t.step(
    "TimelineEvent型のcausedBy, causesがstring[]型であること",
    () => {
      const event: TimelineEvent = {
        id: "ball_dance",
        title: "舞踏会での踊り",
        category: "plot_point",
        time: { order: 2 },
        summary: "シンデレラと王子が踊る",
        characters: ["cinderella", "prince"],
        settings: ["royal_palace"],
        chapters: ["chapter_02"],
        causedBy: ["ball_invitation"],
        causes: ["midnight_escape"],
      };

      assertExists(event.causedBy);
      assertEquals(event.causedBy, ["ball_invitation"]);
      assertExists(event.causes);
      assertEquals(event.causes, ["midnight_escape"]);
    },
  );

  await t.step("TimelineEvent型のオプショナルフィールドを持てること", () => {
    const event: TimelineEvent = {
      id: "full_event",
      title: "完全なイベント",
      category: "climax",
      time: { order: 10 },
      summary: "物語のクライマックス",
      characters: ["hero"],
      settings: ["final_stage"],
      chapters: ["chapter_final"],
      causedBy: ["previous_event"],
      causes: ["resolution"],
      importance: "major",
      endTime: { order: 11, label: "クライマックス終了" },
      displayNames: ["最終決戦"],
      details: {
        description: "詳細な説明",
      },
      detectionHints: {
        commonPatterns: ["最終決戦で", "クライマックスの"],
        excludePatterns: [],
        confidence: 0.9,
      },
    };

    assertExists(event.importance);
    assertEquals(event.importance, "major");
    assertExists(event.endTime);
    assertExists(event.displayNames);
    assertExists(event.details);
    assertExists(event.detectionHints);
  });

  await t.step("Timeline型が必須フィールドを持つこと", () => {
    const timeline: Timeline = {
      id: "main_story",
      name: "メインストーリー",
      scope: "story",
      summary: "シンデレラの物語の主要タイムライン",
      events: [],
    };

    assertExists(timeline.id);
    assertExists(timeline.name);
    assertExists(timeline.scope);
    assertExists(timeline.summary);
    assertExists(timeline.events);
  });

  await t.step("Timeline型のオプショナルフィールドを持てること", () => {
    const timeline: Timeline = {
      id: "hero_journey",
      name: "勇者の旅",
      scope: "character",
      summary: "勇者キャラクターの個人タイムライン",
      events: [],
      parentTimeline: "main_story",
      childTimelines: ["side_quest_1", "side_quest_2"],
      relatedCharacter: "hero",
      displayNames: ["勇者の冒険"],
      displayOptions: {
        showRelations: true,
        colorScheme: "character",
      },
      details: {
        background: "勇者の旅の背景説明",
      },
    };

    assertExists(timeline.parentTimeline);
    assertEquals(timeline.parentTimeline, "main_story");
    assertExists(timeline.childTimelines);
    assertEquals(timeline.childTimelines?.length, 2);
    assertExists(timeline.relatedCharacter);
    assertExists(timeline.displayNames);
    assertExists(timeline.displayOptions);
    assertExists(timeline.details);
  });

  await t.step("TimelineDetails型がファイル参照をサポートすること", () => {
    const details: TimelineDetails = {
      background: { file: "timelines/main_story/background.md" },
      notes: "インラインのメモ",
    };

    assertExists(details.background);
    assertExists(details.notes);
  });

  await t.step("TimelineDetectionHints型が検出ヒントを持つこと", () => {
    const hints: TimelineDetectionHints = {
      commonPatterns: ["メインストーリーで", "物語の"],
      excludePatterns: ["サイドストーリー"],
      confidence: 0.85,
    };

    assertEquals(hints.commonPatterns.length, 2);
    assertEquals(hints.excludePatterns.length, 1);
    assertEquals(hints.confidence, 0.85);
  });
});
