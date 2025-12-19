import { assertEquals } from "./asserts.ts";
import {
  GenerateOptions,
  generateStoryProject,
} from "@storyteller/commands/generate.ts";

async function withTestDir(
  testName: string,
  fn: (testDir: string) => Promise<void>,
) {
  const testDir = joinPath(Deno.cwd(), "test_output", testName);

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

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

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

Deno.test("generateStoryProject - creates basic project structure", async () => {
  await withTestDir("basic_structure", async (testDir) => {
    const options: GenerateOptions = {
      name: "test-story",
      template: "basic",
      path: testDir,
    };

    await generateStoryProject(options);

    const projectPath = joinPath(testDir, "test-story");

    const projectExists = await exists(projectPath);
    assertEquals(projectExists, true);

    const expectedDirs = [
      "src/characters",
      "src/settings",
      "src/chapters",
      "src/plots",
      "src/timeline",
      "src/themes",
      "src/structure",
      "src/purpose",
      "manuscripts",
      "drafts",
      "output",
      "tests",
    ];

    for (const dir of expectedDirs) {
      const dirPath = joinPath(projectPath, dir);
      const dirExists = await exists(dirPath);
      assertEquals(dirExists, true, `Directory ${dir} should exist`);
    }
  });
});

Deno.test("generateStoryProject - creates required files", async () => {
  await withTestDir("required_files", async (testDir) => {
    const options: GenerateOptions = {
      name: "test-story",
      template: "basic",
      path: testDir,
    };

    await generateStoryProject(options);

    const projectPath = joinPath(testDir, "test-story");

    const expectedFiles = [
      "story.ts",
      "story.config.ts",
      "README.md",
      "src/characters/main_character.ts",
      "manuscripts/chapter01.md",
      "drafts/ideas.md",
      "tests/story_test.ts",
      ".storyteller.json",
      "tests/test_utils/assert.ts",
    ];

    for (const file of expectedFiles) {
      const filePath = joinPath(projectPath, file);
      const fileExists = await exists(filePath);
      assertEquals(fileExists, true, `File ${file} should exist`);
    }
  });
});

Deno.test("generateStoryProject - story.ts contains valid TypeScript", async () => {
  await withTestDir("valid_typescript", async (testDir) => {
    const options: GenerateOptions = {
      name: "test-story",
      template: "basic",
      path: testDir,
    };

    await generateStoryProject(options);

    const projectPath = joinPath(testDir, "test-story");
    const storyPath = joinPath(projectPath, "story.ts");

    const content = await Deno.readTextFile(storyPath);

    assertEquals(content.includes("import { StoryTeller }"), true);
    assertEquals(
      content.includes("export class MyStory implements StoryTeller"),
      true,
    );
    assertEquals(content.includes("purpose: Purpose"), true);
    assertEquals(content.includes("validate(): boolean"), true);
    assertEquals(content.includes("output(): void"), true);
  });
});

Deno.test("generateStoryProject - config file contains correct template", async () => {
  await withTestDir("config_template", async (testDir) => {
    const options: GenerateOptions = {
      name: "test-story",
      template: "novel",
      path: testDir,
    };

    await generateStoryProject(options);

    const projectPath = joinPath(testDir, "test-story");
    const configPath = joinPath(projectPath, "story.config.ts");

    const content = await Deno.readTextFile(configPath);

    assertEquals(content.includes('template: "novel"'), true);
    assertEquals(content.includes("export interface StoryConfig"), true);
    assertEquals(content.includes("export const config: StoryConfig"), true);
  });
});

Deno.test("generateStoryProject - README contains template type", async () => {
  await withTestDir("readme_template", async (testDir) => {
    const options: GenerateOptions = {
      name: "test-story",
      template: "screenplay",
      path: testDir,
    };

    await generateStoryProject(options);

    const projectPath = joinPath(testDir, "test-story");
    const readmePath = joinPath(projectPath, "README.md");

    const content = await Deno.readTextFile(readmePath);

    assertEquals(content.includes("Template: screenplay"), true);
  });
});
