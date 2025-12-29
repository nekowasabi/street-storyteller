/**
 * rag install-hooks コマンドテスト
 * Process 50: 自動更新システム
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  generatePostCommitHook,
  parseInstallHooksOptions,
  RAG_INSTALL_HOOKS_OPTIONS,
} from "@storyteller/cli/modules/rag/install_hooks.ts";

Deno.test("RAG_INSTALL_HOOKS_OPTIONS - オプション定義が正しい", () => {
  const optionNames = RAG_INSTALL_HOOKS_OPTIONS.map((o) => o.name);

  assertEquals(optionNames.includes("force"), true);
  assertEquals(optionNames.includes("hook"), true);
});

Deno.test("parseInstallHooksOptions - デフォルト値", () => {
  const options = parseInstallHooksOptions({});

  assertEquals(options.force, false);
  assertEquals(options.hookType, "post-commit");
});

Deno.test("parseInstallHooksOptions - カスタム値", () => {
  const options = parseInstallHooksOptions({
    force: true,
    hook: "pre-push",
  });

  assertEquals(options.force, true);
  assertEquals(options.hookType, "pre-push");
});

Deno.test("generatePostCommitHook - 基本的なフック生成", () => {
  const hook = generatePostCommitHook();

  // shebangがあること
  assertStringIncludes(hook, "#!/bin/bash");

  // storytellerコマンドが含まれること
  assertStringIncludes(hook, "storyteller rag");

  // インクリメンタルオプションがあること
  assertStringIncludes(hook, "--incremental");

  // エラーハンドリングがあること
  assertStringIncludes(hook, "set -e");
});

Deno.test("generatePostCommitHook - src/やmanuscripts/のパターン検出", () => {
  const hook = generatePostCommitHook();

  // 変更ファイルの検出パターンがあること
  assertStringIncludes(hook, "src/");
  assertStringIncludes(hook, "manuscripts/");
});
