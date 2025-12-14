import {
  assert,
  assertEquals,
  createStubConfig,
  createStubLogger,
  createStubPresenter,
} from "../asserts.ts";
import type { CommandContext } from "../../src/cli/types.ts";
import { MetaGenerateCommand } from "../../src/cli/modules/meta/generate.ts";

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
    "cli_meta_update",
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
}

Deno.test("meta generate --update preserves manual edits and updates auto blocks", async () => {
  await withTestDir("update_preserves_manual", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: \"旅の始まり\"\n  order: 1\n  characters:\n    - hero\n  settings:\n    - kingdom\n---\n\n勇者は王都にいた。\n`,
    );

    const command = new MetaGenerateCommand();
    const first = await command.execute(
      createContext({ extra: [markdownPath] }),
    );
    assert(first.ok, "Initial generation should succeed");

    const outputPath = joinPath(projectRoot, "manuscripts/chapter01.meta.ts");
    const before = await Deno.readTextFile(outputPath);
    const injected = before.replace(
      "  // storyteller:auto:entities:end\n",
      `  // storyteller:auto:entities:end\n\n  summary: \"MANUAL SUMMARY\",\n`,
    );
    await Deno.writeTextFile(outputPath, injected);

    // Change frontmatter to force entity changes.
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: \"旅の始まり\"\n  order: 2\n  characters:\n    - heroine\n  settings:\n    - kingdom\n---\n\nエリーゼは王都にいた。\n`,
    );

    const updated = await command.execute(createContext({
      extra: [markdownPath],
      update: true,
    }));
    assert(updated.ok, "Update should succeed");

    const after = await Deno.readTextFile(outputPath);
    assertEquals(after.includes('summary: "MANUAL SUMMARY"'), true);
    assertEquals(after.includes("characters: [heroine]"), true);
    assertEquals(after.includes("order: 2"), true);
    assertEquals(
      after.includes('import { heroine } from "../src/characters/heroine.ts";'),
      true,
    );
    assertEquals(
      after.includes('import { hero } from "../src/characters/hero.ts";'),
      false,
    );
  });
});

Deno.test("meta generate --update fails safely for legacy files without markers", async () => {
  await withTestDir("update_requires_markers", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: \"旅の始まり\"\n  order: 1\n---\n\n本文\n`,
    );

    const outputPath = joinPath(projectRoot, "manuscripts/chapter01.meta.ts");
    await Deno.writeTextFile(outputPath, "// legacy\n");

    const command = new MetaGenerateCommand();
    const result = await command.execute(createContext({
      extra: [markdownPath],
      update: true,
    }));

    assertEquals(result.ok, false);
  });
});
