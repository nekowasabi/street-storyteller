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
    "cli_meta_batch",
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

async function existsPath(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
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
    "export type ChapterMeta = { id: string; title: string; order: number; characters: any[]; settings: any[]; };\n",
  );
  await Deno.writeTextFile(
    joinPath(projectRoot, "src/characters/hero.ts"),
    `export const hero = { id: "hero", name: "勇者", displayNames: ["勇者"] };\n`,
  );
  await Deno.writeTextFile(
    joinPath(projectRoot, "src/settings/kingdom.ts"),
    `export const kingdom = { id: "kingdom", name: "王都", displayNames: ["王都"] };\n`,
  );
}

function createContext(args: Record<string, unknown>): CommandContext {
  return {
    args,
    logger: createStubLogger(),
    presenter: createStubPresenter(),
    config: createStubConfig(),
  };
}

Deno.test("meta generate --batch processes glob patterns", async () => {
  await withTestDir("glob", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const chapter1 = joinPath(projectRoot, "manuscripts/chapter01.md");
    const chapter2 = joinPath(projectRoot, "manuscripts/chapter02.md");

    await Deno.writeTextFile(
      chapter1,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "一"\n  order: 1\n  characters:\n    - hero\n  settings:\n    - kingdom\n---\n\n勇者は王都にいた。\n`,
    );
    await Deno.writeTextFile(
      chapter2,
      `---\nstoryteller:\n  chapter_id: chapter02\n  title: "二"\n  order: 2\n  characters:\n    - hero\n  settings:\n    - kingdom\n---\n\n勇者は王都にいた。\n`,
    );

    const glob = joinPath(projectRoot, "manuscripts/*.md");

    const command = new MetaGenerateCommand();
    const result = await command.execute(createContext({
      extra: [glob],
      batch: true,
    }));

    assert(result.ok, "Command should succeed");

    assertEquals(
      await existsPath(joinPath(projectRoot, "manuscripts/chapter01.meta.ts")),
      true,
    );
    assertEquals(
      await existsPath(joinPath(projectRoot, "manuscripts/chapter02.meta.ts")),
      true,
    );
  });
});

Deno.test("meta generate --dir processes a directory", async () => {
  await withTestDir("dir", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    await Deno.writeTextFile(
      joinPath(projectRoot, "manuscripts/chapter01.md"),
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "一"\n  order: 1\n  characters:\n    - hero\n  settings:\n    - kingdom\n---\n\n勇者は王都にいた。\n`,
    );

    const command = new MetaGenerateCommand();
    const result = await command.execute(createContext({
      dir: joinPath(projectRoot, "manuscripts"),
    }));

    assert(result.ok, "Command should succeed");
    assertEquals(
      await existsPath(joinPath(projectRoot, "manuscripts/chapter01.meta.ts")),
      true,
    );
  });
});
