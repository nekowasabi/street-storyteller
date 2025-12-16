/**
 * foreshadowing_create MCPツールテスト（TDD Red Phase）
 */

import { assertEquals, assertExists } from "@std/assert";
import { foreshadowingCreateTool } from "../../../../src/mcp/tools/definitions/foreshadowing_create.ts";

Deno.test("foreshadowing_create MCPツール", async (t) => {
  await t.step("ツール名がforeshadowing_createであること", () => {
    assertEquals(foreshadowingCreateTool.name, "foreshadowing_create");
  });

  await t.step("descriptionが設定されていること", () => {
    assertExists(foreshadowingCreateTool.description);
  });

  await t.step(
    "inputSchemaがname, type, planting-chapter, planting-descriptionをrequiredとしていること",
    () => {
      const required = foreshadowingCreateTool.inputSchema.required;
      assertExists(required);
      assertEquals(required.includes("name"), true);
      assertEquals(required.includes("type"), true);
      assertEquals(required.includes("plantingChapter"), true);
      assertEquals(required.includes("plantingDescription"), true);
    },
  );

  await t.step(
    "execute()がElementForeshadowingCommandを呼び出すこと",
    async () => {
      const tempDir = await Deno.makeTempDir();

      try {
        const result = await foreshadowingCreateTool.execute(
          {
            name: "テスト伏線",
            type: "chekhov",
            plantingChapter: "chapter_01",
            plantingDescription: "伏線を設置",
            summary: "テスト用伏線",
          },
          { projectRoot: tempDir },
        );

        assertEquals(result.isError, false);

        // ファイルが作成されたことを確認
        const files = [];
        for await (
          const entry of Deno.readDir(`${tempDir}/src/foreshadowings`)
        ) {
          files.push(entry.name);
        }
        assertEquals(files.length > 0, true);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step("必須パラメータ欠落時にエラーを返すこと", async () => {
    // nameがない
    const result = await foreshadowingCreateTool.execute(
      {
        type: "chekhov",
        plantingChapter: "chapter_01",
        plantingDescription: "desc",
      },
      { projectRoot: "/tmp" },
    );
    assertEquals(result.isError, true);
  });

  await t.step("無効なtypeでエラーを返すこと", async () => {
    const result = await foreshadowingCreateTool.execute(
      {
        name: "test",
        type: "invalid_type",
        plantingChapter: "chapter_01",
        plantingDescription: "desc",
      },
      { projectRoot: "/tmp" },
    );
    assertEquals(result.isError, true);
  });
});
