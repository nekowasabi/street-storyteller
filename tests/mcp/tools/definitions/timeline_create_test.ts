/**
 * timeline_create MCPツールテスト（TDD Red Phase）
 */

import { assertEquals, assertExists } from "@std/assert";
import { timelineCreateTool } from "../../../../src/mcp/tools/definitions/timeline_create.ts";

Deno.test("timeline_create MCPツール", async (t) => {
  await t.step("ツール名がtimeline_createであること", () => {
    assertEquals(timelineCreateTool.name, "timeline_create");
  });

  await t.step("descriptionが設定されていること", () => {
    assertExists(timelineCreateTool.description);
  });

  await t.step("inputSchemaがname, scope, summaryをrequiredとしていること", () => {
    const required = timelineCreateTool.inputSchema.required;
    assertExists(required);
    assertEquals(required.includes("name"), true);
    assertEquals(required.includes("scope"), true);
  });

  await t.step("execute()がElementTimelineCommandを呼び出すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const result = await timelineCreateTool.execute(
        {
          name: "テストタイムライン",
          scope: "story",
          summary: "テスト用タイムライン",
        },
        { projectRoot: tempDir }
      );

      assertEquals(result.isError, false);

      // ファイルが作成されたことを確認
      const files = [];
      for await (const entry of Deno.readDir(`${tempDir}/src/timelines`)) {
        files.push(entry.name);
      }
      assertEquals(files.length > 0, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("必須パラメータ欠落時にエラーを返すこと", async () => {
    // nameがない
    const result = await timelineCreateTool.execute(
      { scope: "story", summary: "概要" },
      { projectRoot: "/tmp" }
    );
    assertEquals(result.isError, true);
  });

  await t.step("無効なscopeでエラーを返すこと", async () => {
    const result = await timelineCreateTool.execute(
      { name: "test", scope: "invalid_scope", summary: "概要" },
      { projectRoot: "/tmp" }
    );
    assertEquals(result.isError, true);
  });
});
