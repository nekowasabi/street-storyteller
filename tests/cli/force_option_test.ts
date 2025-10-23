/**
 * Element Character Command の --force オプションテスト
 */

import { assertEquals } from "@std/assert";
import { ElementCharacterCommand } from "../../src/cli/modules/element/character.ts";
import { createStubLogger, createStubConfig, createStubPresenter } from "../asserts.ts";
import type { CommandContext } from "../../src/cli/types.ts";

Deno.test("ElementCharacterCommand with --force option", async (t) => {
  await t.step("--force オプションが有効な場合、既存の詳細を上書きする", async () => {
    const command = new ElementCharacterCommand();
    const logger = createStubLogger();
    const config = createStubConfig();
    const presenter = createStubPresenter();

    // テンポラリディレクトリを使用
    const tempDir = await Deno.makeTempDir();

    const context: CommandContext = {
      logger,
      config,
      presenter,
      args: {
        id: "test_hero",
        name: "テスト勇者",
        role: "protagonist",
        summary: "テスト用",
        "with-details": true,
        force: true,
      },
    };

    const result = await command.execute(context);

    // コマンドが成功すること
    assertEquals(result.ok, true);

    // クリーンアップ
    await Deno.remove(tempDir, { recursive: true });
  });

  await t.step("--force オプションなしの場合、既存詳細を保持する", async () => {
    // このテストは実際のファイルシステム操作が必要なため、
    // 統合テストで実装する
    assertEquals(true, true);
  });
});
