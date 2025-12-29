/**
 * rag update コマンドテスト
 * Process 50: 自動更新システム
 */
import { assertEquals } from "@std/assert";
import {
  parseRagUpdateOptions,
  RAG_UPDATE_OPTIONS,
} from "@storyteller/cli/modules/rag/update.ts";

Deno.test("RAG_UPDATE_OPTIONS - オプション定義が正しい", () => {
  const optionNames = RAG_UPDATE_OPTIONS.map((o) => o.name);

  assertEquals(optionNames.includes("output"), true);
  assertEquals(optionNames.includes("index-dir"), true);
  assertEquals(optionNames.includes("no-embeddings"), true);
  assertEquals(optionNames.includes("force"), true);
  assertEquals(optionNames.includes("json"), true);
});

Deno.test("parseRagUpdateOptions - デフォルト値", () => {
  const options = parseRagUpdateOptions({});

  assertEquals(options.outputDir, ".rag-docs");
  assertEquals(options.indexDir, ".rag");
  assertEquals(options.noEmbeddings, false);
  assertEquals(options.force, false);
  assertEquals(options.json, false);
});

Deno.test("parseRagUpdateOptions - カスタム値", () => {
  const options = parseRagUpdateOptions({
    output: "custom-docs",
    "index-dir": "custom-index",
    "no-embeddings": true,
    force: true,
    json: true,
  });

  assertEquals(options.outputDir, "custom-docs");
  assertEquals(options.indexDir, "custom-index");
  assertEquals(options.noEmbeddings, true);
  assertEquals(options.force, true);
  assertEquals(options.json, true);
});

Deno.test("parseRagUpdateOptions - 部分的なカスタム値", () => {
  const options = parseRagUpdateOptions({
    force: true,
  });

  assertEquals(options.outputDir, ".rag-docs");
  assertEquals(options.indexDir, ".rag");
  assertEquals(options.noEmbeddings, false);
  assertEquals(options.force, true);
  assertEquals(options.json, false);
});
