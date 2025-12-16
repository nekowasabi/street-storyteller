/**
 * HtmlGenerator タイムライン機能テスト（TDD Red Phase）
 *
 * タイムラインセクションのHTML生成を検証
 */

import { assertEquals } from "@std/assert";
import { HtmlGenerator } from "../../../src/application/view/html_generator.ts";
import type { ProjectAnalysis } from "../../../src/application/view/project_analyzer.ts";

Deno.test("HtmlGenerator Timeline機能", async (t) => {
  const generator = new HtmlGenerator();

  await t.step("Timelinesセクションが生成されること", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [
        {
          id: "main_story",
          name: "メインストーリー",
          scope: "story",
          summary: "物語の主要なタイムライン",
          events: [],
          filePath: "src/timelines/main_story.ts",
        },
      ],
      foreshadowings: [],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    assertEquals(html.includes("Timelines"), true);
    assertEquals(html.includes("メインストーリー"), true);
    assertEquals(html.includes("main_story"), true);
  });

  await t.step("タイムラインカードが表示されること", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [
        {
          id: "test_timeline",
          name: "テストタイムライン",
          scope: "arc",
          summary: "テスト用タイムライン",
          events: [],
          filePath: "src/timelines/test.ts",
        },
      ],
      foreshadowings: [],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    assertEquals(html.includes("timeline-card"), true);
    assertEquals(html.includes("テストタイムライン"), true);
    assertEquals(html.includes("arc"), true);
  });

  await t.step("イベントが時系列順に表示されること", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [
        {
          id: "main_story",
          name: "メインストーリー",
          scope: "story",
          summary: "概要",
          events: [
            {
              id: "event_1",
              title: "物語の始まり",
              category: "plot_point",
              order: 1,
              summary: "すべての始まり",
              characters: ["hero"],
              settings: ["village"],
              chapters: ["chapter_01"],
            },
            {
              id: "event_2",
              title: "旅立ち",
              category: "character_event",
              order: 2,
              summary: "勇者が旅立つ",
              characters: ["hero"],
              settings: ["forest"],
              chapters: ["chapter_01"],
            },
          ],
          filePath: "src/timelines/main_story.ts",
        },
      ],
      foreshadowings: [],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // イベントが含まれること
    assertEquals(html.includes("物語の始まり"), true);
    assertEquals(html.includes("旅立ち"), true);

    // event_1 が event_2 より前に出現すること
    const event1Pos = html.indexOf("物語の始まり");
    const event2Pos = html.indexOf("旅立ち");
    assertEquals(event1Pos < event2Pos, true);
  });

  await t.step("キャラクター・設定・チャプターへのリンクが含まれること", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [
        {
          id: "test",
          name: "テスト",
          scope: "story",
          summary: "概要",
          events: [
            {
              id: "ev1",
              title: "イベント",
              category: "plot_point",
              order: 1,
              summary: "概要",
              characters: ["hero", "mentor"],
              settings: ["castle"],
              chapters: ["ch1"],
            },
          ],
          filePath: "test.ts",
        },
      ],
      foreshadowings: [],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // キャラクター参照が含まれること
    assertEquals(html.includes("hero"), true);
    assertEquals(html.includes("mentor"), true);
    // 設定参照が含まれること
    assertEquals(html.includes("castle"), true);
    // チャプター参照が含まれること
    assertEquals(html.includes("ch1"), true);
  });

  await t.step("因果関係（causedBy/causes）が表示されること", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [
        {
          id: "test",
          name: "テスト",
          scope: "story",
          summary: "概要",
          events: [
            {
              id: "ev1",
              title: "原因イベント",
              category: "plot_point",
              order: 1,
              summary: "概要",
              characters: [],
              settings: [],
              chapters: [],
            },
            {
              id: "ev2",
              title: "結果イベント",
              category: "plot_point",
              order: 2,
              summary: "概要",
              characters: [],
              settings: [],
              chapters: [],
              causedBy: ["ev1"],
              causes: ["ev3"],
            },
          ],
          filePath: "test.ts",
        },
      ],
      foreshadowings: [],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // 因果関係の表示が含まれること
    assertEquals(
      html.includes("causedBy") || html.includes("caused-by") ||
        html.includes("ev1"),
      true,
    );
    assertEquals(html.includes("causes") || html.includes("ev3"), true);
  });

  await t.step("タイムラインがない場合のメッセージが表示されること", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    assertEquals(html.includes("No timelines found"), true);
  });

  await t.step("水平タイムライン形式のスタイルが適用されること", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [
        {
          id: "test",
          name: "テスト",
          scope: "story",
          summary: "概要",
          events: [
            {
              id: "ev1",
              title: "イベント1",
              category: "plot_point",
              order: 1,
              summary: "概要",
              characters: [],
              settings: [],
              chapters: [],
            },
          ],
          filePath: "test.ts",
        },
      ],
      foreshadowings: [],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // タイムライン用のCSSクラスが含まれること
    assertEquals(
      html.includes("timeline-events") || html.includes("event-list"),
      true,
    );
  });

  await t.step("親タイムライン情報が表示されること", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [
        {
          id: "sub_story",
          name: "サブストーリー",
          scope: "arc",
          summary: "サブストーリーのタイムライン",
          events: [],
          parentTimeline: "main_story",
          filePath: "src/timelines/sub_story.ts",
        },
      ],
      foreshadowings: [],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    assertEquals(html.includes("main_story"), true);
  });
});
