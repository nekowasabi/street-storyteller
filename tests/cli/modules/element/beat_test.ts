/**
 * ElementBeatCommand テスト（TDD Red Phase）
 *
 * storyteller element beat コマンドの動作を検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { ElementBeatCommand } from "@storyteller/cli/modules/element/beat.ts";
import { createMockContext } from "../../../test_utils/mock_context.ts";

/**
 * テスト用のサブプロットファイルを作成するヘルパー
 */
async function createTestSubplotFile(
  tempDir: string,
  subplotId: string,
  beats: unknown[] = [],
): Promise<string> {
  const subplotsDir = `${tempDir}/src/subplots`;
  await Deno.mkdir(subplotsDir, { recursive: true });

  const subplotData = {
    id: subplotId,
    name: `テストサブプロット (${subplotId})`,
    type: "subplot",
    summary: "テスト用サブプロット",
    beats,
    focusCharacters: [{ characterId: "hero", weight: "primary" }],
  };

  const content =
    `import type { Subplot } from "@storyteller/types/v2/subplot.ts";\nexport const ${subplotId}: Subplot = ${
      JSON.stringify(subplotData, null, 2)
    };\n`;
  const filePath = `${subplotsDir}/${subplotId}.ts`;
  await Deno.writeTextFile(filePath, content);
  return filePath;
}

Deno.test("ElementBeatCommand", async (t) => {
  await t.step("コマンド名とパスが正しいこと", () => {
    const command = new ElementBeatCommand();
    assertEquals(command.name, "beat");
    assertEquals(command.path, ["element", "beat"]);
  });

  await t.step("--subplot が欠落している場合にエラーを返すこと", async () => {
    const command = new ElementBeatCommand();

    const context = createMockContext({
      args: {
        title: "舞踏会の告知",
        chapter: "chapter_01",
        summary: "ビート概要",
      },
    });
    const result = await command.execute(context);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "invalid_arguments");
    }
  });

  await t.step(
    "存在しないサブプロットファイルの場合にエラーを返すこと",
    async () => {
      const command = new ElementBeatCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        const context = createMockContext({
          args: {
            subplot: "nonexistent_subplot",
            title: "テストビート",
            chapter: "chapter_01",
            summary: "概要",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, false);
        if (!result.ok) {
          assertEquals(result.error.code, "subplot_not_found");
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "既存サブプロットの beats[] にビートが追加されること",
    async () => {
      const command = new ElementBeatCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        // 既存のサブプロットファイルを作成
        await createTestSubplotFile(tempDir, "prince_story", [
          {
            id: "ball_announcement",
            title: "舞踏会の告知",
            summary: "王子の舞踏会が発表される",
            chapter: "chapter_01",
            characters: ["prince", "king"],
            settings: ["castle"],
          },
        ]);

        const context = createMockContext({
          args: {
            subplot: "prince_story",
            title: "謎の女性との出会い",
            chapter: "chapter_02",
            summary: "王子が舞踏会で謎の女性と出会う",
            characters: "prince,cinderella",
            settings: "castle_ballroom",
            id: "meets_mysterious_lady",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, true);

        if (result.ok) {
          const content = await Deno.readTextFile(
            `${tempDir}/src/subplots/prince_story.ts`,
          );
          // 元のビートが残っていること
          assertEquals(content.includes("ball_announcement"), true);
          // 新しいビートが追加されていること
          assertEquals(content.includes("meets_mysterious_lady"), true);
          assertEquals(content.includes("謎の女性との出会い"), true);
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "--structure-position が無効な値の場合にエラーを返すこと",
    async () => {
      const command = new ElementBeatCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        await createTestSubplotFile(tempDir, "prince_story");

        const context = createMockContext({
          args: {
            subplot: "prince_story",
            title: "テストビート",
            chapter: "chapter_01",
            summary: "概要",
            "structure-position": "invalid_position",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, false);
        if (!result.ok) {
          assertEquals(result.error.code, "invalid_arguments");
          assertEquals(
            result.error.message.includes("structure-position"),
            true,
          );
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "--precondition-beats が存在しないビートIDを参照した場合にエラーを返すこと",
    async () => {
      const command = new ElementBeatCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        await createTestSubplotFile(tempDir, "prince_story");

        const context = createMockContext({
          args: {
            subplot: "prince_story",
            title: "テストビート",
            chapter: "chapter_02",
            summary: "概要",
            "precondition-beats": "nonexistent_beat",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, false);
        if (!result.ok) {
          assertEquals(result.error.code, "precondition_beat_not_found");
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "有効な --structure-position 値でビートが作成されること",
    async () => {
      const validPositions = [
        "setup",
        "rising",
        "climax",
        "falling",
        "resolution",
      ];
      const command = new ElementBeatCommand();

      for (const position of validPositions) {
        const tempDir = await Deno.makeTempDir();
        try {
          await createTestSubplotFile(tempDir, "test_subplot");

          const context = createMockContext({
            args: {
              subplot: "test_subplot",
              title: `${position}ビート`,
              chapter: "chapter_01",
              summary: "概要",
              "structure-position": position,
              id: `beat_${position}`,
              projectRoot: tempDir,
            },
          });

          const result = await command.execute(context);
          assertEquals(
            result.ok,
            true,
            `structure-position="${position}" should be accepted`,
          );
        } finally {
          await Deno.remove(tempDir, { recursive: true });
        }
      }
    },
  );

  await t.step(
    "--precondition-beats が既存ビートを参照している場合に成功すること",
    async () => {
      const command = new ElementBeatCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        await createTestSubplotFile(tempDir, "prince_story", [
          {
            id: "ball_announcement",
            title: "舞踏会の告知",
            summary: "王子の舞踏会が発表される",
            chapter: "chapter_01",
            characters: ["prince"],
            settings: ["castle"],
          },
        ]);

        const context = createMockContext({
          args: {
            subplot: "prince_story",
            title: "謎の女性との出会い",
            chapter: "chapter_02",
            summary: "王子が謎の女性と出会う",
            "precondition-beats": "ball_announcement",
            id: "meets_lady",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, true);

        if (result.ok) {
          const content = await Deno.readTextFile(
            `${tempDir}/src/subplots/prince_story.ts`,
          );
          assertEquals(content.includes("preconditionBeatIds"), true);
          assertEquals(content.includes("ball_announcement"), true);
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );
});
