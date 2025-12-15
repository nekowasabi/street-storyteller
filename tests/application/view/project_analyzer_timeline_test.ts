/**
 * ProjectAnalyzer タイムライン機能テスト（TDD Red Phase）
 *
 * タイムライン読み込み機能の追加を検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { ProjectAnalyzer } from "../../../src/application/view/project_analyzer.ts";
import type {
  EventSummary,
  TimelineSummary,
} from "../../../src/application/view/project_analyzer.ts";

Deno.test("ProjectAnalyzer Timeline機能", async (t) => {
  await t.step("loadTimelines()でタイムラインを読み込めること", async () => {
    const analyzer = new ProjectAnalyzer();
    const tempDir = await Deno.makeTempDir();

    try {
      // タイムラインファイルを作成
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      const timelineContent =
        `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const main_story: Timeline = {
  "id": "main_story",
  "name": "メインストーリー",
  "scope": "story",
  "summary": "物語の主要なタイムライン",
  "events": [
    {
      "id": "event_1",
      "title": "物語の始まり",
      "category": "plot_point",
      "time": { "order": 1 },
      "summary": "すべての始まり",
      "characters": ["hero"],
      "settings": ["village"],
      "chapters": ["chapter_01"]
    },
    {
      "id": "event_2",
      "title": "旅立ち",
      "category": "character_event",
      "time": { "order": 2 },
      "summary": "勇者が旅立つ",
      "characters": ["hero", "mentor"],
      "settings": ["village", "forest"],
      "chapters": ["chapter_01"],
      "causedBy": ["event_1"]
    }
  ]
};
`;
      await Deno.writeTextFile(
        `${timelinesDir}/main_story.ts`,
        timelineContent,
      );

      // プロジェクトを解析
      const result = await analyzer.analyzeProject(tempDir);

      assertEquals(result.ok, true);
      if (result.ok) {
        assertExists(result.value.timelines);
        assertEquals(result.value.timelines.length, 1);

        const timeline = result.value.timelines[0];
        assertEquals(timeline.id, "main_story");
        assertEquals(timeline.name, "メインストーリー");
        assertEquals(timeline.scope, "story");
        assertEquals(timeline.summary, "物語の主要なタイムライン");
        assertEquals(timeline.events.length, 2);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("TimelineSummary型にイベント情報が含まれること", async () => {
    const analyzer = new ProjectAnalyzer();
    const tempDir = await Deno.makeTempDir();

    try {
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      const timelineContent =
        `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const test_timeline: Timeline = {
  "id": "test_timeline",
  "name": "テストタイムライン",
  "scope": "arc",
  "summary": "テスト用",
  "events": [
    {
      "id": "test_event",
      "title": "テストイベント",
      "category": "climax",
      "time": { "order": 1, "label": "クライマックス" },
      "summary": "テスト概要",
      "characters": ["char1", "char2"],
      "settings": ["setting1"],
      "chapters": ["ch1"],
      "causedBy": ["prev_event"],
      "causes": ["next_event"]
    }
  ]
};
`;
      await Deno.writeTextFile(
        `${timelinesDir}/test_timeline.ts`,
        timelineContent,
      );

      const result = await analyzer.analyzeProject(tempDir);

      assertEquals(result.ok, true);
      if (result.ok) {
        const event = result.value.timelines[0].events[0];
        assertEquals(event.id, "test_event");
        assertEquals(event.title, "テストイベント");
        assertEquals(event.category, "climax");
        assertEquals(event.order, 1);
        assertEquals(event.label, "クライマックス");
        assertEquals(event.summary, "テスト概要");
        assertEquals(event.characters, ["char1", "char2"]);
        assertEquals(event.settings, ["setting1"]);
        assertEquals(event.chapters, ["ch1"]);
        assertEquals(event.causedBy, ["prev_event"]);
        assertEquals(event.causes, ["next_event"]);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("複数のタイムラインを読み込めること", async () => {
    const analyzer = new ProjectAnalyzer();
    const tempDir = await Deno.makeTempDir();

    try {
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      const timeline1 = `export const tl1 = {
  "id": "tl1",
  "name": "タイムライン1",
  "scope": "story",
  "summary": "概要1",
  "events": []
};
`;
      const timeline2 = `export const tl2 = {
  "id": "tl2",
  "name": "タイムライン2",
  "scope": "world",
  "summary": "概要2",
  "events": []
};
`;
      await Deno.writeTextFile(`${timelinesDir}/tl1.ts`, timeline1);
      await Deno.writeTextFile(`${timelinesDir}/tl2.ts`, timeline2);

      const result = await analyzer.analyzeProject(tempDir);

      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.timelines.length, 2);
        const ids = result.value.timelines.map((t) => t.id);
        assertEquals(ids.includes("tl1"), true);
        assertEquals(ids.includes("tl2"), true);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step(
    "タイムラインディレクトリが存在しない場合は空配列を返すこと",
    async () => {
      const analyzer = new ProjectAnalyzer();
      const tempDir = await Deno.makeTempDir();

      try {
        // timelinesディレクトリを作成しない

        const result = await analyzer.analyzeProject(tempDir);

        assertEquals(result.ok, true);
        if (result.ok) {
          assertExists(result.value.timelines);
          assertEquals(result.value.timelines.length, 0);
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step("親子タイムライン関係が読み込めること", async () => {
    const analyzer = new ProjectAnalyzer();
    const tempDir = await Deno.makeTempDir();

    try {
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      const timelineContent = `export const hero_journey = {
  "id": "hero_journey",
  "name": "勇者の旅",
  "scope": "character",
  "summary": "勇者のタイムライン",
  "events": [],
  "parentTimeline": "main_story",
  "relatedCharacter": "hero"
};
`;
      await Deno.writeTextFile(
        `${timelinesDir}/hero_journey.ts`,
        timelineContent,
      );

      const result = await analyzer.analyzeProject(tempDir);

      assertEquals(result.ok, true);
      if (result.ok) {
        const timeline = result.value.timelines[0];
        assertEquals(timeline.parentTimeline, "main_story");
        assertEquals(timeline.relatedCharacter, "hero");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
