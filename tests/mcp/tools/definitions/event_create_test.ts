/**
 * event_create MCPツールテスト（TDD Red Phase）
 */

import { assertEquals, assertExists } from "@std/assert";
import { eventCreateTool } from "../../../../src/mcp/tools/definitions/event_create.ts";

Deno.test("event_create MCPツール", async (t) => {
  await t.step("ツール名がevent_createであること", () => {
    assertEquals(eventCreateTool.name, "event_create");
  });

  await t.step("descriptionが設定されていること", () => {
    assertExists(eventCreateTool.description);
  });

  await t.step("inputSchemaがtimelineId, title, category, orderをrequiredとしていること", () => {
    const required = eventCreateTool.inputSchema.required;
    assertExists(required);
    assertEquals(required.includes("timelineId"), true);
    assertEquals(required.includes("title"), true);
    assertEquals(required.includes("category"), true);
    assertEquals(required.includes("order"), true);
  });

  await t.step("execute()が必須パラメータ欠落時にエラーを返すこと", async () => {
    // timelineIdがない
    const result = await eventCreateTool.execute(
      { title: "テスト", category: "plot_point", order: 1 },
      { projectRoot: "/tmp" }
    );
    assertEquals(result.isError, true);
  });

  await t.step("無効なcategoryでエラーを返すこと", async () => {
    const result = await eventCreateTool.execute(
      {
        timelineId: "test_timeline",
        title: "テスト",
        category: "invalid_category",
        order: 1
      },
      { projectRoot: "/tmp" }
    );
    assertEquals(result.isError, true);
  });

  await t.step("タイムラインファイルが存在しない場合にエラーを返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const result = await eventCreateTool.execute(
        {
          timelineId: "nonexistent_timeline",
          title: "テストイベント",
          category: "plot_point",
          order: 1,
          summary: "テスト用イベント",
        },
        { projectRoot: tempDir }
      );

      // タイムラインファイルが存在しないのでエラー
      assertEquals(result.isError, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("存在するタイムラインにイベントを追加できること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      // まずタイムラインファイルを作成
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      // JSON形式で解析可能な形式にする
      const timelineContent = `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

/**
 * テストタイムライン
 * テスト用タイムライン
 */
export const test_timeline: Timeline = {
  "id": "test_timeline",
  "name": "テストタイムライン",
  "scope": "story",
  "summary": "テスト用タイムライン",
  "events": []
};
`;
      await Deno.writeTextFile(`${timelinesDir}/test_timeline.ts`, timelineContent);

      const result = await eventCreateTool.execute(
        {
          timelineId: "test_timeline",
          title: "新しいイベント",
          category: "plot_point",
          order: 1,
          summary: "イベントの概要",
          characters: ["hero"],
          settings: ["village"],
        },
        { projectRoot: tempDir }
      );

      // デバッグ用
      if (result.isError && result.content[0]?.type === "text") {
        console.log("Error:", (result.content[0] as { text: string }).text);
      }

      assertEquals(result.isError, false);

      // ファイルが更新されたことを確認
      const updatedContent = await Deno.readTextFile(`${timelinesDir}/test_timeline.ts`);
      assertEquals(updatedContent.includes("新しいイベント"), true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
