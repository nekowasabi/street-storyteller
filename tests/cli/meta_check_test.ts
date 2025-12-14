import {
  assert,
  assertEquals,
  createStubConfig,
  createStubLogger,
  createStubPresenter,
} from "../asserts.ts";
import type { CommandContext } from "../../src/cli/types.ts";
import { MetaCheckCommand } from "../../src/cli/modules/meta/check.ts";

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
    "cli_meta_check",
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
  await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
    recursive: true,
  });
  await Deno.mkdir(joinPath(projectRoot, "src/settings"), { recursive: true });
  await Deno.mkdir(joinPath(projectRoot, "manuscripts"), { recursive: true });

  await Deno.writeTextFile(
    joinPath(projectRoot, "src/characters/hero.ts"),
    `export const hero = { id: "hero", name: "勇者", displayNames: ["勇者"] };\n`,
  );
  await Deno.writeTextFile(
    joinPath(projectRoot, "src/settings/kingdom.ts"),
    `export const kingdom = { id: "kingdom", name: "王都", displayNames: ["王都"] };\n`,
  );
}

Deno.test("meta check - succeeds for a valid manuscript", async () => {
  await withTestDir("ok", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: \"旅の始まり\"\n  order: 1\n  characters:\n    - hero\n  settings:\n    - kingdom\n---\n\n勇者は王都にいた。\n`,
    );

    const command = new MetaCheckCommand();
    const result = await command.execute(
      createContext({ extra: [markdownPath] }),
    );
    assert(result.ok, "meta check should succeed");
  });
});

Deno.test("meta check - fails when references are unknown", async () => {
  await withTestDir("unknown_references", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: \"旅の始まり\"\n  order: 1\n  characters:\n    - missing_character\n---\n\n本文\n`,
    );

    const command = new MetaCheckCommand();
    const result = await command.execute(
      createContext({ extra: [markdownPath] }),
    );
    assertEquals(result.ok, false);
  });
});
