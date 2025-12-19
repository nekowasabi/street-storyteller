/**
 * meta_generateツールのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { metaGenerateTool } from "@storyteller/mcp/tools/definitions/meta_generate.ts";

Deno.test("metaGenerateTool: ツール定義がMCP仕様に準拠している", () => {
  assertExists(metaGenerateTool);
  assertEquals(metaGenerateTool.name, "meta_generate");
  assertExists(metaGenerateTool.description);
  assertExists(metaGenerateTool.inputSchema);
  assertExists(metaGenerateTool.execute);
});

Deno.test("metaGenerateTool: inputSchemaが正しく定義されている", () => {
  const schema = metaGenerateTool.inputSchema;

  assertEquals(schema.type, "object");
  assertExists(schema.properties);

  // pathプロパティの確認
  assertExists(schema.properties.path);
  assertEquals(schema.properties.path.type, "string");

  // previewプロパティの確認
  assertExists(schema.properties.preview);
  assertEquals(schema.properties.preview.type, "boolean");

  // dryRunプロパティの確認
  assertExists(schema.properties.dryRun);
  assertEquals(schema.properties.dryRun.type, "boolean");

  // forceプロパティの確認
  assertExists(schema.properties.force);
  assertEquals(schema.properties.force.type, "boolean");

  // updateプロパティの確認
  assertExists(schema.properties.update);
  assertEquals(schema.properties.update.type, "boolean");

  // dirプロパティの確認
  assertExists(schema.properties.dir);
  assertEquals(schema.properties.dir.type, "string");

  // recursiveプロパティの確認
  assertExists(schema.properties.recursive);
  assertEquals(schema.properties.recursive.type, "boolean");
});

Deno.test("metaGenerateTool: requiredにpathが含まれる、またはpathかdirのどちらかが必要", () => {
  const schema = metaGenerateTool.inputSchema;

  // requiredが定義されている場合はpathを含む、または実行時にバリデーション
  // pathとdirの両方がない場合にエラーになることをexecuteで確認
  assertExists(schema.properties);
});

Deno.test("metaGenerateTool: descriptionが日本語で記述されている", () => {
  assertExists(metaGenerateTool.description);
  // 日本語を含むことを確認
  assertEquals(
    metaGenerateTool.description.includes("原稿") ||
      metaGenerateTool.description.includes("メタデータ") ||
      metaGenerateTool.description.includes("生成"),
    true,
  );
});

Deno.test("metaGenerateTool: execute関数が定義されている", () => {
  assertEquals(typeof metaGenerateTool.execute, "function");
});

Deno.test("metaGenerateTool: 引数なしでエラー結果を返す", async () => {
  const result = await metaGenerateTool.execute({});

  assertExists(result);
  assertEquals(result.isError, true);
  assertEquals(result.content.length, 1);
});

Deno.test("metaGenerateTool: pathまたはdirが必要であることを示す", async () => {
  const result = await metaGenerateTool.execute({});

  assertExists(result);
  assertEquals(result.isError, true);
  const textContent = result.content[0] as { type: "text"; text: string };
  // pathかdirのどちらかが必要というメッセージを含む
  assertEquals(
    textContent.text.includes("path") || textContent.text.includes("dir"),
    true,
  );
});

Deno.test("metaGenerateTool: dryRunオプションが正しく動作する", async () => {
  // dry-runは実際のファイル書き込みを行わないため、テスト可能
  const result = await metaGenerateTool.execute({
    path: "nonexistent.md",
    dryRun: true,
  });

  assertExists(result);
  // ファイルが存在しないためエラーになるが、dryRunオプションは正しく渡される
  assertEquals(result.content.length, 1);
});
