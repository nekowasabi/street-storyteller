/**
 * rag export コマンドテスト
 * Process 11: rag export コマンド
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  parseRagExportOptions,
  ragExportCommandDescriptor,
} from "@storyteller/cli/modules/rag/export.ts";

Deno.test("parseRagExportOptions - デフォルト値", () => {
  const options = parseRagExportOptions({});

  assertEquals(options.outputDir, ".rag-docs");
  assertEquals(options.manuscriptFormat, "full");
  assertEquals(options.chunking.strategy, "auto");
  assertEquals(options.incremental, false);
});

Deno.test("parseRagExportOptions - カスタム出力ディレクトリ", () => {
  const options = parseRagExportOptions({
    output: "custom-rag-docs",
  });

  assertEquals(options.outputDir, "custom-rag-docs");
});

Deno.test("parseRagExportOptions - 原稿フォーマット指定", () => {
  const options = parseRagExportOptions({
    "manuscript-format": "summary",
  });

  assertEquals(options.manuscriptFormat, "summary");
});

Deno.test("parseRagExportOptions - チャンキング戦略指定", () => {
  const strategies = ["document", "scene", "auto"] as const;

  for (const strategy of strategies) {
    const options = parseRagExportOptions({
      chunking: strategy,
    });
    assertEquals(options.chunking.strategy, strategy);
  }
});

Deno.test("parseRagExportOptions - インクリメンタルモード", () => {
  const options = parseRagExportOptions({
    incremental: true,
  });

  assertEquals(options.incremental, true);
});

Deno.test("parseRagExportOptions - 全オプション指定", () => {
  const options = parseRagExportOptions({
    output: "my-rag-docs",
    "manuscript-format": "summary",
    chunking: "scene",
    incremental: true,
  });

  assertEquals(options.outputDir, "my-rag-docs");
  assertEquals(options.manuscriptFormat, "summary");
  assertEquals(options.chunking.strategy, "scene");
  assertEquals(options.incremental, true);
});

Deno.test("ragExportCommandDescriptor - 構造確認", () => {
  assertExists(ragExportCommandDescriptor.summary);
  assertExists(ragExportCommandDescriptor.usage);
  assertExists(ragExportCommandDescriptor.options);

  // オプション存在確認
  const optionNames = ragExportCommandDescriptor.options.map((o) => o.name);
  assertEquals(optionNames.includes("output"), true);
  assertEquals(optionNames.includes("manuscript-format"), true);
  assertEquals(optionNames.includes("chunking"), true);
  assertEquals(optionNames.includes("incremental"), true);
  assertEquals(optionNames.includes("json"), true);
});
