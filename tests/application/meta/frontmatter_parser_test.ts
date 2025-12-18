/**
 * FrontmatterParser テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  FrontmatterParser,
} from "../../../src/application/meta/frontmatter_parser.ts";

Deno.test("FrontmatterParser", async (t) => {
  const parser = new FrontmatterParser();

  await t.step("正常なFrontmatterを解析できる", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter01
  title: "旅の始まり"
  order: 1
  characters:
    - hero
    - heroine
  settings:
    - kingdom
  summary: "勇者アレクスが故郷を離れ、運命の旅に出発する"
---

# 第1章：旅の始まり
本文がここに続く...
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.chapter_id, "chapter01");
      assertEquals(result.value.title, "旅の始まり");
      assertEquals(result.value.order, 1);
      assertEquals(result.value.characters, ["hero", "heroine"]);
      assertEquals(result.value.settings, ["kingdom"]);
      assertEquals(
        result.value.summary,
        "勇者アレクスが故郷を離れ、運命の旅に出発する",
      );
    }
  });

  await t.step("chapter_id, title, orderを正しく抽出できる", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter02
  title: "魔法の森"
  order: 2
---

# 第2章
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.chapter_id, "chapter02");
      assertEquals(result.value.title, "魔法の森");
      assertEquals(result.value.order, 2);
    }
  });

  await t.step("characters, settingsがオプショナルで空配列になる", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter03
  title: "間章"
  order: 3
---

# 間章
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.characters, undefined);
      assertEquals(result.value.settings, undefined);
    }
  });

  await t.step("不正なYAML形式でエラーを返す", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter01
  title: "test
  order: 1
---

# 本文
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "yaml_parse_error");
    }
  });

  await t.step("Frontmatterが存在しない場合エラーを返す", () => {
    const markdown = `# タイトル

本文のみのMarkdownファイル
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "no_frontmatter");
    }
  });

  await t.step("storytellerキーがない場合エラーを返す", () => {
    const markdown = `---
title: "普通のFrontmatter"
date: 2024-01-01
---

# 本文
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "missing_storyteller_key");
    }
  });

  await t.step("必須フィールド(chapter_id)がない場合エラーを返す", () => {
    const markdown = `---
storyteller:
  title: "タイトルのみ"
  order: 1
---

# 本文
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "missing_required_field");
      if (result.error.type === "missing_required_field") {
        assertEquals(result.error.field, "chapter_id");
      }
    }
  });

  await t.step("必須フィールド(title)がない場合エラーを返す", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter01
  order: 1
---

# 本文
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "missing_required_field");
      if (result.error.type === "missing_required_field") {
        assertEquals(result.error.field, "title");
      }
    }
  });

  await t.step("必須フィールド(order)がない場合エラーを返す", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter01
  title: "タイトル"
---

# 本文
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "missing_required_field");
      if (result.error.type === "missing_required_field") {
        assertEquals(result.error.field, "order");
      }
    }
  });

  // ========================================
  // process1: foreshadowings フィールドのテスト
  // ========================================

  await t.step("foreshadowingsフィールドをパースできる", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter01
  title: "灰かぶり姫の日常"
  order: 1
  characters:
    - cinderella
  settings:
    - mansion
  foreshadowings:
    - glass_slipper
    - midnight_deadline
---

# 第1章
本文がここに続く...
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.chapter_id, "chapter01");
      assertEquals(result.value.title, "灰かぶり姫の日常");
      assertEquals(result.value.foreshadowings, [
        "glass_slipper",
        "midnight_deadline",
      ]);
    }
  });

  await t.step("foreshadowingsが空配列の場合は空配列を返す", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter02
  title: "舞踏会"
  order: 2
  foreshadowings: []
---

# 第2章
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.foreshadowings, []);
    }
  });

  await t.step("foreshadowingsがない場合はundefinedを返す", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter03
  title: "間章"
  order: 3
---

# 間章
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.foreshadowings, undefined);
    }
  });

  // ========================================
  // process1: 新規フィールドのテスト
  // timeline_events, phases, timelines
  // ========================================

  await t.step("timeline_eventsフィールドをパースできる", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter01
  title: "物語の始まり"
  order: 1
  timeline_events:
    - event_001
    - event_002
---

# 第1章
本文がここに続く...
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.timeline_events, ["event_001", "event_002"]);
    }
  });

  await t.step("phasesフィールドをパースできる", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter02
  title: "成長の章"
  order: 2
  phases:
    - hero_phase_01
    - heroine_phase_02
---

# 第2章
本文がここに続く...
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.phases, ["hero_phase_01", "heroine_phase_02"]);
    }
  });

  await t.step("timelinesフィールドをパースできる", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter03
  title: "時間軸の章"
  order: 3
  timelines:
    - main_story
    - hero_journey
---

# 第3章
本文がここに続く...
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.timelines, ["main_story", "hero_journey"]);
    }
  });

  await t.step(
    "新規3フィールドがすべて含まれるFrontmatterをパースできる",
    () => {
      const markdown = `---
storyteller:
  chapter_id: chapter04
  title: "総合テスト"
  order: 4
  characters:
    - hero
  settings:
    - kingdom
  foreshadowings:
    - prophecy
  timeline_events:
    - event_opening
  phases:
    - hero_awakening
  timelines:
    - main_timeline
---

# 第4章
本文がここに続く...
`;

      const result = parser.parse(markdown);

      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.chapter_id, "chapter04");
        assertEquals(result.value.characters, ["hero"]);
        assertEquals(result.value.settings, ["kingdom"]);
        assertEquals(result.value.foreshadowings, ["prophecy"]);
        assertEquals(result.value.timeline_events, ["event_opening"]);
        assertEquals(result.value.phases, ["hero_awakening"]);
        assertEquals(result.value.timelines, ["main_timeline"]);
      }
    },
  );

  await t.step("新規フィールドがない場合はundefinedを返す", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter05
  title: "最小構成"
  order: 5
---

# 第5章
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.timeline_events, undefined);
      assertEquals(result.value.phases, undefined);
      assertEquals(result.value.timelines, undefined);
    }
  });

  await t.step("新規フィールドが空配列の場合は空配列を返す", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter06
  title: "空配列テスト"
  order: 6
  timeline_events: []
  phases: []
  timelines: []
---

# 第6章
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.timeline_events, []);
      assertEquals(result.value.phases, []);
      assertEquals(result.value.timelines, []);
    }
  });
});
