/**
 * CLIアダプターのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  createMockContext,
  executeCliCommand,
} from "../../../src/mcp/tools/cli_adapter.ts";
import type { CommandHandler } from "../../../src/cli/types.ts";
import { err, ok } from "../../../src/shared/result.ts";

/**
 * テスト用の成功するコマンドハンドラー
 */
const successHandler: CommandHandler = {
  name: "success_command",
  execute: async (context) => {
    context.presenter.showSuccess("Command executed successfully");
    return ok({ status: "done" });
  },
};

/**
 * テスト用のエラーを返すコマンドハンドラー
 */
const errorHandler: CommandHandler = {
  name: "error_command",
  execute: async (_context) => {
    return err({
      code: "test_error",
      message: "Test error message",
    });
  },
};

/**
 * テスト用の引数を使用するコマンドハンドラー
 */
const argsHandler: CommandHandler = {
  name: "args_command",
  execute: async (context) => {
    const args = context.args ?? {};
    context.presenter.showInfo(`Path: ${args.path}`);
    return ok({ path: args.path });
  },
};

Deno.test("createMockContext: CommandContextを正しく生成する", () => {
  const args = { path: "test.md", verbose: true };
  const context = createMockContext(args);

  assertExists(context);
  assertExists(context.presenter);
  assertExists(context.config);
  assertExists(context.logger);
  assertEquals(context.args?.path, "test.md");
  assertEquals(context.args?.verbose, true);
});

Deno.test("createMockContext: 引数なしでも動作する", () => {
  const context = createMockContext();

  assertExists(context);
  assertExists(context.presenter);
  assertEquals(context.args, undefined);
});

Deno.test("executeCliCommand: 成功するハンドラーを正しく実行する", async () => {
  const result = await executeCliCommand(successHandler, {});

  assertExists(result);
  assertEquals(result.isError, false);
  assertEquals(result.content.length, 1);
  assertEquals(result.content[0].type, "text");
});

Deno.test("executeCliCommand: エラーを返すハンドラーでエラー結果を返す", async () => {
  const result = await executeCliCommand(errorHandler, {});

  assertExists(result);
  assertEquals(result.isError, true);
  assertEquals(result.content.length, 1);
  const textContent = result.content[0] as { type: "text"; text: string };
  assertEquals(textContent.text.includes("test_error"), true);
});

Deno.test("executeCliCommand: 引数がハンドラーに正しく渡される", async () => {
  const args = { path: "manuscripts/chapter01.md" };
  const result = await executeCliCommand(argsHandler, args);

  assertExists(result);
  assertEquals(result.isError, false);
  const textContent = result.content[0] as { type: "text"; text: string };
  assertEquals(textContent.text.includes("manuscripts/chapter01.md"), true);
});

Deno.test("executeCliCommand: 例外をキャッチしてエラー結果を返す", async () => {
  const throwingHandler: CommandHandler = {
    name: "throwing_command",
    execute: async () => {
      throw new Error("Unexpected error");
    },
  };

  const result = await executeCliCommand(throwingHandler, {});

  assertExists(result);
  assertEquals(result.isError, true);
  const textContent = result.content[0] as { type: "text"; text: string };
  assertEquals(textContent.text.includes("Unexpected error"), true);
});

Deno.test("createMockContext: presenterの出力をキャプチャできる", () => {
  const context = createMockContext({});

  context.presenter.showInfo("Info message");
  context.presenter.showSuccess("Success message");
  context.presenter.showWarning("Warning message");
  context.presenter.showError("Error message");

  // presenterはモックなので、これらの呼び出しがエラーにならないことを確認
  assertExists(context.presenter);
});
