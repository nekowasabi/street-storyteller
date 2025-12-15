/**
 * timeline_view MCPツールテスト（TDD Red Phase）
 */

import { assertEquals, assertExists } from "@std/assert";
import { timelineViewTool } from "../../../../src/mcp/tools/definitions/timeline_view.ts";

Deno.test("timeline_view MCPツール", async (t) => {
  await t.step("ツール名がtimeline_viewであること", () => {
    assertEquals(timelineViewTool.name, "timeline_view");
  });

  await t.step("descriptionが設定されていること", () => {
    assertExists(timelineViewTool.description);
  });

  await t.step("inputSchemaがtimelineIdをオプションとしていること", () => {
    const properties = timelineViewTool.inputSchema.properties;
    assertExists(properties);
    assertEquals("timelineId" in properties, true);
  });

  await t.step("タイムラインがない場合に空のリストを返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const result = await timelineViewTool.execute(
        {},
        { projectRoot: tempDir }
      );

      assertEquals(result.isError, false);
      // テキストコンテンツに「タイムラインなし」などのメッセージを含むはず
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("timelineIdなしの場合に全タイムライン一覧を返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      // タイムラインを作成
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      const timeline1 = `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const main_story: Timeline = {
  "id": "main_story",
  "name": "メインストーリー",
  "scope": "story",
  "summary": "物語の主要なタイムライン",
  "events": []
};
`;
      const timeline2 = `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const sub_story: Timeline = {
  "id": "sub_story",
  "name": "サブストーリー",
  "scope": "arc",
  "summary": "サイドクエストのタイムライン",
  "events": []
};
`;
      await Deno.writeTextFile(`${timelinesDir}/main_story.ts`, timeline1);
      await Deno.writeTextFile(`${timelinesDir}/sub_story.ts`, timeline2);

      const result = await timelineViewTool.execute(
        {},
        { projectRoot: tempDir }
      );

      assertEquals(result.isError, false);

      // 結果に両方のタイムラインが含まれていること
      const text = (result.content[0] as { text: string }).text;
      assertEquals(text.includes("main_story") || text.includes("メインストーリー"), true);
      assertEquals(text.includes("sub_story") || text.includes("サブストーリー"), true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("特定のtimelineIdを指定した場合にそのタイムライン詳細を返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      // タイムラインを作成
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      const timeline = `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

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
      "characters": ["hero"],
      "settings": ["forest"],
      "chapters": ["chapter_02"]
    }
  ]
};
`;
      await Deno.writeTextFile(`${timelinesDir}/main_story.ts`, timeline);

      const result = await timelineViewTool.execute(
        { timelineId: "main_story" },
        { projectRoot: tempDir }
      );

      assertEquals(result.isError, false);

      // 詳細にイベント情報が含まれていること
      const text = (result.content[0] as { text: string }).text;
      assertEquals(text.includes("物語の始まり"), true);
      assertEquals(text.includes("旅立ち"), true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("存在しないtimelineIdを指定した場合にエラーを返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const result = await timelineViewTool.execute(
        { timelineId: "nonexistent" },
        { projectRoot: tempDir }
      );

      assertEquals(result.isError, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
