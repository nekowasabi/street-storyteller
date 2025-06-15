import { assertEquals } from "jsr:@std/assert";
import {
  GenerateOptions,
  generateStoryProject,
} from "../src/commands/generate.ts";
import { exists } from "jsr:@std/fs";
import { join } from "jsr:@std/path";

// Test helper to create temporary test directory
async function withTestDir(
  testName: string,
  fn: (testDir: string) => Promise<void>,
) {
  const testDir = join(Deno.cwd(), "test_output", testName);

  try {
    await fn(testDir);
  } finally {
    // Clean up test directory
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

Deno.test("generateStoryProject - creates basic project structure", async () => {
  await withTestDir("basic_structure", async (testDir) => {
    const options: GenerateOptions = {
      name: "test-story",
      template: "basic",
      path: testDir,
    };

    await generateStoryProject(options);

    const projectPath = join(testDir, "test-story");

    // Test that project directory exists
    const projectExists = await exists(projectPath);
    assertEquals(projectExists, true);

    // Test required directories exist
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
      const dirPath = join(projectPath, dir);
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

    const projectPath = join(testDir, "test-story");

    // Test required files exist
    const expectedFiles = [
      "story.ts",
      "story.config.ts",
      "README.md",
      "src/characters/main_character.ts",
      "manuscripts/chapter01.md",
      "drafts/ideas.md",
      "tests/story_test.ts",
    ];

    for (const file of expectedFiles) {
      const filePath = join(projectPath, file);
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

    const projectPath = join(testDir, "test-story");
    const storyPath = join(projectPath, "story.ts");

    const content = await Deno.readTextFile(storyPath);

    // Test that story.ts contains expected imports and class
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

    const projectPath = join(testDir, "test-story");
    const configPath = join(projectPath, "story.config.ts");

    const content = await Deno.readTextFile(configPath);

    // Test that config contains the correct template
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

    const projectPath = join(testDir, "test-story");
    const readmePath = join(projectPath, "README.md");

    const content = await Deno.readTextFile(readmePath);

    // Test that README contains template info
    assertEquals(content.includes("## Template: screenplay"), true);
    assertEquals(content.includes("# My Story Project"), true);
    assertEquals(content.includes("Street Storyteller framework"), true);
  });
});

Deno.test("generateStoryProject - character file has correct structure", async () => {
  await withTestDir("character_structure", async (testDir) => {
    const options: GenerateOptions = {
      name: "test-story",
      template: "basic",
      path: testDir,
    };

    await generateStoryProject(options);

    const projectPath = join(testDir, "test-story");
    const characterPath = join(projectPath, "src/characters/main_character.ts");

    const content = await Deno.readTextFile(characterPath);

    // Test character file structure
    assertEquals(content.includes("import { Character }"), true);
    assertEquals(
      content.includes("export const mainCharacter: Character"),
      true,
    );
    assertEquals(
      content.includes('name: "The protagonist of our story"'),
      true,
    );
  });
});

Deno.test("generateStoryProject - test file is valid", async () => {
  await withTestDir("test_file_valid", async (testDir) => {
    const options: GenerateOptions = {
      name: "test-story",
      template: "basic",
      path: testDir,
    };

    await generateStoryProject(options);

    const projectPath = join(testDir, "test-story");
    const testPath = join(projectPath, "tests/story_test.ts");

    const content = await Deno.readTextFile(testPath);

    // Test that test file contains proper imports and tests
    assertEquals(content.includes("import { assertEquals }"), true);
    assertEquals(content.includes("import { MyStory }"), true);
    assertEquals(content.includes('Deno.test("Story validation"'), true);
    assertEquals(
      content.includes('Deno.test("Story has required elements"'),
      true,
    );
  });
});

Deno.test("generateStoryProject - works without custom path", async () => {
  const options: GenerateOptions = {
    name: "test-no-path",
    template: "basic",
  };

  try {
    await generateStoryProject(options);

    // Test that project was created in current directory
    const projectExists = await exists("test-no-path");
    assertEquals(projectExists, true);

    const storyExists = await exists("test-no-path/story.ts");
    assertEquals(storyExists, true);
  } finally {
    // Clean up
    try {
      await Deno.remove("test-no-path", { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
});
