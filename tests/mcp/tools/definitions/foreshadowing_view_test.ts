/**
 * foreshadowing_view MCPツールテスト（TDD Red Phase）
 */

import { assertEquals, assertExists } from "@std/assert";
import { foreshadowingViewTool } from "@storyteller/mcp/tools/definitions/foreshadowing_view.ts";
import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

Deno.test("foreshadowing_view MCPツール", async (t) => {
  await t.step("ツール名がforeshadowing_viewであること", () => {
    assertEquals(foreshadowingViewTool.name, "foreshadowing_view");
  });

  await t.step("descriptionが設定されていること", () => {
    assertExists(foreshadowingViewTool.description);
  });

  await t.step("inputSchemaにidとlistプロパティがあること", () => {
    const properties = foreshadowingViewTool.inputSchema.properties;
    assertExists(properties);
    assertExists(properties.id);
    assertExists(properties.list);
    assertExists(properties.status);
  });

  await t.step("list=trueで伏線一覧を取得できること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
      await Deno.mkdir(foreshadowingsDir, { recursive: true });

      const foreshadowing: Foreshadowing = {
        id: "sword",
        name: "古びた剣",
        type: "chekhov",
        summary: "床板の下から発見される剣",
        planting: {
          chapter: "chapter_01",
          description: "剣を発見する",
        },
        status: "planted",
      };

      await Deno.writeTextFile(
        `${foreshadowingsDir}/sword.ts`,
        `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
export const sword: Foreshadowing = ${JSON.stringify(foreshadowing, null, 2)};`,
      );

      const result = await foreshadowingViewTool.execute(
        { list: true },
        { projectRoot: tempDir },
      );

      assertEquals(result.isError, false);
      assertExists(result.content);
      assertEquals(result.content.length > 0, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("idで特定の伏線を取得できること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
      await Deno.mkdir(foreshadowingsDir, { recursive: true });

      const foreshadowing: Foreshadowing = {
        id: "prophecy",
        name: "予言",
        type: "prophecy",
        summary: "勇者の予言",
        planting: {
          chapter: "chapter_02",
          description: "予言が告げられる",
        },
        status: "planted",
      };

      await Deno.writeTextFile(
        `${foreshadowingsDir}/prophecy.ts`,
        `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
export const prophecy: Foreshadowing = ${
          JSON.stringify(foreshadowing, null, 2)
        };`,
      );

      const result = await foreshadowingViewTool.execute(
        { id: "prophecy" },
        { projectRoot: tempDir },
      );

      assertEquals(result.isError, false);
      assertExists(result.content);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("statusフィルタが動作すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
      await Deno.mkdir(foreshadowingsDir, { recursive: true });

      const planted: Foreshadowing = {
        id: "planted_one",
        name: "未回収伏線",
        type: "hint",
        summary: "まだ回収されていない",
        planting: {
          chapter: "chapter_01",
          description: "設置",
        },
        status: "planted",
      };

      const resolved: Foreshadowing = {
        id: "resolved_one",
        name: "回収済み伏線",
        type: "mystery",
        summary: "すでに回収済み",
        planting: {
          chapter: "chapter_01",
          description: "設置",
        },
        status: "resolved",
        resolutions: [
          {
            chapter: "chapter_05",
            description: "回収",
            completeness: 1.0,
          },
        ],
      };

      await Deno.writeTextFile(
        `${foreshadowingsDir}/planted_one.ts`,
        `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
export const planted_one: Foreshadowing = ${JSON.stringify(planted, null, 2)};`,
      );

      await Deno.writeTextFile(
        `${foreshadowingsDir}/resolved_one.ts`,
        `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
export const resolved_one: Foreshadowing = ${
          JSON.stringify(resolved, null, 2)
        };`,
      );

      const result = await foreshadowingViewTool.execute(
        { list: true, status: "planted" },
        { projectRoot: tempDir },
      );

      assertEquals(result.isError, false);
      assertExists(result.content);
      // 結果にplanted_oneのみが含まれることを確認
      const content = result.content[0];
      if (content.type === "text") {
        assertEquals(content.text.includes("planted_one"), true);
        assertEquals(content.text.includes("resolved_one"), false);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("存在しないIDでエラーを返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
      await Deno.mkdir(foreshadowingsDir, { recursive: true });

      const result = await foreshadowingViewTool.execute(
        { id: "nonexistent" },
        { projectRoot: tempDir },
      );

      assertEquals(result.isError, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
