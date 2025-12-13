import {
  assert,
  assertEquals,
  createStubConfig,
  createStubLogger,
} from "../asserts.ts";
import type { CommandContext, OutputPresenter } from "../../src/cli/types.ts";
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
    "cli_meta_preview",
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
    `export const hero = { id: "hero", name: "勇者アレクス", displayNames: ["勇者", "アレクス"] };\n`,
  );
  await Deno.writeTextFile(
    joinPath(projectRoot, "src/settings/kingdom.ts"),
    `export const kingdom = { id: "kingdom", name: "エルフィード王国", displayNames: ["王都"] };\n`,
  );
}

function createCapturingPresenter(messages: string[]): OutputPresenter {
  return {
    showInfo: (message) => messages.push(message),
    showSuccess: (message) => messages.push(message),
    showWarning: (message) => messages.push(message),
    showError: (message) => messages.push(message),
  };
}

Deno.test("meta generate --dry-run --preview prints a summary", async () => {
  await withTestDir("preview", async (projectRoot) => {
    await writeProjectFixtures(projectRoot);

    const markdownPath = joinPath(projectRoot, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: "旅の始まり"\n  order: 1\n  characters:\n    - hero\n  settings:\n    - kingdom\n---\n\n勇者は王都に着いた。\n`,
    );

    const messages: string[] = [];
    const presenter = createCapturingPresenter(messages);

    const context: CommandContext = {
      args: { extra: [markdownPath], "dry-run": true, preview: true },
      logger: createStubLogger(),
      presenter,
      config: createStubConfig(),
    };

    const command = new MetaGenerateCommand();
    const result = await command.execute(context);

    assert(result.ok, "Command should succeed");
    const combined = messages.join("\n");
    assertEquals(combined.includes("chapter01"), true);
    assertEquals(combined.includes("旅の始まり"), true);
    assertEquals(combined.includes("hero"), true);
    assertEquals(combined.includes("kingdom"), true);
  });
});
