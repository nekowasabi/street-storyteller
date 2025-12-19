/**
 * LSP Command Group テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assert, assertEquals, createStubLogger } from "../asserts.ts";
import { createLspDescriptor } from "@storyteller/cli/modules/lsp/index.ts";
import {
  createCommandRegistry,
  registerCommandDescriptor,
} from "@storyteller/cli/command_registry.ts";
import type {
  CommandContext,
  CommandDescriptor,
} from "@storyteller/cli/types.ts";

Deno.test("LSPコマンドグループ - 基本構造", async (t) => {
  await t.step("createLspDescriptor関数が存在する", () => {
    assert(
      typeof createLspDescriptor === "function",
      "createLspDescriptorは関数であるべき",
    );
  });

  await t.step("lspコマンドグループが正しく作成される", () => {
    const registry = createCommandRegistry();
    const descriptor = createLspDescriptor(registry);

    assertEquals(descriptor.name, "lsp");
    assertEquals(JSON.stringify(descriptor.path), JSON.stringify(["lsp"]));
  });

  await t.step("サブコマンドが正しく含まれている", () => {
    const registry = createCommandRegistry();
    const descriptor = createLspDescriptor(registry);

    assert(descriptor.children, "childrenが存在すべき");
    const childNames = descriptor.children?.map((c: CommandDescriptor) =>
      c.name
    ) ?? [];
    assert(childNames.includes("start"), "startサブコマンドが含まれるべき");
    assert(childNames.includes("install"), "installサブコマンドが含まれるべき");
  });
});

Deno.test("LSPコマンドグループ - コマンド解決", async (t) => {
  await t.step("storyteller lsp でヘルプが表示される", async () => {
    const registry = createCommandRegistry();
    const descriptor = createLspDescriptor(registry);
    registerCommandDescriptor(registry, descriptor);

    // 'lsp' コマンドを解決
    const resolved = registry.resolve(["lsp"]);
    assert(resolved, "lspコマンドが解決されるべき");

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
      args: {},
      config: undefined as never,
    };

    // ハンドラーを実行
    await resolved.execute(context);
    // ヘルプメッセージが表示されるか確認
    assert(messages.length > 0, "ヘルプメッセージが表示されるべき");
  });

  await t.step("storyteller lsp start --stdio が解決される", () => {
    const registry = createCommandRegistry();
    const descriptor = createLspDescriptor(registry);
    registerCommandDescriptor(registry, descriptor);

    // 'lsp start' を解決
    const resolved = registry.resolve(["lsp", "start"]);
    assert(resolved, "lsp startコマンドが解決されるべき");
    assertEquals(resolved.name, "start");
  });

  await t.step("storyteller lsp install nvim が解決される", () => {
    const registry = createCommandRegistry();
    const descriptor = createLspDescriptor(registry);
    registerCommandDescriptor(registry, descriptor);

    // 'lsp install' を解決
    const resolved = registry.resolve(["lsp", "install"]);
    assert(resolved, "lsp installコマンドが解決されるべき");
    assertEquals(resolved.name, "install");
  });
});

Deno.test("LSPコマンドグループ - ヘルプ日本語化", async (t) => {
  await t.step("サマリーが設定されている", () => {
    const registry = createCommandRegistry();
    const descriptor = createLspDescriptor(registry);

    assert(descriptor.summary, "summaryが設定されているべき");
    assert(descriptor.summary.length > 0, "summaryが空でないべき");
  });
});

Deno.test("LSPコマンドグループ - ヘルプエラー時のフォールバック", async () => {
  // Create a fresh registry without registering the lsp descriptor itself
  // This will cause renderHelp to return an error since 'lsp' is not in snapshot
  const registry = createCommandRegistry();
  const descriptor = createLspDescriptor(registry);

  // Do NOT register the descriptor - this simulates the scenario where
  // renderHelp cannot find the command path

  const logger = createStubLogger();
  const errors: string[] = [];
  const infos: string[] = [];
  const presenter = {
    showInfo: (msg: string) => infos.push(msg),
    showSuccess: () => {},
    showWarning: () => {},
    showError: (msg: string) => errors.push(msg),
  };

  const context: CommandContext = {
    logger,
    presenter,
    args: {},
    config: undefined as never,
  };

  // Execute via handler.execute (since CommandDescriptor has handler)
  await descriptor.handler.execute(context);

  // Verify error + fallback shown
  assert(errors.length > 0, "エラーメッセージが表示されるべき");
  assert(infos.length > 0, "フォールバックメッセージが表示されるべき");
});
