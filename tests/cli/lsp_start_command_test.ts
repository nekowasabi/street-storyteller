/**
 * LSP Start Command テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import {
  assert,
  assertEquals,
  createStubLogger,
  createStubPresenter,
} from "../asserts.ts";
import { LspStartCommand } from "../../src/cli/modules/lsp/start.ts";
import { BaseCliCommand } from "../../src/cli/base_command.ts";
import type { CommandContext } from "../../src/cli/types.ts";

Deno.test("LspStartCommand - 基本構造", async (t) => {
  await t.step("LspStartCommandはBaseCliCommandを継承している", () => {
    const command = new LspStartCommand();
    assert(
      command instanceof BaseCliCommand,
      "LspStartCommandはBaseCliCommandを継承すべき",
    );
  });

  await t.step("name = 'start' である", () => {
    const command = new LspStartCommand();
    assertEquals(command.name, "start");
  });

  await t.step("path = ['lsp', 'start'] である", () => {
    const command = new LspStartCommand();
    assertEquals(
      JSON.stringify(command.path),
      JSON.stringify(["lsp", "start"]),
    );
  });
});

Deno.test("LspStartCommand - オプション解析", async (t) => {
  await t.step("--stdio オプションを受け付ける", async () => {
    const command = new LspStartCommand();
    const logger = createStubLogger();
    const presenter = createStubPresenter();

    // LspServerのモックを使用してサーバー起動をシミュレート
    const context: CommandContext = {
      logger,
      presenter,
      args: { stdio: true, "dry-run": true },
      config: undefined as never,
    };

    const result = await command.execute(context);
    // dry-runモードでは成功を返す
    assert(result.ok, "dry-runモードでは成功すべき");
  });

  await t.step("--path オプションでプロジェクトパスを指定できる", async () => {
    const command = new LspStartCommand();
    const logger = createStubLogger();
    const presenter = createStubPresenter();

    const context: CommandContext = {
      logger,
      presenter,
      args: { stdio: true, path: "/tmp/test-project", "dry-run": true },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok, "pathオプション指定時も成功すべき");
  });

  await t.step("--help オプションでヘルプを表示する", async () => {
    const command = new LspStartCommand();
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
      messages.some((m) => m.includes("--stdio")),
      "ヘルプには--stdioオプションが含まれるべき",
    );
  });
});

Deno.test("LspStartCommand - エラーハンドリング", async (t) => {
  await t.step("--stdio なしではエラーを返す", async () => {
    const command = new LspStartCommand();
    const logger = createStubLogger();
    const presenter = createStubPresenter();

    const context: CommandContext = {
      logger,
      presenter,
      args: {},
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(!result.ok, "--stdioオプションなしではエラーを返すべき");
  });
});

Deno.test("LspStartCommand - non-dry-run execution with injected starter", async (t) => {
  await t.step("injecting starter avoids blocking server start", async () => {
    let started: { projectRoot: string; entitiesCount: number } | undefined;
    const command = new LspStartCommand({
      loadEntities: async (_root: string) => [],
      starter: async ({ projectRoot, entities }) => {
        started = { projectRoot, entitiesCount: entities.length };
      },
    });

    const logger = createStubLogger();
    const presenter = createStubPresenter();

    const context: CommandContext = {
      logger,
      presenter,
      args: { stdio: true, path: "/tmp/test-project" },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok);
    assert(started !== undefined);
    assertEquals(started?.projectRoot, "/tmp/test-project");
    assertEquals(started?.entitiesCount, 0);
  });

  await t.step("starter errors are wrapped as lsp_start_failed", async () => {
    const command = new LspStartCommand({
      loadEntities: async (_root: string) => [],
      starter: async () => {
        throw new Error("fail");
      },
    });

    const logger = createStubLogger();
    const presenter = createStubPresenter();
    const context: CommandContext = {
      logger,
      presenter,
      args: { stdio: true, path: "/tmp/test-project" },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(!result.ok);
    if (!result.ok) {
      assertEquals(result.error.code, "lsp_start_failed");
    }
  });

  await t.step(
    "default starter can run with injected stdio that immediately closes",
    async () => {
      const command = new LspStartCommand({
        loadEntities: async (_root: string) => [],
        stdinReader: { read: async () => null },
        stdoutWriter: { write: async (p: Uint8Array) => p.length },
      });

      const logger = createStubLogger();
      const presenter = createStubPresenter();
      const context: CommandContext = {
        logger,
        presenter,
        args: { stdio: true, path: "/tmp/test-project" },
        config: undefined as never,
      };

      const result = await command.execute(context);
      assert(result.ok);
    },
  );
});
