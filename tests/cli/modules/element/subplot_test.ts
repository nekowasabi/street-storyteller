/**
 * ElementSubplotCommand テスト（TDD Red Phase）
 *
 * storyteller element subplot コマンドの動作を検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { ElementSubplotCommand } from "@storyteller/cli/modules/element/subplot.ts";
import { createMockContext } from "../../../test_utils/mock_context.ts";

Deno.test("ElementSubplotCommand", async (t) => {
  await t.step("コマンド名とパスが正しいこと", () => {
    const command = new ElementSubplotCommand();
    assertEquals(command.name, "subplot");
    assertEquals(command.path, ["element", "subplot"]);
  });

  await t.step("--name が欠落している場合にエラーを返すこと", async () => {
    const command = new ElementSubplotCommand();

    const context = createMockContext({
      args: {
        type: "subplot",
        summary: "テスト概要",
      },
    });
    const result = await command.execute(context);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "invalid_arguments");
    }
  });

  await t.step("--type が無効な値の場合にエラーを返すこと", async () => {
    const command = new ElementSubplotCommand();

    const context = createMockContext({
      args: {
        name: "王子の花嫁探し",
        type: "invalid_type",
        summary: "テスト概要",
      },
    });
    const result = await command.execute(context);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "invalid_arguments");
      assertEquals(result.error.message.includes("type"), true);
    }
  });

  await t.step(
    "有効なオプションで src/subplots/{id}.ts が作成されること",
    async () => {
      const command = new ElementSubplotCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        const context = createMockContext({
          args: {
            name: "王子の花嫁探し",
            type: "subplot",
            summary: "王子が運命の人を探す物語",
            id: "prince_story",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, true);

        if (result.ok) {
          const filePath = `${tempDir}/src/subplots/prince_story.ts`;
          const stat = await Deno.stat(filePath);
          assertExists(stat);

          const content = await Deno.readTextFile(filePath);
          assertEquals(content.includes("Subplot"), true);
          assertEquals(content.includes("prince_story"), true);
          assertEquals(content.includes("subplot"), true);
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    '--focus-characters CSV を正しくパースすること ("hero:primary,heroine:secondary")',
    async () => {
      const command = new ElementSubplotCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        const context = createMockContext({
          args: {
            name: "愛の物語",
            type: "main",
            summary: "ヒーローとヒロインの物語",
            id: "love_story",
            "focus-characters": "hero:primary,heroine:secondary",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, true);

        if (result.ok) {
          const filePath = `${tempDir}/src/subplots/love_story.ts`;
          const content = await Deno.readTextFile(filePath);
          assertEquals(content.includes("focusCharacters"), true);
          assertEquals(content.includes("hero"), true);
          assertEquals(content.includes("heroine"), true);
          assertEquals(content.includes("primary"), true);
          assertEquals(content.includes("secondary"), true);
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step("--json 出力モードで結果が返されること", async () => {
    const command = new ElementSubplotCommand();
    const tempDir = await Deno.makeTempDir();

    try {
      const context = createMockContext({
        args: {
          name: "背景プロット",
          type: "background",
          summary: "世界観の背景",
          id: "bg_plot",
          json: true,
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        // ファイルが作成されることも確認
        const filePath = `${tempDir}/src/subplots/bg_plot.ts`;
        const stat = await Deno.stat(filePath);
        assertExists(stat);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step(
    "--type の全有効値 (main, subplot, parallel, background) が受け入れられること",
    async () => {
      const validTypes = ["main", "subplot", "parallel", "background"];
      const command = new ElementSubplotCommand();

      for (const type of validTypes) {
        const tempDir = await Deno.makeTempDir();
        try {
          const context = createMockContext({
            args: {
              name: `テスト_${type}`,
              type,
              summary: `${type}タイプのテスト`,
              id: `test_${type}`,
              projectRoot: tempDir,
            },
          });

          const result = await command.execute(context);
          assertEquals(result.ok, true, `type="${type}" should be accepted`);
        } finally {
          await Deno.remove(tempDir, { recursive: true });
        }
      }
    },
  );
});
