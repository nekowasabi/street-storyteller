/**
 * ElementIntersectionCommand テスト（TDD Red Phase）
 *
 * storyteller element intersection コマンドの動作を検証
 */

import { assertEquals } from "@std/assert";
import { ElementIntersectionCommand } from "@storyteller/cli/modules/element/intersection.ts";
import { createMockContext } from "../../../test_utils/mock_context.ts";

/**
 * テスト用のサブプロットファイルを作成するヘルパー
 */
async function createTestSubplotFile(
  tempDir: string,
  subplotId: string,
  beats: unknown[] = [],
): Promise<void> {
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
  await Deno.writeTextFile(`${subplotsDir}/${subplotId}.ts`, content);
}

Deno.test("ElementIntersectionCommand", async (t) => {
  await t.step("コマンド名とパスが正しいこと", () => {
    const command = new ElementIntersectionCommand();
    assertEquals(command.name, "intersection");
    assertEquals(command.path, ["element", "intersection"]);
  });

  await t.step(
    "存在しない source-subplot の場合にエラーを返すこと",
    async () => {
      const command = new ElementIntersectionCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        // target-subplotのみ作成
        await createTestSubplotFile(tempDir, "target_plot", [
          {
            id: "target_beat",
            title: "ターゲットビート",
            summary: "概要",
            chapter: "chapter_01",
            characters: [],
            settings: [],
          },
        ]);

        const context = createMockContext({
          args: {
            "source-subplot": "nonexistent_source",
            "source-beat": "source_beat",
            "target-subplot": "target_plot",
            "target-beat": "target_beat",
            summary: "テスト交差",
            "influence-level": "high",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, false);
        if (!result.ok) {
          assertEquals(result.error.code, "source_subplot_not_found");
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "存在しない target-beat が target-subplot 内にない場合にエラーを返すこと",
    async () => {
      const command = new ElementIntersectionCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        // source-subplot with a beat
        await createTestSubplotFile(tempDir, "source_plot", [
          {
            id: "source_beat",
            title: "ソースビート",
            summary: "概要",
            chapter: "chapter_01",
            characters: [],
            settings: [],
          },
        ]);

        // target-subplot without the referenced beat
        await createTestSubplotFile(tempDir, "target_plot", [
          {
            id: "other_beat",
            title: "別のビート",
            summary: "概要",
            chapter: "chapter_02",
            characters: [],
            settings: [],
          },
        ]);

        const context = createMockContext({
          args: {
            "source-subplot": "source_plot",
            "source-beat": "source_beat",
            "target-subplot": "target_plot",
            "target-beat": "nonexistent_target_beat",
            summary: "テスト交差",
            "influence-level": "high",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, false);
        if (!result.ok) {
          assertEquals(result.error.code, "target_beat_not_found");
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "交差が source subplot にのみ追加され target には追加されないこと",
    async () => {
      const command = new ElementIntersectionCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        await createTestSubplotFile(tempDir, "source_plot", [
          {
            id: "source_beat",
            title: "ソースビート",
            summary: "概要",
            chapter: "chapter_01",
            characters: [],
            settings: [],
          },
        ]);

        await createTestSubplotFile(tempDir, "target_plot", [
          {
            id: "target_beat",
            title: "ターゲットビート",
            summary: "概要",
            chapter: "chapter_02",
            characters: [],
            settings: [],
          },
        ]);

        const context = createMockContext({
          args: {
            "source-subplot": "source_plot",
            "source-beat": "source_beat",
            "target-subplot": "target_plot",
            "target-beat": "target_beat",
            summary: "テスト交差の説明",
            "influence-level": "high",
            "influence-direction": "mutual",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, true);

        if (result.ok) {
          // source subplotにintersectionsが追加されていること
          const sourceContent = await Deno.readTextFile(
            `${tempDir}/src/subplots/source_plot.ts`,
          );
          assertEquals(sourceContent.includes("intersections"), true);
          assertEquals(sourceContent.includes("target_beat"), true);
          assertEquals(sourceContent.includes("テスト交差の説明"), true);

          // target subplotにはintersectionsが追加されていないこと
          const targetContent = await Deno.readTextFile(
            `${tempDir}/src/subplots/target_plot.ts`,
          );
          assertEquals(targetContent.includes("intersections"), false);
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "--direction が省略された場合にデフォルトで forward になること",
    async () => {
      const command = new ElementIntersectionCommand();
      const tempDir = await Deno.makeTempDir();

      try {
        await createTestSubplotFile(tempDir, "source_plot", [
          {
            id: "source_beat",
            title: "ソースビート",
            summary: "概要",
            chapter: "chapter_01",
            characters: [],
            settings: [],
          },
        ]);

        await createTestSubplotFile(tempDir, "target_plot", [
          {
            id: "target_beat",
            title: "ターゲットビート",
            summary: "概要",
            chapter: "chapter_02",
            characters: [],
            settings: [],
          },
        ]);

        // --direction を指定しない
        const context = createMockContext({
          args: {
            "source-subplot": "source_plot",
            "source-beat": "source_beat",
            "target-subplot": "target_plot",
            "target-beat": "target_beat",
            summary: "方向省略のテスト",
            "influence-level": "medium",
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, true);

        if (result.ok) {
          const sourceContent = await Deno.readTextFile(
            `${tempDir}/src/subplots/source_plot.ts`,
          );
          // forwardがデフォルトで設定されていること
          assertEquals(sourceContent.includes("forward"), true);
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "全方向 (forward, backward, mutual) が受け入れられること",
    async () => {
      const directions = ["forward", "backward", "mutual"];
      const command = new ElementIntersectionCommand();

      for (const direction of directions) {
        const tempDir = await Deno.makeTempDir();
        try {
          await createTestSubplotFile(tempDir, "source_plot", [
            {
              id: "source_beat",
              title: "ソースビート",
              summary: "概要",
              chapter: "chapter_01",
              characters: [],
              settings: [],
            },
          ]);

          await createTestSubplotFile(tempDir, "target_plot", [
            {
              id: "target_beat",
              title: "ターゲットビート",
              summary: "概要",
              chapter: "chapter_02",
              characters: [],
              settings: [],
            },
          ]);

          const context = createMockContext({
            args: {
              "source-subplot": "source_plot",
              "source-beat": "source_beat",
              "target-subplot": "target_plot",
              "target-beat": "target_beat",
              summary: `${direction}方向のテスト`,
              "influence-level": "high",
              direction,
              projectRoot: tempDir,
            },
          });

          const result = await command.execute(context);
          assertEquals(
            result.ok,
            true,
            `direction="${direction}" should be accepted`,
          );
        } finally {
          await Deno.remove(tempDir, { recursive: true });
        }
      }
    },
  );
});
