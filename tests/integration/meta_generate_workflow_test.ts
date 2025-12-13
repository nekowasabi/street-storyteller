import { assert, assertEquals } from "../asserts.ts";
import { MetaGeneratorService } from "../../src/application/meta/meta_generator_service.ts";

function joinPath(...segments: readonly string[]): string {
  let result = "";
  for (const segment of segments) {
    if (segment.length === 0) continue;
    if (segment.startsWith("/")) {
      result = segment.replace(/\/+$/, "");
      continue;
    }
    if (result.endsWith("/")) {
      result = `${result}${segment.replace(/^\/+/, "")}`;
    } else if (result.length === 0) {
      result = segment.replace(/\/+$/, "");
    } else {
      result = `${result}/${segment.replace(/^\/+/, "")}`;
    }
  }
  return result === "" ? "." : result;
}

async function withTestDir(
  testName: string,
  fn: (testDir: string) => Promise<void>,
) {
  const testDir = joinPath(
    Deno.cwd(),
    "test_output",
    "integration_meta_generate",
    testName,
  );
  await Deno.mkdir(testDir, { recursive: true });
  try {
    await fn(testDir);
  } finally {
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // ignore
    }
  }
}

Deno.test("integration - meta generation workflow writes a .meta.ts file", async () => {
  await withTestDir("basic_workflow", async (projectRoot) => {
    await Deno.mkdir(joinPath(projectRoot, "src/types"), { recursive: true });
    await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "src/settings"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "manuscripts"), { recursive: true });

    await Deno.writeTextFile(
      joinPath(projectRoot, "src/types/chapter.ts"),
      "export type ChapterMeta = { id: string; title: string; order: number; characters: any[]; settings: any[]; validations?: any[]; references?: any; };\n",
    );
    await Deno.writeTextFile(
      joinPath(projectRoot, "src/characters/hero.ts"),
      `export const hero = { id: "hero", name: "勇者", displayNames: ["勇者"] };\n`,
    );
    await Deno.writeTextFile(
      joinPath(projectRoot, "src/settings/kingdom.ts"),
      `export const kingdom = { id: "kingdom", name: "王都", displayNames: ["王都"] };\n`,
    );

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n  characters:\n    - hero\n  settings:\n    - kingdom\n---\n\n勇者は王都にいた。\n`,
    );

    const service = new MetaGeneratorService();
    const result = await service.generateFromMarkdown(markdownPath, {
      projectPath: projectRoot,
      dryRun: false,
      force: true,
    });

    assert(result.ok, "Service should succeed");

    const output = await Deno.readTextFile(
      joinPath(projectRoot, "manuscripts/chapter01.meta.ts"),
    );
    assertEquals(
      output.includes("export const chapter01Meta: ChapterMeta"),
      true,
    );
    assertEquals(output.includes("import { hero }"), true);
    assertEquals(output.includes("import { kingdom }"), true);
  });
});

Deno.test("integration - sample chapter01 generates a compatible meta file (subset match)", async () => {
  const sampleRoot = joinPath(Deno.cwd(), "sample");
  const markdownPath = joinPath(sampleRoot, "manuscripts/chapter01.md");
  const outputPath = joinPath(
    sampleRoot,
    "manuscripts/chapter01.generated.meta.ts",
  );

  try {
    const service = new MetaGeneratorService();
    const result = await service.generateFromMarkdown(markdownPath, {
      projectPath: sampleRoot,
      outputPath,
      dryRun: false,
      force: true,
    });

    assert(result.ok, "Service should succeed");

    const generated = await Deno.readTextFile(outputPath);
    const expected = await Deno.readTextFile(
      joinPath(sampleRoot, "manuscripts/chapter01.meta.ts"),
    );

    // Compare core chapter fields with the sample meta file as reference
    const expectedId = expected.match(/id:\s*"([^"]+)"/)?.[1];
    const expectedTitle = expected.match(/title:\s*"([^"]+)"/)?.[1];
    const expectedOrder = expected.match(/order:\s*(\d+)/)?.[1];

    assertEquals(expectedId, "chapter01");
    assertEquals(expectedTitle, "旅の始まり");
    assertEquals(expectedOrder, "1");

    assertEquals(generated.includes('id: "chapter01"'), true);
    assertEquals(generated.includes('title: "旅の始まり"'), true);
    assertEquals(generated.includes("order: 1"), true);

    // At minimum, ensure the main entities from the sample meta are imported.
    assertEquals(
      generated.includes('import { hero } from "../src/characters/hero.ts";'),
      true,
    );
    assertEquals(
      generated.includes(
        'import { heroine } from "../src/characters/heroine.ts";',
      ),
      true,
    );
    assertEquals(
      generated.includes(
        'import { kingdom } from "../src/settings/kingdom.ts";',
      ),
      true,
    );
  } finally {
    try {
      await Deno.remove(outputPath);
    } catch {
      // ignore
    }
  }
});

Deno.test("integration - invalid markdown returns an error", async () => {
  await withTestDir("invalid_markdown", async (projectRoot) => {
    await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "src/settings"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "manuscripts"), { recursive: true });

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(markdownPath, "# no frontmatter\n");

    const service = new MetaGeneratorService();
    const result = await service.generateFromMarkdown(markdownPath, {
      projectPath: projectRoot,
      dryRun: true,
    });

    assertEquals(result.ok, false);
  });
});

Deno.test("integration - unknown frontmatter references return an error", async () => {
  await withTestDir("unknown_references", async (projectRoot) => {
    await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "src/settings"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "manuscripts"), { recursive: true });

    await Deno.writeTextFile(
      joinPath(projectRoot, "src/characters/hero.ts"),
      `export const hero = { id: "hero", name: "勇者" };\n`,
    );

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n  characters:\n    - missing_character\n---\n\n本文\n`,
    );

    const service = new MetaGeneratorService();
    const result = await service.generateFromMarkdown(markdownPath, {
      projectPath: projectRoot,
      dryRun: true,
    });

    assertEquals(result.ok, false);
  });
});
