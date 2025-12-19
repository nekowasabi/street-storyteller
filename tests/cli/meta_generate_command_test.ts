import {
  assert,
  assertEquals,
  createStubConfig,
  createStubLogger,
  createStubPresenter,
} from "../asserts.ts";
import type { CommandContext } from "@storyteller/cli/types.ts";
import { MetaGenerateCommand } from "@storyteller/cli/modules/meta/generate.ts";
import type { ChapterMeta } from "@storyteller/application/meta/meta_generator_service.ts";

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
    "cli_meta_generate",
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

function createContext(args: Record<string, unknown>): CommandContext {
  return {
    args,
    logger: createStubLogger(),
    presenter: createStubPresenter(),
    config: createStubConfig(),
  };
}

async function writeProjectFixtures(projectRoot: string) {
  await Deno.mkdir(joinPath(projectRoot, "src/types"), { recursive: true });
  await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
    recursive: true,
  });
  await Deno.mkdir(joinPath(projectRoot, "src/settings"), { recursive: true });
  await Deno.mkdir(joinPath(projectRoot, "manuscripts"), { recursive: true });
  await Deno.mkdir(joinPath(projectRoot, "output"), { recursive: true });

  await Deno.writeTextFile(
    joinPath(projectRoot, "src/types/chapter.ts"),
    "export type ChapterMeta = { id: string; title: string; order: number; characters: any[]; settings: any[]; validations?: any[]; references?: any; summary?: string; };\n",
  );

  await Deno.writeTextFile(
    joinPath(projectRoot, "src/characters/hero.ts"),
    `export const hero = { id: "hero", name: "勇者", displayNames: ["勇者"] };\n`,
  );
  await Deno.writeTextFile(
    joinPath(projectRoot, "src/characters/heroine.ts"),
    `export const heroine = { id: "heroine", name: "エリーゼ", displayNames: ["エリーゼ"] };\n`,
  );

  await Deno.writeTextFile(
    joinPath(projectRoot, "src/settings/kingdom.ts"),
    `export const kingdom = { id: "kingdom", name: "王都", displayNames: ["王都"] };\n`,
  );
  await Deno.writeTextFile(
    joinPath(projectRoot, "src/settings/magic_forest.ts"),
    `export const magicForest = { id: "magic_forest", name: "魔法の森", displayNames: ["魔法の森"] };\n`,
  );
}

Deno.test("MetaGenerateCommand - basic execution writes meta file", async () => {
  await withTestDir("basic", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n  characters:\n    - hero\n  settings:\n    - kingdom\n---\n\n本文\n`,
    );

    const command = new MetaGenerateCommand();
    const result = await command.execute(createContext({
      extra: [markdownPath],
    }));

    assert(result.ok, "Command should succeed");
    const outputPath = joinPath(projectRoot, "manuscripts/chapter01.meta.ts");
    const output = await Deno.readTextFile(outputPath);
    assertEquals(
      output.includes("export const chapter01Meta: ChapterMeta"),
      true,
    );
  });
});

Deno.test("MetaGenerateCommand - --dry-run does not write file", async () => {
  await withTestDir("dry_run", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n---\n\n本文\n`,
    );

    const command = new MetaGenerateCommand();
    const result = await command.execute(createContext({
      extra: [markdownPath],
      "dry-run": true,
    }));

    assert(result.ok, "Command should succeed");
    const outputPath = joinPath(projectRoot, "manuscripts/chapter01.meta.ts");
    const exists = await existsPath(outputPath);
    assertEquals(exists, false);
  });
});

Deno.test("MetaGenerateCommand - --output writes to custom path", async () => {
  await withTestDir("custom_output", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n---\n\n本文\n`,
    );

    const customPath = joinPath(projectRoot, "output/chapter01.meta.ts");

    const command = new MetaGenerateCommand();
    const result = await command.execute(createContext({
      extra: [markdownPath],
      output: customPath,
    }));

    assert(result.ok, "Command should succeed");
    const exists = await existsPath(customPath);
    assertEquals(exists, true);
  });
});

Deno.test("MetaGenerateCommand - --force controls overwrite", async () => {
  await withTestDir("force", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n---\n\n本文\n`,
    );

    const outputPath = joinPath(projectRoot, "manuscripts/chapter01.meta.ts");
    await Deno.writeTextFile(outputPath, "// existing\n");

    const command = new MetaGenerateCommand();

    const withoutForce = await command.execute(createContext({
      extra: [markdownPath],
      force: false,
    }));
    assertEquals(withoutForce.ok, false);

    const withForce = await command.execute(createContext({
      extra: [markdownPath],
      force: true,
    }));
    assert(withForce.ok, "Should overwrite with force");
  });
});

Deno.test("MetaGenerateCommand - --characters/--settings override frontmatter", async () => {
  await withTestDir("overrides", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n  characters:\n    - hero\n  settings:\n    - kingdom\n---\n\n本文\n`,
    );

    const command = new MetaGenerateCommand();
    const result = await command.execute(createContext({
      extra: [markdownPath],
      characters: "heroine",
      settings: "magic_forest",
      "dry-run": true,
    }));

    assert(result.ok, "Command should succeed");
    const meta = result.value as ChapterMeta;
    assertEquals(meta.characters.some((c) => c.id === "heroine"), true);
    assertEquals(meta.characters.some((c) => c.id === "hero"), false);
    assertEquals(meta.settings.some((s) => s.id === "magic_forest"), true);
    assertEquals(meta.settings.some((s) => s.id === "kingdom"), false);
  });
});

async function existsPath(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}
