import { assert, assertEquals } from "../../asserts.ts";
import { MetaGeneratorService } from "@storyteller/application/meta/meta_generator_service.ts";

function joinPath(...segments: readonly string[]): string {
  let result = "";
  for (const segment of segments) {
    if (segment.length === 0) {
      continue;
    }
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
    "meta_generator_service",
    testName,
  );
  await Deno.mkdir(testDir, { recursive: true });

  try {
    await fn(testDir);
  } finally {
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

async function writeProjectFixtures(projectRoot: string) {
  await Deno.mkdir(joinPath(projectRoot, "src/types"), { recursive: true });
  await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
    recursive: true,
  });
  await Deno.mkdir(joinPath(projectRoot, "src/settings"), { recursive: true });
  await Deno.mkdir(joinPath(projectRoot, "manuscripts"), { recursive: true });

  await Deno.writeTextFile(
    joinPath(projectRoot, "src/types/chapter.ts"),
    "export type ChapterMeta = { id: string; title: string; order: number; characters: any[]; settings: any[]; validations?: any[]; references?: any; summary?: string; };\n",
  );

  await Deno.writeTextFile(
    joinPath(projectRoot, "src/characters/hero.ts"),
    `export const hero = { id: "hero", name: "勇者", displayNames: ["勇者", "アレクス"] };\n`,
  );

  await Deno.writeTextFile(
    joinPath(projectRoot, "src/settings/kingdom.ts"),
    `export const kingdom = { id: "kingdom", name: "王都", displayNames: ["王都", "城門"] };\n`,
  );
}

Deno.test("MetaGeneratorService - generates meta from Markdown (dry-run)", async () => {
  await withTestDir("dry_run", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n  characters:\n    - hero\n  settings:\n    - kingdom\n  summary: "概要"\n---\n\n勇者は王都に着いた。\n`,
    );

    const service = new MetaGeneratorService();
    const result = await service.generateFromMarkdown(markdownPath, {
      projectPath: projectRoot,
      dryRun: true,
    });

    assert(result.ok, "Result should be ok");
    assertEquals(result.value.id, "chapter01");
    assertEquals(result.value.title, "旅の始まり");
    assertEquals(result.value.order, 1);
    assertEquals(
      result.value.characters.some((c) => c.id === "hero"),
      true,
    );
    assertEquals(
      result.value.settings.some((s) => s.id === "kingdom"),
      true,
    );
    assertEquals(result.value.summary, "概要");
  });
});

Deno.test("MetaGeneratorService - writes .meta.ts file when not dry-run", async () => {
  await withTestDir("writes_file", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n  characters:\n    - hero\n  settings:\n    - kingdom\n---\n\n勇者は王都に着いた。\n`,
    );

    const service = new MetaGeneratorService();
    const result = await service.generateFromMarkdown(markdownPath, {
      projectPath: projectRoot,
      dryRun: false,
    });

    assert(result.ok, "Result should be ok");

    const outputPath = joinPath(projectRoot, "manuscripts/chapter01.meta.ts");
    const output = await Deno.readTextFile(outputPath);
    assertEquals(
      output.includes("export const chapter01Meta: ChapterMeta"),
      true,
    );
    assertEquals(output.includes("import { hero }"), true);
    assertEquals(output.includes("import { kingdom }"), true);
  });
});

Deno.test("MetaGeneratorService - returns error on invalid Markdown", async () => {
  await withTestDir("invalid_markdown", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(markdownPath, "# No frontmatter\n");

    const service = new MetaGeneratorService();
    const result = await service.generateFromMarkdown(markdownPath, {
      projectPath: projectRoot,
      dryRun: true,
    });

    assertEquals(result.ok, false);
  });
});

Deno.test("MetaGeneratorService - respects --force overwrite flag", async () => {
  await withTestDir("force_overwrite", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n  characters:\n    - hero\n  settings:\n    - kingdom\n---\n\n勇者は王都に着いた。\n`,
    );

    const outputPath = joinPath(projectRoot, "manuscripts/chapter01.meta.ts");
    await Deno.writeTextFile(outputPath, "// existing\n");

    const service = new MetaGeneratorService();

    const withoutForce = await service.generateFromMarkdown(markdownPath, {
      projectPath: projectRoot,
      dryRun: false,
      force: false,
    });
    assertEquals(withoutForce.ok, false);

    const withForce = await service.generateFromMarkdown(markdownPath, {
      projectPath: projectRoot,
      dryRun: false,
      force: true,
    });
    assert(withForce.ok, "Should overwrite with force");
  });
});

Deno.test("MetaGeneratorService - applies validation preset", async () => {
  await withTestDir("preset", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n---\n\n「こんにちは」\n`,
    );

    const service = new MetaGeneratorService();
    const result = await service.generateFromMarkdown(markdownPath, {
      projectPath: projectRoot,
      dryRun: true,
      preset: "dialogue",
    });

    assert(result.ok, "Result should be ok");
    const plotRule = (result.value.validations ?? []).find((v) =>
      v.type === "plot_advancement"
    );
    assert(plotRule, "plot_advancement should exist");
    assertEquals(plotRule.validate.includes("「"), true);
  });
});
