/**
 * ElementTimelineCommand テスト（TDD Red Phase）
 *
 * storyteller element timeline コマンドの動作を検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { ElementTimelineCommand } from "../../../../src/cli/modules/element/timeline.ts";
import { createMockContext } from "../../../test_utils/mock_context.ts";

Deno.test("ElementTimelineCommand", async (t) => {
  await t.step("コマンド名とパスが正しいこと", () => {
    const command = new ElementTimelineCommand();
    assertEquals(command.name, "timeline");
    assertEquals(command.path, ["element", "timeline"]);
  });

  await t.step("必須オプション（name, scope, summary）の検証", async () => {
    const command = new ElementTimelineCommand();

    // nameが欠落
    const contextNoName = createMockContext({
      args: { scope: "story", summary: "テスト概要" },
    });
    const resultNoName = await command.execute(contextNoName);
    assertEquals(resultNoName.ok, false);
    if (!resultNoName.ok) {
      assertEquals(resultNoName.error.code, "invalid_arguments");
    }

    // scopeが欠落
    const contextNoScope = createMockContext({
      args: { name: "test_timeline", summary: "テスト概要" },
    });
    const resultNoScope = await command.execute(contextNoScope);
    assertEquals(resultNoScope.ok, false);
    if (!resultNoScope.ok) {
      assertEquals(resultNoScope.error.code, "invalid_arguments");
    }
  });

  await t.step("scopeが有効な値であること", async () => {
    const command = new ElementTimelineCommand();

    // 無効なスコープ
    const contextInvalidScope = createMockContext({
      args: { name: "test", scope: "invalid_scope", summary: "概要" },
    });
    const result = await command.execute(contextInvalidScope);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "invalid_arguments");
      assertEquals(result.error.message.includes("scope"), true);
    }
  });

  await t.step("有効なオプションでタイムラインが作成されること", async () => {
    const command = new ElementTimelineCommand();

    // テスト用の一時ディレクトリを使用
    const tempDir = await Deno.makeTempDir();

    try {
      const context = createMockContext({
        args: {
          name: "メインストーリー",
          scope: "story",
          summary: "物語の主要なタイムライン",
          id: "main_story",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        // ファイルが作成されたことを確認
        const filePath = `${tempDir}/src/timelines/main_story.ts`;
        const stat = await Deno.stat(filePath);
        assertExists(stat);

        // ファイル内容を確認
        const content = await Deno.readTextFile(filePath);
        assertEquals(content.includes("Timeline"), true);
        assertEquals(content.includes("main_story"), true);
        assertEquals(content.includes("story"), true);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("parent-timelineオプションが設定できること", async () => {
    const command = new ElementTimelineCommand();
    const tempDir = await Deno.makeTempDir();

    try {
      const context = createMockContext({
        args: {
          name: "サブストーリー",
          scope: "arc",
          summary: "サブストーリーのタイムライン",
          id: "sub_story",
          "parent-timeline": "main_story",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const filePath = `${tempDir}/src/timelines/sub_story.ts`;
        const content = await Deno.readTextFile(filePath);
        assertEquals(content.includes("parentTimeline"), true);
        assertEquals(content.includes("main_story"), true);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("related-characterオプションが設定できること", async () => {
    const command = new ElementTimelineCommand();
    const tempDir = await Deno.makeTempDir();

    try {
      const context = createMockContext({
        args: {
          name: "勇者の旅",
          scope: "character",
          summary: "勇者のタイムライン",
          id: "hero_journey",
          "related-character": "hero",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const filePath = `${tempDir}/src/timelines/hero_journey.ts`;
        const content = await Deno.readTextFile(filePath);
        assertEquals(content.includes("relatedCharacter"), true);
        assertEquals(content.includes("hero"), true);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
