/**
 * テスト: lint install-hooks コマンド
 * Process 30-31: Git hooks実装
 */
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  generatePreCommitHook,
  lintInstallHooksCommandDescriptor,
  lintUninstallHooksCommandDescriptor,
} from "@storyteller/cli/modules/lint/install_hooks.ts";

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
