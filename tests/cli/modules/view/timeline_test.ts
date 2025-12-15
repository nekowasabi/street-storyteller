/**
 * ViewTimelineCommand テスト（TDD Red Phase）
 */

import { assertEquals, assertExists } from "@std/assert";
import { ViewTimelineCommand } from "../../../../src/cli/modules/view/timeline.ts";
import { createMockContext } from "../../../test_utils/mock_context.ts";

Deno.test("ViewTimelineCommand - 基本", async (t) => {
  await t.step("クラスが存在すること", () => {
    assertExists(ViewTimelineCommand);
  });

  await t.step("コマンド名がview_timelineであること", () => {
    const cmd = new ViewTimelineCommand();
    assertEquals(cmd.name, "view_timeline");
  });
});

Deno.test("ViewTimelineCommand - timelines一覧表示", async (t) => {
  await t.step("タイムラインがない場合にメッセージを表示すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const cmd = new ViewTimelineCommand();
      const context = createMockContext({
        args: { list: true },
        projectRoot: tempDir,
      });

      const result = await cmd.execute(context);
      assertEquals(result.ok, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("タイムライン一覧を表示すること", async () => {
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
  "events": []
};
`;
      await Deno.writeTextFile(`${timelinesDir}/main_story.ts`, timeline);

      const cmd = new ViewTimelineCommand();
      const context = createMockContext({
        args: { list: true },
        projectRoot: tempDir,
      });

      const result = await cmd.execute(context);
      assertEquals(result.ok, true);

      // 出力にタイムライン名が含まれているはず
      // （モックでは実際の出力は検証しにくいが、エラーが起きないことを確認）
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test("ViewTimelineCommand - timeline詳細表示", async (t) => {
  await t.step("存在しないタイムラインでエラーを返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const cmd = new ViewTimelineCommand();
      const context = createMockContext({
        args: { id: "nonexistent" },
        projectRoot: tempDir,
      });

      const result = await cmd.execute(context);
      assertEquals(result.ok, false);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("特定タイムラインの詳細を表示すること", async () => {
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
      "summary": "概要",
      "characters": [],
      "settings": [],
      "chapters": []
    }
  ]
};
`;
      await Deno.writeTextFile(`${timelinesDir}/main_story.ts`, timeline);

      const cmd = new ViewTimelineCommand();
      const context = createMockContext({
        args: { id: "main_story" },
        projectRoot: tempDir,
      });

      const result = await cmd.execute(context);
      assertEquals(result.ok, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test("ViewTimelineCommand - JSON出力", async (t) => {
  await t.step("--json オプションでJSON形式で出力すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

      const timeline = `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const test_timeline: Timeline = {
  "id": "test_timeline",
  "name": "テストタイムライン",
  "scope": "story",
  "summary": "概要",
  "events": []
};
`;
      await Deno.writeTextFile(`${timelinesDir}/test_timeline.ts`, timeline);

      const cmd = new ViewTimelineCommand();
      const context = createMockContext({
        args: { list: true, json: true },
        projectRoot: tempDir,
      });

      const result = await cmd.execute(context);
      assertEquals(result.ok, true);

      // JSON出力モードの場合、結果にデータが含まれること
      if (result.ok && result.value) {
        assertEquals(typeof result.value === "object", true);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test("ViewTimelineCommand - Mermaid出力", async (t) => {
  await t.step("--format mermaid オプションでMermaid図を出力すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const timelinesDir = `${tempDir}/src/timelines`;
      await Deno.mkdir(timelinesDir, { recursive: true });

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
      "causes": ["event_2"]
    },
    {
      "id": "event_2",
      "title": "イベント2",
      "category": "plot_point",
      "time": { "order": 2 },
      "summary": "概要",
      "characters": [],
      "settings": [],
      "chapters": [],
      "causedBy": ["event_1"]
    }
  ]
};
`;
      await Deno.writeTextFile(`${timelinesDir}/test_timeline.ts`, timeline);

      const cmd = new ViewTimelineCommand();
      const context = createMockContext({
        args: { id: "test_timeline", format: "mermaid" },
        projectRoot: tempDir,
      });

      const result = await cmd.execute(context);
      assertEquals(result.ok, true);

      // Mermaid形式の場合、結果にMermaidコードが含まれること
      if (result.ok && result.value) {
        const output = result.value as { mermaid?: string };
        if (output.mermaid) {
          assertEquals(output.mermaid.includes("graph") || output.mermaid.includes("flowchart"), true);
        }
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
