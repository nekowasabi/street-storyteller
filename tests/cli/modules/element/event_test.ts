/**
 * ElementEventCommand テスト（TDD Red Phase）
 *
 * storyteller element event コマンドの動作を検証
 */

import { assertEquals } from "@std/assert";
import { ElementEventCommand } from "@storyteller/cli/modules/element/event.ts";
import { createMockContext } from "../../../test_utils/mock_context.ts";
import type { Timeline } from "@storyteller/types/v2/timeline.ts";

Deno.test("ElementEventCommand", async (t) => {
  await t.step("コマンド名とパスが正しいこと", () => {
    const command = new ElementEventCommand();
    assertEquals(command.name, "event");
    assertEquals(command.path, ["element", "event"]);
  });

  await t.step(
    "必須オプション（timeline, title, category, order, summary）の検証",
    async () => {
      const command = new ElementEventCommand();

      // timelineが欠落
      const contextNoTimeline = createMockContext({
        args: {
          title: "テストイベント",
          category: "plot_point",
          order: 1,
          summary: "テスト概要",
        },
      });
      const resultNoTimeline = await command.execute(contextNoTimeline);
      assertEquals(resultNoTimeline.ok, false);
      if (!resultNoTimeline.ok) {
        assertEquals(resultNoTimeline.error.code, "invalid_arguments");
      }

      // categoryが欠落
      const contextNoCategory = createMockContext({
        args: {
          timeline: "main_story",
          title: "テストイベント",
          order: 1,
          summary: "テスト概要",
        },
      });
      const resultNoCategory = await command.execute(contextNoCategory);
      assertEquals(resultNoCategory.ok, false);
      if (!resultNoCategory.ok) {
        assertEquals(resultNoCategory.error.code, "invalid_arguments");
      }

      // orderが欠落
      const contextNoOrder = createMockContext({
        args: {
          timeline: "main_story",
          title: "テストイベント",
          category: "plot_point",
          summary: "テスト概要",
        },
      });
      const resultNoOrder = await command.execute(contextNoOrder);
      assertEquals(resultNoOrder.ok, false);
      if (!resultNoOrder.ok) {
        assertEquals(resultNoOrder.error.code, "invalid_arguments");
      }
    },
  );

  await t.step("categoryが有効な値であること", async () => {
    const command = new ElementEventCommand();

    const context = createMockContext({
      args: {
        timeline: "main_story",
        title: "テスト",
        category: "invalid_category",
        order: 1,
        summary: "概要",
      },
    });
    const result = await command.execute(context);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "invalid_arguments");
      assertEquals(result.error.message.includes("category"), true);
    }
  });

  await t.step(
    "有効なオプションでイベントがタイムラインに追加されること",
    async () => {
      const command = new ElementEventCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        // まずタイムラインファイルを作成
        const timelineDir = `${tempDir}/src/timelines`;
        await Deno.mkdir(timelineDir, { recursive: true });

        const initialTimeline: Timeline = {
          id: "main_story",
          name: "メインストーリー",
          scope: "story",
          summary: "主要なタイムライン",
          events: [],
        };

        const timelineContent =
          `import type { Timeline } from "@storyteller/types/v2/timeline.ts";
export const main_story: Timeline = ${JSON.stringify(initialTimeline, null, 2)};
`;
        await Deno.writeTextFile(
          `${timelineDir}/main_story.ts`,
          timelineContent,
        );

        // イベントを追加
        const context = createMockContext({
          args: {
            timeline: "main_story",
            title: "舞踏会への招待",
            category: "plot_point",
            order: 1,
            summary: "シンデレラが招待状を受け取る",
            characters: "cinderella,stepmother",
            settings: "cinderella_house",
            chapters: "chapter_01",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, true);

        // ファイルが更新されたことを確認
        const content = await Deno.readTextFile(`${timelineDir}/main_story.ts`);
        assertEquals(content.includes("舞踏会への招待"), true);
        assertEquals(content.includes("plot_point"), true);
        assertEquals(content.includes("cinderella"), true);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "caused-byとcausesオプションでイベント間の因果関係が設定できること",
    async () => {
      const command = new ElementEventCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        // タイムラインファイルを作成（既存イベント付き）
        const timelineDir = `${tempDir}/src/timelines`;
        await Deno.mkdir(timelineDir, { recursive: true });

        const initialTimeline: Timeline = {
          id: "main_story",
          name: "メインストーリー",
          scope: "story",
          summary: "主要なタイムライン",
          events: [
            {
              id: "ball_invitation",
              title: "舞踏会への招待",
              category: "plot_point",
              time: { order: 1 },
              summary: "招待状を受け取る",
              characters: ["cinderella"],
              settings: ["house"],
              chapters: ["chapter_01"],
            },
          ],
        };

        const timelineContent =
          `import type { Timeline } from "@storyteller/types/v2/timeline.ts";
export const main_story: Timeline = ${JSON.stringify(initialTimeline, null, 2)};
`;
        await Deno.writeTextFile(
          `${timelineDir}/main_story.ts`,
          timelineContent,
        );

        // 因果関係付きイベントを追加
        const context = createMockContext({
          args: {
            timeline: "main_story",
            id: "ball_dance",
            title: "舞踏会での踊り",
            category: "plot_point",
            order: 2,
            summary: "王子と踊る",
            characters: "cinderella,prince",
            "caused-by": "ball_invitation",
            causes: "midnight_escape",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, true);

        // ファイルに因果関係が含まれることを確認
        const content = await Deno.readTextFile(`${timelineDir}/main_story.ts`);
        assertEquals(content.includes("causedBy"), true);
        assertEquals(content.includes("ball_invitation"), true);
        assertEquals(content.includes("causes"), true);
        assertEquals(content.includes("midnight_escape"), true);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "存在しないタイムラインへのイベント追加はエラーになること",
    async () => {
      const command = new ElementEventCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        const context = createMockContext({
          args: {
            timeline: "nonexistent_timeline",
            title: "テストイベント",
            category: "plot_point",
            order: 1,
            summary: "概要",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, false);
        if (!result.ok) {
          assertEquals(result.error.code, "timeline_not_found");
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );
});
