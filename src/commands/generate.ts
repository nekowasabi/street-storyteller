import { ensureDir } from "jsr:@std/fs";
import { join } from "jsr:@std/path";

export interface GenerateOptions {
  name: string;
  template: "basic" | "novel" | "screenplay";
  path?: string;
}

export async function generateStoryProject(
  options: GenerateOptions,
): Promise<void> {
  const projectPath = options.path
    ? join(options.path, options.name)
    : options.name;

  // Create directory structure
  const directories = [
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

  for (const dir of directories) {
    await ensureDir(join(projectPath, dir));
  }

  // Generate template files
  await generateTemplateFiles(projectPath, options.template);

  console.log(`✅ Story project "${options.name}" generated successfully!`);
  console.log(`📁 Location: ${projectPath}`);
}

async function generateTemplateFiles(
  projectPath: string,
  template: string,
): Promise<void> {
  // Generate main story file
  const storyContent = getStoryTemplate(template);
  await Deno.writeTextFile(join(projectPath, "story.ts"), storyContent);

  // Generate config file
  const configContent = getConfigTemplate(template);
  await Deno.writeTextFile(join(projectPath, "story.config.ts"), configContent);

  // Generate README
  const readmeContent = getReadmeTemplate(template);
  await Deno.writeTextFile(join(projectPath, "README.md"), readmeContent);

  // Generate sample files
  await generateSampleFiles(projectPath, template);
}

function getStoryTemplate(_template: string): string {
  return `import { StoryTeller } from "../src/storyteller_interface.ts";
import { Purpose } from "../src/type/purpose.ts";
import { Character } from "../src/type/character.ts";
import { Plot } from "../src/type/plot.ts";
import { Chapter } from "../src/type/chapter.ts";
import { Fun } from "../src/type/fun.ts";
import { Setting } from "../src/type/setting.ts";

export class MyStory implements StoryTeller {
  purpose: Purpose = {
    description: "Your story's main purpose here"
  };

  funs: Fun[] = [
    { description: "Main entertainment element" }
  ];

  charcters: Character[] = [
    { name: "Main character" }
  ];

  settings: Setting[] = [
    { description: "Main setting" }
  ];

  chapters: Chapter[] = [
    { description: "Chapter 1" }
  ];

  plots: Plot[] = [
    { description: "Main plot" }
  ];

  validate(): boolean {
    // Add validation logic here
    return true;
  }

  output(): void {
    // Generate markdown output
    console.log("Story structure output");
  }
}

// Usage example
const myStory = new MyStory();
console.log("Story validation:", myStory.validate());
myStory.output();
`;
}

function getConfigTemplate(template: string): string {
  return `export interface StoryConfig {
  title: string;
  author: string;
  template: string;
  version: string;
}

export const config: StoryConfig = {
  title: "My Story",
  author: "Author Name",
  template: "${template}",
  version: "1.0.0"
};
`;
}

function getReadmeTemplate(template: string): string {
  return `# My Story Project

This is a story project generated using the Street Storyteller framework.

## Structure

- \`src/\` - Story structure definitions
- \`manuscripts/\` - Actual story manuscripts
- \`drafts/\` - Draft notes and ideas
- \`output/\` - Generated output for AI collaboration
- \`tests/\` - Story validation tests

## Template: ${template}

## Usage

\`\`\`bash
# Run the story
deno run story.ts

# Run tests
deno test

# Format code
deno fmt

# Lint code
deno lint
\`\`\`

## Development

1. Define your story structure in \`src/\` directories
2. Write your actual story in \`manuscripts/\`
3. Use \`drafts/\` for notes and ideas
4. Run tests to validate story consistency
5. Generate output for AI collaboration

## Story Elements

- **Purpose**: What you want to express
- **Fun**: Entertainment elements
- **Characters**: Story characters
- **Settings**: Story environments
- **Chapters**: Story structure
- **Plots**: Story development
- **Themes**: Optional thematic elements
- **Timeline**: Chronological organization
`;
}

async function generateSampleFiles(
  projectPath: string,
  _template: string,
): Promise<void> {
  // Generate sample character
  await Deno.writeTextFile(
    join(projectPath, "src/characters/main_character.ts"),
    `import { Character } from "../../../src/type/character.ts";

export const mainCharacter: Character = {
  name: "The protagonist of our story"
};
`,
  );

  // Generate sample manuscript
  await Deno.writeTextFile(
    join(projectPath, "manuscripts/chapter01.md"),
    `# Chapter 1

Write your story here...

## Scene 1

The story begins...
`,
  );

  // Generate sample draft
  await Deno.writeTextFile(
    join(projectPath, "drafts/ideas.md"),
    `# Story Ideas

## Initial Concept

- Main idea: 
- Inspiration:
- Theme:

## Character Notes

### Main Character
- Name:
- Background:
- Motivation:

## Plot Outline

1. Opening
2. Inciting incident
3. Development
4. Climax
5. Resolution
`,
  );

  // Generate sample test
  await Deno.writeTextFile(
    join(projectPath, "tests/story_test.ts"),
    `import { assertEquals } from "jsr:@std/assert";
import { MyStory } from "../story.ts";

Deno.test("Story validation", () => {
  const story = new MyStory();
  assertEquals(story.validate(), true);
});

Deno.test("Story has required elements", () => {
  const story = new MyStory();
  assertEquals(story.purpose.description.length > 0, true);
  assertEquals(story.funs.length > 0, true);
  assertEquals(story.charcters.length > 0, true);
});
`,
  );
}
