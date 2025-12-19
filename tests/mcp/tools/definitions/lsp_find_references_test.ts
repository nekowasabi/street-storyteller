/**
 * lsp_find_referencesツールのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { lspFindReferencesTool } from "@storyteller/mcp/tools/definitions/lsp_find_references.ts";

Deno.test("lspFindReferencesTool: ツール定義がMCP仕様に準拠している", () => {
  assertExists(lspFindReferencesTool);
  assertEquals(lspFindReferencesTool.name, "lsp_find_references");
  assertExists(lspFindReferencesTool.inputSchema);
  assertExists(lspFindReferencesTool.execute);
});

Deno.test("lspFindReferencesTool: キャラクターIDで参照検索できる", async () => {
  const projectRoot = await Deno.makeTempDir();
  await Deno.mkdir(join(projectRoot, "src/characters"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "manuscripts"), { recursive: true });

  await Deno.writeTextFile(
    join(projectRoot, "src/characters/hero.ts"),
    `export const hero = { id: "hero", name: "勇者", aliases: ["勇"] };`,
  );
  await Deno.writeTextFile(
    join(projectRoot, "manuscripts/chapter01.md"),
    "勇は歩いた。\n勇は考えた。",
  );

  const result = await lspFindReferencesTool.execute({
    projectRoot,
    dir: "manuscripts",
    recursive: true,
    characterName: "hero",
  });

  assertEquals(result.isError, false);
  const text = (result.content[0] as { type: "text"; text: string }).text;
  const refs = JSON.parse(text) as Array<
    { filePath: string; line: number; character: number }
  >;
  assertEquals(Array.isArray(refs), true);
  assertEquals(refs.length >= 2, true);
});

Deno.test("lspFindReferencesTool: 参照がない場合に空配列を返す", async () => {
  const projectRoot = await Deno.makeTempDir();
  await Deno.mkdir(join(projectRoot, "src/characters"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "manuscripts"), { recursive: true });

  await Deno.writeTextFile(
    join(projectRoot, "src/characters/hero.ts"),
    `export const hero = { id: "hero", name: "勇者", aliases: ["勇"] };`,
  );
  await Deno.writeTextFile(
    join(projectRoot, "manuscripts/chapter01.md"),
    "誰もいない。",
  );

  const result = await lspFindReferencesTool.execute({
    projectRoot,
    path: "manuscripts/chapter01.md",
    characterName: "hero",
  });

  assertEquals(result.isError, false);
  const text = (result.content[0] as { type: "text"; text: string }).text;
  const refs = JSON.parse(text) as unknown[];
  assertEquals(Array.isArray(refs), true);
  assertEquals(refs.length, 0);
});
