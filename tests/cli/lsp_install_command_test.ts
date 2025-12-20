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

Deno.test("LspInstallCommand - パスオプション", async (t) => {
  await t.step("--path オプションでカスタムパスが設定に含まれる", async () => {
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
      args: {
        extra: "nvim",
        path: "/custom/path/to/storyteller",
        "dry-run": true,
      },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok, "--path オプションで成功すべき");
    const output = messages.join("\n");
    assert(
      output.includes("/custom/path/to/storyteller"),
      "カスタムパスが設定に含まれるべき",
    );
  });

  await t.step(
    "--detect-path オプションで自動検出パスが使用される",
    async () => {
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
        args: { extra: "nvim", "detect-path": true, "dry-run": true },
        config: undefined as never,
      };

      const result = await command.execute(context);
      assert(result.ok, "--detect-path オプションで成功すべき");
      const output = messages.join("\n");
      // 自動検出されたパスが含まれている（storyteller または deno run を含む）
      assert(
        output.includes("storyteller") || output.includes("deno run"),
        "自動検出パスが設定に含まれるべき",
      );
    },
  );

  await t.step(
    "--path と --detect-path 両方指定時は --path が優先される",
    async () => {
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
        args: {
          extra: "nvim",
          path: "/explicit/path/storyteller",
          "detect-path": true,
          "dry-run": true,
        },
        config: undefined as never,
      };

      const result = await command.execute(context);
      assert(result.ok, "両方のオプション指定で成功すべき");
      const output = messages.join("\n");
      assert(
        output.includes("/explicit/path/storyteller"),
        "--path が優先されるべき",
      );
    },
  );

  await t.step("vscode設定にもカスタムパスが正しく出力される", async () => {
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
      args: { extra: "vscode", path: "/my/storyteller", "dry-run": true },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok, "vscode + --path オプションで成功すべき");
    const output = messages.join("\n");
    assert(
      output.includes('"/my/storyteller"'),
      "VSCode設定にカスタムパスが含まれるべき",
    );
  });

  await t.step("デフォルトでは 'storyteller' が使用される", async () => {
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
    assert(result.ok, "デフォルトで成功すべき");
    const output = messages.join("\n");
    assert(
      output.includes("'storyteller', 'lsp', 'start'"),
      "デフォルトでは 'storyteller' が使用されるべき",
    );
  });
});
