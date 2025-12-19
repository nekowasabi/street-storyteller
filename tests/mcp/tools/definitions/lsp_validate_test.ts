/**
 * lsp_validateツールのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { lspValidateTool } from "@storyteller/mcp/tools/definitions/lsp_validate.ts";

Deno.test("lspValidateTool: ツール定義がMCP仕様に準拠している", () => {
  assertExists(lspValidateTool);
  assertEquals(lspValidateTool.name, "lsp_validate");
  assertExists(lspValidateTool.inputSchema);
  assertExists(lspValidateTool.execute);
});

Deno.test("lspValidateTool: ファイルパスで診断実行できる", async () => {
  const projectRoot = await Deno.makeTempDir();
  await Deno.mkdir(join(projectRoot, "src/characters"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "manuscripts"), { recursive: true });

  await Deno.writeTextFile(
    join(projectRoot, "src/characters/hero.ts"),
    `export const hero = { id: "hero", name: "勇者", aliases: ["勇"] };`,
  );
  await Deno.writeTextFile(
    join(projectRoot, "manuscripts/chapter01.md"),
    "勇は歩いた。",
  );

  const result = await lspValidateTool.execute({
    projectRoot,
    path: "manuscripts/chapter01.md",
  });

  assertEquals(result.isError, false);
  const text = (result.content[0] as { type: "text"; text: string }).text;
  const diagnostics = JSON.parse(text) as unknown[];
  assertEquals(Array.isArray(diagnostics), true);
  // aliases(0.8) は低信頼度診断になるはず
  assertEquals(diagnostics.length > 0, true);
});

Deno.test("lspValidateTool: ファイル不在時にエラーを返す", async () => {
  const projectRoot = await Deno.makeTempDir();
  const result = await lspValidateTool.execute({
    projectRoot,
    path: "manuscripts/not-found.md",
  });
  assertEquals(result.isError, true);
});

Deno.test("lspValidateTool: ディレクトリ指定で複数ファイル診断できる", async () => {
  const projectRoot = await Deno.makeTempDir();
  await Deno.mkdir(join(projectRoot, "src/characters"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "manuscripts/sub"), { recursive: true });

  await Deno.writeTextFile(
    join(projectRoot, "src/characters/hero.ts"),
    `export const hero = { id: "hero", name: "勇者", aliases: ["勇"] };`,
  );
  await Deno.writeTextFile(
    join(projectRoot, "manuscripts/a.md"),
    "勇は歩いた。",
  );
  await Deno.writeTextFile(
    join(projectRoot, "manuscripts/sub/b.md"),
    "勇は走った。",
  );

  const result = await lspValidateTool.execute({
    projectRoot,
    dir: "manuscripts",
    recursive: true,
  });

  assertEquals(result.isError, false);
  const text = (result.content[0] as { type: "text"; text: string }).text;
  const perFile = JSON.parse(text) as Array<
    { path: string; diagnostics: unknown[] }
  >;
  assertEquals(Array.isArray(perFile), true);
  assertEquals(perFile.length >= 2, true);
});
