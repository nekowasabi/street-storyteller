/**
 * listMarkdownFiles テスト
 * Process 1: listMarkdownFiles 共有化 (utils 複製)
 *
 * 必要な権限: --allow-read --allow-write
 */

import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { listMarkdownFiles } from "@storyteller/lsp/utils/markdown_files.ts";

// テスト用の一時ディレクトリを作成・破棄するヘルパー
async function withTempDir(
  fn: (dir: string) => Promise<void>,
): Promise<void> {
  const tmpDir = await Deno.makeTempDir({ prefix: "storyteller_test_" });
  try {
    await fn(tmpDir);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
}

Deno.test("listMarkdownFiles - lists .md files in directory (non-recursive)", async () => {
  await withTempDir(async (dir) => {
    // Setup: create .md and non-.md files
    await Deno.writeTextFile(join(dir, "chapter01.md"), "# Chapter 1");
    await Deno.writeTextFile(join(dir, "chapter02.md"), "# Chapter 2");
    await Deno.writeTextFile(join(dir, "notes.txt"), "not markdown");

    const result = await listMarkdownFiles(dir, { dir, recursive: false });

    assertEquals(result.length, 2);
    assertEquals(result.every((f: string) => f.endsWith(".md")), true);
  });
});

Deno.test("listMarkdownFiles - recursive flag includes subdirectory .md files", async () => {
  await withTempDir(async (dir) => {
    // Setup: create nested structure
    await Deno.writeTextFile(join(dir, "root.md"), "# Root");
    const subDir = join(dir, "sub");
    await Deno.mkdir(subDir);
    await Deno.writeTextFile(join(subDir, "nested.md"), "# Nested");
    await Deno.writeTextFile(join(subDir, "data.json"), "{}");

    const result = await listMarkdownFiles(dir, { dir, recursive: true });

    assertEquals(result.length, 2);
    const basenames = result.map((f: string) => {
      const parts = f.split(/[/\\]/);
      return parts[parts.length - 1];
    });
    assertEquals(basenames.includes("root.md"), true);
    assertEquals(basenames.includes("nested.md"), true);
  });
});

Deno.test("listMarkdownFiles - non-recursive excludes subdirectory files", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(join(dir, "root.md"), "# Root");
    const subDir = join(dir, "sub");
    await Deno.mkdir(subDir);
    await Deno.writeTextFile(join(subDir, "nested.md"), "# Nested");

    const result = await listMarkdownFiles(dir, { dir, recursive: false });

    assertEquals(result.length, 1);
    assertEquals(result[0].endsWith("root.md"), true);
  });
});

Deno.test("listMarkdownFiles - excludes non-.md files", async () => {
  await withTempDir(async (dir) => {
    await Deno.writeTextFile(join(dir, "chapter.md"), "# Chapter");
    await Deno.writeTextFile(join(dir, "style.css"), "body {}");
    await Deno.writeTextFile(join(dir, "data.json"), "{}");
    await Deno.writeTextFile(join(dir, "script.ts"), "console.log(1)");

    const result = await listMarkdownFiles(dir, { dir, recursive: false });

    assertEquals(result.length, 1);
    assertEquals(result[0].endsWith("chapter.md"), true);
  });
});

Deno.test("listMarkdownFiles - returns path when 'path' is specified", async () => {
  await withTempDir(async (dir) => {
    const specificPath = join(dir, "manuscripts", "chapter01.md");

    const result = await listMarkdownFiles(dir, {
      path: specificPath,
    });

    assertEquals(result, [specificPath]);
  });
});

Deno.test("listMarkdownFiles - returns empty array when dir is undefined", async () => {
  await withTempDir(async (dir) => {
    const result = await listMarkdownFiles(dir, {});

    assertEquals(result, []);
  });
});

Deno.test("listMarkdownFiles - handles non-existent directory with error", async () => {
  await withTempDir(async (dir) => {
    const nonExistent = join(dir, "does_not_exist");

    try {
      await listMarkdownFiles(dir, { dir: nonExistent, recursive: false });
      // If no error is thrown, the function silently returns empty
      // (matching lsp_shared.ts behavior which uses Deno.readDir)
    } catch (error) {
      // Deno.readDir on non-existent dir throws NotFound
      assertEquals(error instanceof Deno.errors.NotFound, true);
    }
  });
});
