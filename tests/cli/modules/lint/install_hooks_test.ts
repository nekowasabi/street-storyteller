/**
 * テスト: lint install-hooks コマンド
 * Process 30-31: Git hooks実装
 * CodeRabbit Review修正: execute引数をCommandContext型に変更
 */
import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  generatePreCommitHook,
  lintInstallHooksCommandDescriptor,
  lintUninstallHooksCommandDescriptor,
} from "@storyteller/cli/modules/lint/install_hooks.ts";
import type { CommandContext } from "@storyteller/cli/types.ts";

describe("CLI lint install-hooks", () => {
  it("should have correct name", () => {
    assertEquals(lintInstallHooksCommandDescriptor.name, "install-hooks");
  });

  it("should generate pre-commit hook script", () => {
    const script = generatePreCommitHook({ strict: false });
    assertEquals(script.includes("storyteller lint"), true);
    assertEquals(script.includes("#!/bin/sh"), true);
  });

  it("should generate strict mode script", () => {
    const script = generatePreCommitHook({ strict: true });
    assertEquals(script.includes("exit 1"), true);
  });

  it("should have --strict option", () => {
    const optionNames =
      lintInstallHooksCommandDescriptor.options?.map((o) => o.name) ?? [];
    assertEquals(optionNames.includes("strict"), true);
  });
});

describe("CLI lint uninstall-hooks", () => {
  it("should have correct name", () => {
    assertEquals(lintUninstallHooksCommandDescriptor.name, "uninstall-hooks");
  });
});

describe("CLI lint hooks - CommandContext type conformance", () => {
  it("install-hooks handler should have execute method", () => {
    const handler = lintInstallHooksCommandDescriptor.handler;
    assertExists(handler.execute, "execute method should exist");
    assertEquals(typeof handler.execute, "function");
    // CommandHandler interface requires: execute(context: CommandContext)
  });

  it("uninstall-hooks handler should have execute method", () => {
    const handler = lintUninstallHooksCommandDescriptor.handler;
    assertExists(handler.execute, "execute method should exist");
    assertEquals(typeof handler.execute, "function");
  });

  it("install-hooks handler should conform to CommandHandler interface", () => {
    // Type assertion: if handler conforms to CommandHandler,
    // execute should accept CommandContext parameter
    // This is a compile-time type check
    const _typeCheck: (context: CommandContext) => Promise<unknown> =
      lintInstallHooksCommandDescriptor.handler.execute;
    assertExists(_typeCheck);
  });

  it("uninstall-hooks handler should conform to CommandHandler interface", () => {
    const _typeCheck: (context: CommandContext) => Promise<unknown> =
      lintUninstallHooksCommandDescriptor.handler.execute;
    assertExists(_typeCheck);
  });
});
