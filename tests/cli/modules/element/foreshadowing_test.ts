/**
 * ElementForeshadowingCommand テスト（TDD Red Phase）
 *
 * storyteller element foreshadowing コマンドの動作を検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { ElementForeshadowingCommand } from "@storyteller/cli/modules/element/foreshadowing.ts";
import { createMockContext } from "../../../test_utils/mock_context.ts";

Deno.test("ElementForeshadowingCommand", async (t) => {
  await t.step("コマンド名とパスが正しいこと", () => {
    const command = new ElementForeshadowingCommand();
    assertEquals(command.name, "foreshadowing");
    assertEquals(command.path, ["element", "foreshadowing"]);
  });

  await t.step(
    "必須オプション（name, type, planting-chapter, planting-description）の検証",
    async () => {
      const command = new ElementForeshadowingCommand();

      // nameが欠落
      const contextNoName = createMockContext({
        args: {
          type: "hint",
          "planting-chapter": "chapter_01",
          "planting-description": "伏線の説明",
        },
      });
      const resultNoName = await command.execute(contextNoName);
      assertEquals(resultNoName.ok, false);
      if (!resultNoName.ok) {
        assertEquals(resultNoName.error.code, "invalid_arguments");
      }

      // typeが欠落
      const contextNoType = createMockContext({
        args: {
          name: "test_foreshadowing",
          "planting-chapter": "chapter_01",
          "planting-description": "伏線の説明",
        },
      });
      const resultNoType = await command.execute(contextNoType);
      assertEquals(resultNoType.ok, false);
      if (!resultNoType.ok) {
        assertEquals(resultNoType.error.code, "invalid_arguments");
      }

      // planting-chapterが欠落
      const contextNoChapter = createMockContext({
        args: {
          name: "test_foreshadowing",
          type: "hint",
          "planting-description": "伏線の説明",
        },
      });
      const resultNoChapter = await command.execute(contextNoChapter);
      assertEquals(resultNoChapter.ok, false);
      if (!resultNoChapter.ok) {
        assertEquals(resultNoChapter.error.code, "invalid_arguments");
      }

      // planting-descriptionが欠落
      const contextNoDescription = createMockContext({
        args: {
          name: "test_foreshadowing",
          type: "hint",
          "planting-chapter": "chapter_01",
        },
      });
      const resultNoDescription = await command.execute(contextNoDescription);
      assertEquals(resultNoDescription.ok, false);
      if (!resultNoDescription.ok) {
        assertEquals(resultNoDescription.error.code, "invalid_arguments");
      }
    },
  );

  await t.step("typeが有効な値であること", async () => {
    const command = new ElementForeshadowingCommand();

    // 無効なタイプ
    const contextInvalidType = createMockContext({
      args: {
        name: "test",
        type: "invalid_type",
        "planting-chapter": "chapter_01",
        "planting-description": "説明",
      },
    });
    const result = await command.execute(contextInvalidType);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "invalid_arguments");
      assertEquals(result.error.message.includes("type"), true);
    }
  });

  await t.step("有効なオプションで伏線が作成されること", async () => {
    const command = new ElementForeshadowingCommand();

    // テスト用の一時ディレクトリを使用
    const tempDir = await Deno.makeTempDir();

    try {
      const context = createMockContext({
        args: {
          name: "古びた剣",
          type: "chekhov",
          "planting-chapter": "chapter_01",
          "planting-description": "床板の下から古びた剣を発見する",
          summary: "物語序盤で発見される剣が終盤で重要な役割を果たす",
          id: "ancient_sword",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        // ファイルが作成されたことを確認
        const filePath = `${tempDir}/src/foreshadowings/ancient_sword.ts`;
        const stat = await Deno.stat(filePath);
        assertExists(stat);

        // ファイル内容を確認
        const content = await Deno.readTextFile(filePath);
        assertEquals(content.includes("Foreshadowing"), true);
        assertEquals(content.includes("ancient_sword"), true);
        assertEquals(content.includes("chekhov"), true);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("statusのデフォルト値がplantedであること", async () => {
    const command = new ElementForeshadowingCommand();
    const tempDir = await Deno.makeTempDir();

    try {
      const context = createMockContext({
        args: {
          name: "テスト伏線",
          type: "hint",
          "planting-chapter": "chapter_01",
          "planting-description": "設置の説明",
          id: "test_foreshadowing",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const filePath = `${tempDir}/src/foreshadowings/test_foreshadowing.ts`;
        const content = await Deno.readTextFile(filePath);
        assertEquals(content.includes('"status": "planted"'), true);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("importanceオプションが設定できること", async () => {
    const command = new ElementForeshadowingCommand();
    const tempDir = await Deno.makeTempDir();

    try {
      const context = createMockContext({
        args: {
          name: "重要な伏線",
          type: "prophecy",
          "planting-chapter": "chapter_01",
          "planting-description": "予言が告げられる",
          id: "important_foreshadowing",
          importance: "major",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const filePath =
          `${tempDir}/src/foreshadowings/important_foreshadowing.ts`;
        const content = await Deno.readTextFile(filePath);
        assertEquals(content.includes("importance"), true);
        assertEquals(content.includes("major"), true);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step(
    "plannedResolutionChapterオプションが設定できること",
    async () => {
      const command = new ElementForeshadowingCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        const context = createMockContext({
          args: {
            name: "計画的伏線",
            type: "mystery",
            "planting-chapter": "chapter_01",
            "planting-description": "謎が提示される",
            id: "planned_foreshadowing",
            "planned-resolution-chapter": "chapter_final",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, true);

        if (result.ok) {
          const filePath =
            `${tempDir}/src/foreshadowings/planned_foreshadowing.ts`;
          const content = await Deno.readTextFile(filePath);
          assertEquals(content.includes("plannedResolutionChapter"), true);
          assertEquals(content.includes("chapter_final"), true);
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step("relationsオプションが設定できること", async () => {
    const command = new ElementForeshadowingCommand();
    const tempDir = await Deno.makeTempDir();

    try {
      const context = createMockContext({
        args: {
          name: "関連付き伏線",
          type: "symbol",
          "planting-chapter": "chapter_01",
          "planting-description": "シンボルが登場",
          id: "related_foreshadowing",
          characters: "hero,mentor",
          settings: "temple",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const filePath =
          `${tempDir}/src/foreshadowings/related_foreshadowing.ts`;
        const content = await Deno.readTextFile(filePath);
        assertEquals(content.includes("relations"), true);
        assertEquals(content.includes("hero"), true);
        assertEquals(content.includes("mentor"), true);
        assertEquals(content.includes("temple"), true);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("displayNamesオプションが設定できること", async () => {
    const command = new ElementForeshadowingCommand();
    const tempDir = await Deno.makeTempDir();

    try {
      const context = createMockContext({
        args: {
          name: "名前付き伏線",
          type: "hint",
          "planting-chapter": "chapter_01",
          "planting-description": "ヒントが提示される",
          id: "named_foreshadowing",
          "display-names": "古い剣,錆びた剣",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const filePath = `${tempDir}/src/foreshadowings/named_foreshadowing.ts`;
        const content = await Deno.readTextFile(filePath);
        assertEquals(content.includes("displayNames"), true);
        assertEquals(content.includes("古い剣"), true);
        assertEquals(content.includes("錆びた剣"), true);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
