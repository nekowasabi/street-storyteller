/**
 * element characterコマンドの--separate-filesオプションのテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { ElementCharacterCommand } from "../../src/cli/modules/element/character.ts";
import type { CommandContext } from "../../src/cli/types.ts";
import { join } from "@std/path";

function createMockLogger(): any {
  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    withContext: () => logger,
  };
  return logger;
}

function createMockPresenter() {
  return {
    showInfo: () => {},
    showSuccess: () => {},
    showWarning: () => {},
    showError: () => {},
  };
}

function createMockConfig(projectRoot: string) {
  return {
    resolve: async () => ({
      runtime: {
        environment: "test" as const,
        projectRoot,
        paths: {},
      },
      logging: {
        level: "info" as const,
        format: "human" as const,
        color: true,
        timestamps: true,
      },
      features: {},
      cache: {},
      external: {},
    }),
  };
}

Deno.test("ElementCharacterCommand: --separate-files backstoryでファイル分離", async () => {
  const command = new ElementCharacterCommand();
  const tempDir = await Deno.makeTempDir();

  const context: CommandContext = {
    args: {
      id: "hero",
      name: "勇者",
      role: "protagonist",
      summary: "勇者の物語",
      traits: "brave,kind",
      "add-details": "backstory",
      "separate-files": "backstory",
    },
    logger: createMockLogger() as any,
    presenter: createMockPresenter() as any,
    config: createMockConfig(tempDir) as any,
  };

  const result = await command.execute(context);

  assertEquals(result.ok, true);
  if (!result.ok) return;

  // backstoryファイルが作成されている
  const backstoryFile = join(tempDir, "characters", "hero", "backstory.md");
  const backstoryStat = await Deno.stat(backstoryFile);
  assertEquals(backstoryStat.isFile, true);

  // backstoryファイルの内容を確認
  const backstoryContent = await Deno.readTextFile(backstoryFile);
  assertEquals(backstoryContent.includes("type: character-detail"), true);
  assertEquals(backstoryContent.includes("field: backstory"), true);
  assertEquals(backstoryContent.includes("characterId: hero"), true);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("ElementCharacterCommand: --separate-files allで全フィールド分離", async () => {
  const command = new ElementCharacterCommand();
  const tempDir = await Deno.makeTempDir();

  const context: CommandContext = {
    args: {
      id: "hero",
      name: "勇者",
      role: "protagonist",
      summary: "勇者の物語",
      "with-details": true,
      "separate-files": "all",
    },
    logger: createMockLogger() as any,
    presenter: createMockPresenter() as any,
    config: createMockConfig(tempDir) as any,
  };

  const result = await command.execute(context);

  assertEquals(result.ok, true);
  if (!result.ok) return;

  // 各詳細フィールドのMarkdownファイルが作成されている
  const expectedFiles = ["appearance.md", "personality.md", "backstory.md"];
  const characterDir = join(tempDir, "characters", "hero");

  for (const fileName of expectedFiles) {
    const filePath = join(characterDir, fileName);
    assertExists(await Deno.stat(filePath));
  }

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("ElementCharacterCommand: --separate-files 複数フィールド指定", async () => {
  const command = new ElementCharacterCommand();
  const tempDir = await Deno.makeTempDir();

  const context: CommandContext = {
    args: {
      id: "hero",
      name: "勇者",
      role: "protagonist",
      summary: "勇者の物語",
      "add-details": "backstory,appearance",
      "separate-files": "backstory,appearance",
    },
    logger: createMockLogger() as any,
    presenter: createMockPresenter() as any,
    config: createMockConfig(tempDir) as any,
  };

  const result = await command.execute(context);

  assertEquals(result.ok, true);
  if (!result.ok) return;

  const characterDir = join(tempDir, "characters", "hero");
  const backstoryFile = join(characterDir, "backstory.md");
  const appearanceFile = join(characterDir, "appearance.md");

  assertExists(await Deno.stat(backstoryFile));
  assertExists(await Deno.stat(appearanceFile));

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("ElementCharacterCommand: --separate-files なしでインライン保持", async () => {
  const command = new ElementCharacterCommand();
  const tempDir = await Deno.makeTempDir();

  const context: CommandContext = {
    args: {
      id: "hero",
      name: "勇者",
      role: "protagonist",
      summary: "勇者の物語",
      "add-details": "backstory",
    },
    logger: createMockLogger() as any,
    presenter: createMockPresenter() as any,
    config: createMockConfig(tempDir) as any,
  };

  const result = await command.execute(context);

  assertEquals(result.ok, true);
  if (!result.ok) return;

  // Markdownファイルは作成されない
  const backstoryFile = join(tempDir, "characters", "hero", "backstory.md");
  try {
    await Deno.stat(backstoryFile);
    throw new Error("File should not exist");
  } catch (error) {
    assertEquals(error instanceof Deno.errors.NotFound, true);
  }

  await Deno.remove(tempDir, { recursive: true });
});
