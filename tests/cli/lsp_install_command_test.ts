/**
 * LSP Install Command テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import {
  assert,
  assertEquals,
  createStubLogger,
  createStubPresenter,
} from "../asserts.ts";
import { LspInstallCommand } from "@storyteller/cli/modules/lsp/install.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import type { CommandContext } from "@storyteller/cli/types.ts";

Deno.test("LspInstallCommand - 基本構造", async (t) => {
  await t.step("LspInstallCommandはBaseCliCommandを継承している", () => {
    const command = new LspInstallCommand();
    assert(
      command instanceof BaseCliCommand,
      "LspInstallCommandはBaseCliCommandを継承すべき",
    );
  });

  await t.step("name = 'install' である", () => {
    const command = new LspInstallCommand();
    assertEquals(command.name, "install");
  });

  await t.step("path = ['lsp', 'install'] である", () => {
    const command = new LspInstallCommand();
    assertEquals(
      JSON.stringify(command.path),
      JSON.stringify(["lsp", "install"]),
    );
  });
});

Deno.test("LspInstallCommand - nvim設定生成", async (t) => {
  await t.step("nvim引数を受け付ける", async () => {
    const command = new LspInstallCommand();
    const logger = createStubLogger();
    const messages: string[] = [];
    const presenter = {
      showInfo: (msg: string) => messages.push(msg),
      showSuccess: () => {},
      showWarning: () => {},
      showError: () => {},
    };

    const context: CommandContext = {
      logger,
      presenter,
      args: { extra: "nvim", "dry-run": true },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok, "nvim引数で成功すべき");
    assert(
      messages.some((m) => m.includes("nvim-lspconfig")),
      "Lua設定が表示されるべき",
    );
  });

  await t.step("neovim用Lua設定テンプレートを生成する", async () => {
    const command = new LspInstallCommand();
    const logger = createStubLogger();
    const messages: string[] = [];
    const presenter = {
      showInfo: (msg: string) => messages.push(msg),
      showSuccess: () => {},
      showWarning: () => {},
      showError: () => {},
    };

    const context: CommandContext = {
      logger,
      presenter,
      args: { extra: "nvim", "dry-run": true },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok);
    const output = messages.join("\n");
    assert(output.includes("storyteller"), "設定にstorytellerが含まれるべき");
    assert(output.includes("lsp"), "設定にlspが含まれるべき");
  });

  await t.step("--output オプションで出力先を指定できる", async () => {
    const command = new LspInstallCommand();
    const logger = createStubLogger();
    const presenter = createStubPresenter();

    // 一時ファイルを使用
    const tmpDir = await Deno.makeTempDir();
    const outputPath = `${tmpDir}/storyteller-lsp.lua`;

    const context: CommandContext = {
      logger,
      presenter,
      args: { extra: "nvim", output: outputPath },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok, "ファイル出力で成功すべき");

    // ファイルが作成されたか確認
    const content = await Deno.readTextFile(outputPath);
    assert(content.includes("storyteller"), "出力ファイルに設定が含まれるべき");

    // クリーンアップ
    await Deno.remove(tmpDir, { recursive: true });
  });
});

Deno.test("LspInstallCommand - エラーハンドリング", async (t) => {
  await t.step("引数なしではエラーを返す", async () => {
    const command = new LspInstallCommand();
    const logger = createStubLogger();
    const presenter = createStubPresenter();

    const context: CommandContext = {
      logger,
      presenter,
      args: {},
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(!result.ok, "引数なしではエラーを返すべき");
  });

  await t.step("未対応のエディタではエラーを返す", async () => {
    const command = new LspInstallCommand();
    const logger = createStubLogger();
    const presenter = createStubPresenter();

    const context: CommandContext = {
      logger,
      presenter,
      args: { extra: "unknown-editor" },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(!result.ok, "未対応エディタではエラーを返すべき");
  });

  await t.step("--help オプションでヘルプを表示する", async () => {
    const command = new LspInstallCommand();
    const logger = createStubLogger();
    const messages: string[] = [];
    const presenter = {
      showInfo: (msg: string) => messages.push(msg),
      showSuccess: () => {},
      showWarning: () => {},
      showError: () => {},
    };

    const context: CommandContext = {
      logger,
      presenter,
      args: { help: true },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok, "helpオプションでは成功すべき");
    assert(messages.length > 0, "ヘルプメッセージが表示されるべき");
    assert(
      messages.some((m) => m.includes("nvim")),
      "ヘルプにはnvimが含まれるべき",
    );
  });
});
