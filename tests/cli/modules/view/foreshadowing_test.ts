/**
 * ViewForeshadowingCommand テスト（TDD Red Phase）
 *
 * storyteller view foreshadowing コマンドの動作を検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { ViewForeshadowingCommand } from "@storyteller/cli/modules/view/foreshadowing.ts";
import { createMockContext } from "../../../test_utils/mock_context.ts";
import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

Deno.test("ViewForeshadowingCommand", async (t) => {
  await t.step("コマンド名とパスが正しいこと", () => {
    const command = new ViewForeshadowingCommand();
    assertEquals(command.name, "view_foreshadowing");
    assertEquals(command.path, ["view", "foreshadowing"]);
  });

  await t.step("--listで伏線一覧を表示すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      // テスト用の伏線ファイルを作成
      const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
      await Deno.mkdir(foreshadowingsDir, { recursive: true });

      const foreshadowing1: Foreshadowing = {
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

      const foreshadowing2: Foreshadowing = {
        id: "prophecy",
        name: "予言",
        type: "prophecy",
        summary: "勇者の予言",
        planting: {
          chapter: "chapter_02",
          description: "予言が告げられる",
        },
        status: "resolved",
        resolutions: [
          {
            chapter: "chapter_10",
            description: "予言が成就",
            completeness: 1.0,
          },
        ],
      };

      await Deno.writeTextFile(
        `${foreshadowingsDir}/sword.ts`,
        `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
export const sword: Foreshadowing = ${
          JSON.stringify(foreshadowing1, null, 2)
        };`,
      );

      await Deno.writeTextFile(
        `${foreshadowingsDir}/prophecy.ts`,
        `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
export const prophecy: Foreshadowing = ${
          JSON.stringify(foreshadowing2, null, 2)
        };`,
      );

      const command = new ViewForeshadowingCommand();
      const context = createMockContext({
        args: {
          list: true,
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { foreshadowings: Foreshadowing[] };
        assertExists(value.foreshadowings);
        assertEquals(value.foreshadowings.length, 2);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--idで特定の伏線を表示すること", async () => {
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
        importance: "major",
      };

      await Deno.writeTextFile(
        `${foreshadowingsDir}/sword.ts`,
        `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
export const sword: Foreshadowing = ${JSON.stringify(foreshadowing, null, 2)};`,
      );

      const command = new ViewForeshadowingCommand();
      const context = createMockContext({
        args: {
          id: "sword",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { foreshadowing: Foreshadowing };
        assertExists(value.foreshadowing);
        assertEquals(value.foreshadowing.id, "sword");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--status plantedで未回収のみフィルタすること", async () => {
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

      const command = new ViewForeshadowingCommand();
      const context = createMockContext({
        args: {
          list: true,
          status: "planted",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { foreshadowings: Foreshadowing[] };
        assertExists(value.foreshadowings);
        assertEquals(value.foreshadowings.length, 1);
        assertEquals(value.foreshadowings[0].id, "planted_one");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--status resolvedで回収済みのみフィルタすること", async () => {
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

      const command = new ViewForeshadowingCommand();
      const context = createMockContext({
        args: {
          list: true,
          status: "resolved",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { foreshadowings: Foreshadowing[] };
        assertExists(value.foreshadowings);
        assertEquals(value.foreshadowings.length, 1);
        assertEquals(value.foreshadowings[0].id, "resolved_one");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--jsonでJSON形式出力すること", async () => {
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

      const command = new ViewForeshadowingCommand();
      const context = createMockContext({
        args: {
          list: true,
          json: true,
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("存在しないIDでエラーを返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
      await Deno.mkdir(foreshadowingsDir, { recursive: true });

      const command = new ViewForeshadowingCommand();
      const context = createMockContext({
        args: {
          id: "nonexistent",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, false);

      if (!result.ok) {
        assertEquals(result.error.code, "foreshadowing_not_found");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
