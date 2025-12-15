/**
 * event_update MCPツールテスト（TDD Red Phase）
 */

import { assertEquals, assertExists } from "@std/assert";
import { eventUpdateTool } from "../../../../src/mcp/tools/definitions/event_update.ts";

Deno.test("event_update MCPツール", async (t) => {
  await t.step("ツール名がevent_updateであること", () => {
    assertEquals(eventUpdateTool.name, "event_update");
  });

  await t.step("descriptionが設定されていること", () => {
    assertExists(eventUpdateTool.description);
  });

  await t.step(
    "inputSchemaがtimelineId, eventIdをrequiredとしていること",
    () => {
      const required = eventUpdateTool.inputSchema.required;
      assertExists(required);
      assertEquals(required.includes("timelineId"), true);
      assertEquals(required.includes("eventId"), true);
    },
  );

  await t.step(
    "execute()が必須パラメータ欠落時にエラーを返すこと",
    async () => {
      // timelineIdがない
      const result = await eventUpdateTool.execute(
        { eventId: "event_1" },
        { projectRoot: "/tmp" },
      );
      assertEquals(result.isError, true);
    },
  );

  await t.step(
    "タイムラインファイルが存在しない場合にエラーを返すこと",
    async () => {
      const tempDir = await Deno.makeTempDir();

      try {
        const result = await eventUpdateTool.execute(
          {
            timelineId: "nonexistent_timeline",
            eventId: "event_1",
            title: "更新後タイトル",
          },
          { projectRoot: tempDir },
        );

        assertEquals(result.isError, true);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "存在しないイベントを更新しようとするとエラーを返すこと",
    async () => {
      const tempDir = await Deno.makeTempDir();

      try {
        // タイムラインファイルを作成
        const timelinesDir = `${tempDir}/src/timelines`;
        await Deno.mkdir(timelinesDir, { recursive: true });

        const timelineContent =
          `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const test_timeline: Timeline = {
  "id": "test_timeline",
  "name": "テストタイムライン",
  "scope": "story",
  "summary": "テスト用タイムライン",
  "events": []
};
`;
        await Deno.writeTextFile(
          `${timelinesDir}/test_timeline.ts`,
          timelineContent,
        );

        const result = await eventUpdateTool.execute(
          {
            timelineId: "test_timeline",
            eventId: "nonexistent_event",
            title: "更新後タイトル",
          },
          { projectRoot: tempDir },
        );

        assertEquals(result.isError, true);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step("既存のイベントを更新できること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      // タイムラインファイルを作成（イベント付き）
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      const timelineContent =
        `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const test_timeline: Timeline = {
  "id": "test_timeline",
  "name": "テストタイムライン",
  "scope": "story",
  "summary": "テスト用タイムライン",
  "events": [
    {
      "id": "event_1",
      "title": "元のタイトル",
      "category": "plot_point",
      "time": { "order": 1 },
      "summary": "元の概要",
      "characters": [],
      "settings": [],
      "chapters": []
    }
  ]
};
`;
      await Deno.writeTextFile(
        `${timelinesDir}/test_timeline.ts`,
        timelineContent,
      );

      const result = await eventUpdateTool.execute(
        {
          timelineId: "test_timeline",
          eventId: "event_1",
          title: "更新後タイトル",
          summary: "更新後の概要",
        },
        { projectRoot: tempDir },
      );

      if (result.isError && result.content[0]?.type === "text") {
        console.log("Error:", (result.content[0] as { text: string }).text);
      }

      assertEquals(result.isError, false);

      // ファイルが更新されたことを確認
      const updatedContent = await Deno.readTextFile(
        `${timelinesDir}/test_timeline.ts`,
      );
      assertEquals(updatedContent.includes("更新後タイトル"), true);
      assertEquals(updatedContent.includes("更新後の概要"), true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
