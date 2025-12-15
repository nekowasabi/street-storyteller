/**
 * timeline_analyze MCPツールテスト（TDD Red Phase）
 */

import { assertEquals, assertExists } from "@std/assert";
import { timelineAnalyzeTool } from "../../../../src/mcp/tools/definitions/timeline_analyze.ts";

Deno.test("timeline_analyze MCPツール", async (t) => {
  await t.step("ツール名がtimeline_analyzeであること", () => {
    assertEquals(timelineAnalyzeTool.name, "timeline_analyze");
  });

  await t.step("descriptionが設定されていること", () => {
    assertExists(timelineAnalyzeTool.description);
  });

  await t.step("inputSchemaがtimelineIdを持つこと", () => {
    const properties = timelineAnalyzeTool.inputSchema.properties;
    assertExists(properties);
    assertEquals("timelineId" in properties, true);
  });

  await t.step("タイムラインがない場合に分析結果なしを返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const result = await timelineAnalyzeTool.execute(
        {},
        { projectRoot: tempDir }
      );

      assertEquals(result.isError, false);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("因果関係の整合性をチェックすること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      // 不整合な因果関係を持つタイムライン
      const timeline = `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const test_timeline: Timeline = {
  "id": "test_timeline",
  "name": "テストタイムライン",
  "scope": "story",
  "summary": "概要",
  "events": [
    {
      "id": "event_1",
      "title": "イベント1",
      "category": "plot_point",
      "time": { "order": 1 },
      "summary": "概要",
      "characters": [],
      "settings": [],
      "chapters": [],
      "causedBy": ["nonexistent_event"]
    }
  ]
};
`;
      await Deno.writeTextFile(`${timelinesDir}/test_timeline.ts`, timeline);

      const result = await timelineAnalyzeTool.execute(
        { timelineId: "test_timeline" },
        { projectRoot: tempDir }
      );

      assertEquals(result.isError, false);

      // 分析結果に警告が含まれること
      const text = (result.content[0] as { text: string }).text;
      assertEquals(
        text.includes("nonexistent") || text.includes("warning") || text.includes("Warning") || text.includes("issue"),
        true
      );
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("イベントの順序をチェックすること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      // 因果関係と順序が矛盾するタイムライン
      const timeline = `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const order_issue: Timeline = {
  "id": "order_issue",
  "name": "順序問題",
  "scope": "story",
  "summary": "概要",
  "events": [
    {
      "id": "event_1",
      "title": "イベント1",
      "category": "plot_point",
      "time": { "order": 2 },
      "summary": "概要",
      "characters": [],
      "settings": [],
      "chapters": [],
      "causedBy": ["event_2"]
    },
    {
      "id": "event_2",
      "title": "イベント2",
      "category": "plot_point",
      "time": { "order": 1 },
      "summary": "概要",
      "characters": [],
      "settings": [],
      "chapters": []
    }
  ]
};
`;
      await Deno.writeTextFile(`${timelinesDir}/order_issue.ts`, timeline);

      const result = await timelineAnalyzeTool.execute(
        { timelineId: "order_issue" },
        { projectRoot: tempDir }
      );

      assertEquals(result.isError, false);

      // 分析結果に問題が含まれること（原因イベントが後に来ている）
      const text = (result.content[0] as { text: string }).text;
      assertEquals(
        text.includes("order") || text.includes("Order") || text.includes("before") || text.includes("after"),
        true
      );
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("統計情報を提供すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      const timeline = `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const stats_timeline: Timeline = {
  "id": "stats_timeline",
  "name": "統計タイムライン",
  "scope": "story",
  "summary": "概要",
  "events": [
    {
      "id": "event_1",
      "title": "イベント1",
      "category": "plot_point",
      "time": { "order": 1 },
      "summary": "概要",
      "characters": ["hero"],
      "settings": ["village"],
      "chapters": ["ch1"]
    },
    {
      "id": "event_2",
      "title": "イベント2",
      "category": "character_event",
      "time": { "order": 2 },
      "summary": "概要",
      "characters": ["hero", "mentor"],
      "settings": [],
      "chapters": ["ch1"]
    }
  ]
};
`;
      await Deno.writeTextFile(`${timelinesDir}/stats_timeline.ts`, timeline);

      const result = await timelineAnalyzeTool.execute(
        { timelineId: "stats_timeline" },
        { projectRoot: tempDir }
      );

      assertEquals(result.isError, false);

      // 統計情報が含まれること
      const text = (result.content[0] as { text: string }).text;
      assertEquals(
        text.includes("2") || text.includes("event") || text.includes("character"),
        true
      );
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
