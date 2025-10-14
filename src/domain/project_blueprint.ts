import { err, ok, type Result } from "../shared/result.ts";

export interface ProjectBlueprint {
  readonly directories: readonly string[];
  readonly files: readonly ProjectFileSpec[];
}

export interface ProjectFileSpec {
  readonly path: string;
  readonly content: string;
}

export type TemplateId = "basic" | "novel" | "screenplay";

export interface TemplateError {
  readonly code: "template_not_found";
  readonly message: string;
}

export interface TemplateCatalog {
  getBlueprint(template: TemplateId): Result<ProjectBlueprint, TemplateError>;
}

export class StaticTemplateCatalog implements TemplateCatalog {
  getBlueprint(template: TemplateId): Result<ProjectBlueprint, TemplateError> {
    if (!TEMPLATES.has(template)) {
      return err({ code: "template_not_found", message: `Unknown template: ${template}` });
    }
    return ok(TEMPLATES.get(template)!);
  }
}

const BASE_DIRECTORIES = [
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
] as const;

const BASE_FILES: readonly ProjectFileSpec[] = [
  {
    path: "tests/story_test.ts",
    content: `import { assert } from "../test_utils/assert.ts";
import { MyStory } from "../story.ts";

Deno.test("Story validation", () => {
  const story = new MyStory();
  assert(story.validate(), "Story should validate");
});

Deno.test("Story has required elements", () => {
  const story = new MyStory();
  assert(story.purpose.description.length > 0, "Purpose should be described");
  assert(story.funs.length > 0, "At least one fun element expected");
  assert(story.charcters.length > 0, "At least one character expected");
});
`
  },
  {
    path: "tests/test_utils/assert.ts",
    content: `export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
`,
  },
  {
    path: "src/characters/main_character.ts",
    content: `import { Character } from "../../../src/type/character.ts";

export const mainCharacter: Character = {
  name: "The protagonist of our story"
};
`,
  },
  {
    path: "manuscripts/chapter01.md",
    content: `# Chapter 1

Write your story here...

## Scene 1

The story begins...
`,
  },
  {
    path: "drafts/ideas.md",
    content: `# Story Ideas

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
  },
];

function storyTemplate(): ProjectFileSpec {
  return {
    path: "story.ts",
    content: `import { StoryTeller } from "../src/storyteller_interface.ts";
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
    return true;
  }

  output(): void {
    console.log("Story structure output");
  }
}

const myStory = new MyStory();
console.log("Story validation:", myStory.validate());
myStory.output();
`,
  };
}

function configTemplate(template: TemplateId): ProjectFileSpec {
  return {
    path: "story.config.ts",
    content: `export interface StoryConfig {
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
`,
  };
}

function readmeTemplate(template: TemplateId): ProjectFileSpec {
  return {
    path: "README.md",
    content: `# My Story Project

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
`,
  };
}

function buildTemplate(template: TemplateId): ProjectBlueprint {
  return {
    directories: [...BASE_DIRECTORIES],
    files: [storyTemplate(), configTemplate(template), readmeTemplate(template), ...BASE_FILES],
  };
}

const TEMPLATES = new Map<TemplateId, ProjectBlueprint>([
  ["basic", buildTemplate("basic")],
  ["novel", buildTemplate("novel")],
  ["screenplay", buildTemplate("screenplay")],
]);
