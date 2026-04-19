/**
 * ViewSubplotCommand テスト（TDD Red Phase）
 *
 * storyteller view subplot コマンドの動作を検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { ViewSubplotCommand } from "@storyteller/cli/modules/view/subplot.ts";
import { createMockContext } from "../../../test_utils/mock_context.ts";
import type { Subplot } from "@storyteller/types/v2/subplot.ts";

/**
 * テスト用サブプロットデータを作成するヘルパー
 */
function createTestSubplot(overrides: Partial<Subplot> = {}): Subplot {
  return {
    id: "prince_story",
    name: "王子の花嫁探し",
    type: "subplot",
    status: "active",
    summary: "王子が運命の人を探す物語",
    beats: [],
    focusCharacters: { prince: "primary" as const },
    ...overrides,
  };
}

/**
 * テスト用サブプロットファイルを書き出すヘルパー
 */
async function writeSubplotFile(
  dir: string,
  subplot: Subplot,
): Promise<void> {
  await Deno.writeTextFile(
    `${dir}/${subplot.id}.ts`,
    `import type { Subplot } from "@storyteller/types/v2/subplot.ts";
export const ${subplot.id}: Subplot = ${JSON.stringify(subplot, null, 2)};`,
  );
}

Deno.test("ViewSubplotCommand", async (t) => {
  await t.step("コマンド名とパスが正しいこと", () => {
    const command = new ViewSubplotCommand();
    assertEquals(command.name, "view_subplot");
    assertEquals(command.path, ["view", "subplot"]);
  });

  await t.step("--listでサブプロット一覧を表示すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const subplotsDir = `${tempDir}/src/subplots`;
      await Deno.mkdir(subplotsDir, { recursive: true });

      const subplot1 = createTestSubplot({
        id: "prince_story",
        name: "王子の花嫁探し",
        type: "subplot",
        summary: "王子が運命の人を探す物語",
        focusCharacters: { prince: "primary" as const },
      });

      const subplot2 = createTestSubplot({
        id: "main_story",
        name: "シンデレラの物語",
        type: "main",
        summary: "シンデレラの主軸ストーリー",
        focusCharacters: { cinderella: "primary" as const },
      });

      await writeSubplotFile(subplotsDir, subplot1);
      await writeSubplotFile(subplotsDir, subplot2);

      const command = new ViewSubplotCommand();
      const context = createMockContext({
        args: {
          list: true,
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { subplots: Subplot[] };
        assertExists(value.subplots);
        assertEquals(value.subplots.length, 2);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("サブプロットが空の場合「No subplots found」を表示すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      // subplotsディレクトリは存在するが中身は空
      const subplotsDir = `${tempDir}/src/subplots`;
      await Deno.mkdir(subplotsDir, { recursive: true });

      const command = new ViewSubplotCommand();
      const context = createMockContext({
        args: {
          list: true,
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { subplots: Subplot[] };
        assertEquals(value.subplots.length, 0);
      }

      // presenterに"No subplots found"が表示されたことを確認
      const logs = (context.presenter as unknown as { logs: string[] }).logs;
      const found = logs.some((l) => l.includes("No subplots found"));
      assertEquals(found, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--idで特定のサブプロット詳細を表示すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const subplotsDir = `${tempDir}/src/subplots`;
      await Deno.mkdir(subplotsDir, { recursive: true });

      const subplot = createTestSubplot({
        id: "prince_story",
        name: "王子の花嫁探し",
        type: "subplot",
        summary: "王子が運命の人を探す物語",
        beats: [
          {
            id: "ball_announcement",
            title: "舞踏会の告知",
            summary: "王子の舞踏会が発表される",
            structurePosition: "setup" as const,
            chapter: "chapter_01",
            characters: ["prince", "king"],
            settings: ["castle"],
          },
        ],
        focusCharacters: { prince: "primary" as const },
        importance: "major",
        status: "active",
      });

      await writeSubplotFile(subplotsDir, subplot);

      const command = new ViewSubplotCommand();
      const context = createMockContext({
        args: {
          id: "prince_story",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { subplot: Subplot };
        assertExists(value.subplot);
        assertEquals(value.subplot.id, "prince_story");
        assertEquals(value.subplot.name, "王子の花嫁探し");
        assertEquals(value.subplot.beats.length, 1);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--typeでタイプフィルタすること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const subplotsDir = `${tempDir}/src/subplots`;
      await Deno.mkdir(subplotsDir, { recursive: true });

      const mainPlot = createTestSubplot({
        id: "main_story",
        name: "メインストーリー",
        type: "main",
        summary: "メインプロット",
        focusCharacters: { cinderella: "primary" as const },
      });

      const subplot = createTestSubplot({
        id: "prince_story",
        name: "王子のサブプロット",
        type: "subplot",
        summary: "サブプロット",
        focusCharacters: { prince: "primary" as const },
      });

      const background = createTestSubplot({
        id: "fairy_plot",
        name: "妖精の背景プロット",
        type: "background",
        summary: "背景プロット",
        focusCharacters: { fairy_godmother: "primary" as const },
      });

      await writeSubplotFile(subplotsDir, mainPlot);
      await writeSubplotFile(subplotsDir, subplot);
      await writeSubplotFile(subplotsDir, background);

      const command = new ViewSubplotCommand();
      const context = createMockContext({
        args: {
          list: true,
          type: "subplot",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { subplots: Subplot[] };
        assertExists(value.subplots);
        assertEquals(value.subplots.length, 1);
        assertEquals(value.subplots[0].id, "prince_story");
        assertEquals(value.subplots[0].type, "subplot");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--statusでステータスフィルタすること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const subplotsDir = `${tempDir}/src/subplots`;
      await Deno.mkdir(subplotsDir, { recursive: true });

      const planned = createTestSubplot({
        id: "planned_plot",
        name: "計画中プロット",
        type: "subplot",
        summary: "まだ始まっていない",
        status: "completed",
        focusCharacters: { stepmother: "primary" as const },
      });

      const active = createTestSubplot({
        id: "active_plot",
        name: "進行中プロット",
        type: "main",
        summary: "進行中のメインプロット",
        status: "active",
        focusCharacters: { cinderella: "primary" as const },
      });

      const completed = createTestSubplot({
        id: "completed_plot",
        name: "完了プロット",
        type: "background",
        summary: "完了した背景プロット",
        status: "completed",
        focusCharacters: { fairy_godmother: "primary" as const },
      });

      await writeSubplotFile(subplotsDir, planned);
      await writeSubplotFile(subplotsDir, active);
      await writeSubplotFile(subplotsDir, completed);

      // activeのみフィルタ
      const command = new ViewSubplotCommand();
      const context = createMockContext({
        args: {
          list: true,
          status: "active",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { subplots: Subplot[] };
        assertExists(value.subplots);
        assertEquals(value.subplots.length, 1);
        assertEquals(value.subplots[0].id, "active_plot");
        assertEquals(value.subplots[0].status, "active");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--format mermaidでMermaidグラフを出力すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const subplotsDir = `${tempDir}/src/subplots`;
      await Deno.mkdir(subplotsDir, { recursive: true });

      const subplot = createTestSubplot({
        id: "prince_story",
        name: "王子の花嫁探し",
        type: "subplot",
        summary: "王子が運命の人を探す物語",
        beats: [
          {
            id: "ball_announcement",
            title: "舞踏会の告知",
            summary: "王子の舞踏会が発表される",
            structurePosition: "setup" as const,
            chapter: "chapter_01",
            characters: ["prince"],
            settings: ["castle"],
          },
          {
            id: "meets_mysterious_lady",
            title: "謎の女性との出会い",
            summary: "王子が舞踏会で謎の女性と出会う",
            structurePosition: "climax" as const,
            chapter: "chapter_02",
            characters: ["prince", "cinderella"],
            settings: ["castle_ballroom"],
            preconditionBeatIds: ["ball_announcement"],
          },
        ],
        focusCharacters: { prince: "primary" as const },
      });

      await writeSubplotFile(subplotsDir, subplot);

      const command = new ViewSubplotCommand();
      const context = createMockContext({
        args: {
          id: "prince_story",
          format: "mermaid",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { subplot: Subplot; mermaid: string };
        assertExists(value.mermaid);
        // Mermaid構文の基本的な検証
        assertEquals(value.mermaid.includes("flowchart TD"), true);
        assertEquals(value.mermaid.includes("subgraph"), true);
        assertEquals(value.mermaid.includes("ball_announcement"), true);
        assertEquals(value.mermaid.includes("meets_mysterious_lady"), true);
        assertEquals(value.mermaid.includes("-->"), true);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--jsonでJSON形式出力すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const subplotsDir = `${tempDir}/src/subplots`;
      await Deno.mkdir(subplotsDir, { recursive: true });

      const subplot = createTestSubplot({
        id: "prince_story",
        name: "王子の花嫁探し",
        type: "subplot",
        summary: "王子が運命の人を探す物語",
        focusCharacters: { prince: "primary" as const },
        status: "active",
      });

      await writeSubplotFile(subplotsDir, subplot);

      const command = new ViewSubplotCommand();
      const context = createMockContext({
        args: {
          list: true,
          json: true,
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { subplots: Subplot[] };
        assertExists(value.subplots);
        assertEquals(value.subplots.length, 1);
        assertEquals(value.subplots[0].id, "prince_story");
      }

      // presenterにJSON文字列が表示されたことを確認
      const logs = (context.presenter as unknown as { logs: string[] }).logs;
      const jsonLog = logs.find((l) => l.includes('"id"') && l.includes("prince_story"));
      assertExists(jsonLog);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("存在しないIDでエラーを返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const subplotsDir = `${tempDir}/src/subplots`;
      await Deno.mkdir(subplotsDir, { recursive: true });

      const command = new ViewSubplotCommand();
      const context = createMockContext({
        args: {
          id: "nonexistent",
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
  });
});
