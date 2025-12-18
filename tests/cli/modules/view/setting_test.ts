/**
 * ViewSettingCommand テスト（TDD Red Phase）
 *
 * storyteller view setting コマンドの動作を検証
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  DefaultSettingLoader,
  ViewSettingCommand,
} from "../../../../src/cli/modules/view/setting.ts";
import { createMockContext } from "../../../test_utils/mock_context.ts";
import type { Setting } from "../../../../src/type/v2/setting.ts";

Deno.test("ViewSettingCommand", async (t) => {
  await t.step("コマンド名とパスが正しいこと", () => {
    const command = new ViewSettingCommand();
    assertEquals(command.name, "view_setting");
    assertEquals(command.path, ["view", "setting"]);
  });

  await t.step("--listで設定一覧を表示すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      // テスト用の設定ファイルを作成
      const settingsDir = `${tempDir}/src/settings`;
      await Deno.mkdir(settingsDir, { recursive: true });

      const setting1: Setting = {
        id: "royal_capital",
        name: "王都",
        type: "location",
        appearingChapters: ["chapter_01", "chapter_05"],
        summary: "王国の首都。壮大な城と活気ある市場がある。",
      };

      const setting2: Setting = {
        id: "dark_forest",
        name: "暗黒の森",
        type: "location",
        appearingChapters: ["chapter_03"],
        summary: "古代の魔法が漂う危険な森。",
      };

      await Deno.writeTextFile(
        `${settingsDir}/royal_capital.ts`,
        `import type { Setting } from "@storyteller/types/v2/setting.ts";
export const royal_capital: Setting = ${JSON.stringify(setting1, null, 2)};`,
      );

      await Deno.writeTextFile(
        `${settingsDir}/dark_forest.ts`,
        `import type { Setting } from "@storyteller/types/v2/setting.ts";
export const dark_forest: Setting = ${JSON.stringify(setting2, null, 2)};`,
      );

      const command = new ViewSettingCommand();
      const context = createMockContext({
        args: {
          list: true,
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { settings: Setting[] };
        assertExists(value.settings);
        assertEquals(value.settings.length, 2);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--idで特定の設定を表示すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const settingsDir = `${tempDir}/src/settings`;
      await Deno.mkdir(settingsDir, { recursive: true });

      const setting: Setting = {
        id: "royal_capital",
        name: "王都",
        type: "location",
        appearingChapters: ["chapter_01", "chapter_05"],
        summary: "王国の首都。壮大な城と活気ある市場がある。",
        displayNames: ["首都", "王都城"],
        relatedSettings: ["throne_room"],
      };

      await Deno.writeTextFile(
        `${settingsDir}/royal_capital.ts`,
        `import type { Setting } from "@storyteller/types/v2/setting.ts";
export const royal_capital: Setting = ${JSON.stringify(setting, null, 2)};`,
      );

      const command = new ViewSettingCommand();
      const context = createMockContext({
        args: {
          id: "royal_capital",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { setting: Setting };
        assertExists(value.setting);
        assertEquals(value.setting.id, "royal_capital");
        assertEquals(value.setting.name, "王都");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--detailsでファイル参照が解決されること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const settingsDir = `${tempDir}/src/settings`;
      const detailsDir = `${tempDir}/details`;
      await Deno.mkdir(settingsDir, { recursive: true });
      await Deno.mkdir(detailsDir, { recursive: true });

      // 詳細ファイルを作成
      await Deno.writeTextFile(
        `${detailsDir}/royal_capital_history.md`,
        `---
title: 王都の歴史
---

王都は500年前に建国された。
`,
      );

      const setting: Setting = {
        id: "royal_capital",
        name: "王都",
        type: "location",
        appearingChapters: ["chapter_01"],
        summary: "王国の首都",
        details: {
          description: "壮大な城と市場がある首都",
          history: { file: "details/royal_capital_history.md" },
        },
      };

      await Deno.writeTextFile(
        `${settingsDir}/royal_capital.ts`,
        `import type { Setting } from "@storyteller/types/v2/setting.ts";
export const royal_capital: Setting = ${JSON.stringify(setting, null, 2)};`,
      );

      const command = new ViewSettingCommand();
      const context = createMockContext({
        args: {
          id: "royal_capital",
          details: true,
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as {
          setting: Setting;
          resolvedDetails?: Record<string, string | undefined>;
        };
        assertExists(value.setting);
        assertExists(value.resolvedDetails);
        // ファイル参照が解決されてテキストになっている
        assertEquals(
          value.resolvedDetails.history,
          "王都は500年前に建国された。",
        );
        // インライン値はそのまま
        assertEquals(
          value.resolvedDetails.description,
          "壮大な城と市場がある首都",
        );
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("--jsonでJSON形式出力すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const settingsDir = `${tempDir}/src/settings`;
      await Deno.mkdir(settingsDir, { recursive: true });

      const setting: Setting = {
        id: "royal_capital",
        name: "王都",
        type: "location",
        appearingChapters: ["chapter_01"],
        summary: "王国の首都",
      };

      await Deno.writeTextFile(
        `${settingsDir}/royal_capital.ts`,
        `import type { Setting } from "@storyteller/types/v2/setting.ts";
export const royal_capital: Setting = ${JSON.stringify(setting, null, 2)};`,
      );

      const command = new ViewSettingCommand();
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

  await t.step("--idと--jsonで特定設定をJSON形式出力すること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const settingsDir = `${tempDir}/src/settings`;
      await Deno.mkdir(settingsDir, { recursive: true });

      const setting: Setting = {
        id: "royal_capital",
        name: "王都",
        type: "location",
        appearingChapters: ["chapter_01"],
        summary: "王国の首都",
      };

      await Deno.writeTextFile(
        `${settingsDir}/royal_capital.ts`,
        `import type { Setting } from "@storyteller/types/v2/setting.ts";
export const royal_capital: Setting = ${JSON.stringify(setting, null, 2)};`,
      );

      const command = new ViewSettingCommand();
      const context = createMockContext({
        args: {
          id: "royal_capital",
          json: true,
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { setting: Setting };
        assertExists(value.setting);
        assertEquals(value.setting.id, "royal_capital");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("存在しないIDでエラーを返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const settingsDir = `${tempDir}/src/settings`;
      await Deno.mkdir(settingsDir, { recursive: true });

      const command = new ViewSettingCommand();
      const context = createMockContext({
        args: {
          id: "nonexistent",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, false);

      if (!result.ok) {
        assertEquals(result.error.code, "setting_not_found");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("オプションなしでヘルプを表示すること", async () => {
    const command = new ViewSettingCommand();
    const context = createMockContext({});

    const result = await command.execute(context);
    assertEquals(result.ok, true);
  });

  await t.step("--typeでフィルタできること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const settingsDir = `${tempDir}/src/settings`;
      await Deno.mkdir(settingsDir, { recursive: true });

      const location: Setting = {
        id: "royal_capital",
        name: "王都",
        type: "location",
        appearingChapters: ["chapter_01"],
        summary: "王国の首都",
      };

      const organization: Setting = {
        id: "knights_order",
        name: "騎士団",
        type: "organization",
        appearingChapters: ["chapter_02"],
        summary: "王国を守護する騎士団",
      };

      await Deno.writeTextFile(
        `${settingsDir}/royal_capital.ts`,
        `import type { Setting } from "@storyteller/types/v2/setting.ts";
export const royal_capital: Setting = ${JSON.stringify(location, null, 2)};`,
      );

      await Deno.writeTextFile(
        `${settingsDir}/knights_order.ts`,
        `import type { Setting } from "@storyteller/types/v2/setting.ts";
export const knights_order: Setting = ${
          JSON.stringify(organization, null, 2)
        };`,
      );

      const command = new ViewSettingCommand();
      const context = createMockContext({
        args: {
          list: true,
          type: "location",
          projectRoot: tempDir,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      if (result.ok) {
        const value = result.value as { settings: Setting[] };
        assertExists(value.settings);
        assertEquals(value.settings.length, 1);
        assertEquals(value.settings[0].id, "royal_capital");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test("DefaultSettingLoader", async (t) => {
  await t.step("設定ファイルを正しく読み込めること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const settingsDir = `${tempDir}/src/settings`;
      await Deno.mkdir(settingsDir, { recursive: true });

      const setting: Setting = {
        id: "royal_capital",
        name: "王都",
        type: "location",
        appearingChapters: ["chapter_01"],
        summary: "王国の首都",
      };

      await Deno.writeTextFile(
        `${settingsDir}/royal_capital.ts`,
        `import type { Setting } from "@storyteller/types/v2/setting.ts";
export const royal_capital: Setting = ${JSON.stringify(setting, null, 2)};`,
      );

      const loader = new DefaultSettingLoader(tempDir);
      const loadedSettings = await loader.loadAllSettings();

      assertEquals(loadedSettings.length, 1);
      assertEquals(loadedSettings[0].id, "royal_capital");
      assertEquals(loadedSettings[0].name, "王都");
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("特定の設定を読み込めること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const settingsDir = `${tempDir}/src/settings`;
      await Deno.mkdir(settingsDir, { recursive: true });

      const setting: Setting = {
        id: "royal_capital",
        name: "王都",
        type: "location",
        appearingChapters: ["chapter_01"],
        summary: "王国の首都",
      };

      await Deno.writeTextFile(
        `${settingsDir}/royal_capital.ts`,
        `import type { Setting } from "@storyteller/types/v2/setting.ts";
export const royal_capital: Setting = ${JSON.stringify(setting, null, 2)};`,
      );

      const loader = new DefaultSettingLoader(tempDir);
      const loadedSetting = await loader.loadSetting("royal_capital");

      assertExists(loadedSetting);
      assertEquals(loadedSetting.id, "royal_capital");
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("存在しない設定はnullを返すこと", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const settingsDir = `${tempDir}/src/settings`;
      await Deno.mkdir(settingsDir, { recursive: true });

      const loader = new DefaultSettingLoader(tempDir);
      const loadedSetting = await loader.loadSetting("nonexistent");

      assertEquals(loadedSetting, null);
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
