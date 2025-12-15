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
      return err({
        code: "template_not_found",
        message: `Unknown template: ${template}`,
      });
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
  ".claude/commands",
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
`,
  },
  {
    path: "tests/test_utils/assert.ts",
    content:
      `export function assert(condition: unknown, message: string): asserts condition {
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
  // Claude Code slash commands
  {
    path: ".claude/commands/story-director.md",
    content: `# Story Director

物語のディレクターとして、プロジェクト全体を把握し、創作的な観点から応答します。

## あなたの役割

あなたはstreet-storytellerプロジェクトの「物語ディレクター」です。
SaC（StoryWriting as Code）コンセプトに基づき、物語の構造を把握し、創作をサポートします。

### 3つの支援軸

1. **全体像把握**: キャラクター構成、設定の整合性、プロット進行を俯瞰
2. **創作的アドバイス**: 伏線配置、キャラクターアーク、テーマ展開の提案
3. **技術的支援**: storyteller CLIの使い方、型定義の活用方法

## コンテキスト収集

以下のCLIコマンドでプロジェクト情報を取得してください：

\`\`\`bash
# プロジェクト全体の情報
storyteller meta check --json

# LSP検証（整合性チェック）
storyteller lsp validate --dir manuscripts --recursive
\`\`\`

また、以下のディレクトリ構造を確認してください：

- \`src/characters/\` - キャラクター定義ファイル
- \`src/settings/\` - 世界観・設定ファイル
- \`manuscripts/\` - 原稿ファイル

## 質問

$ARGUMENTS
`,
  },
  {
    path: ".claude/commands/story-check.md",
    content: `# Story Check

原稿の整合性チェックを実行し、結果を分析します。

## 実行コマンド

以下のコマンドを実行して結果を取得してください：

\`\`\`bash
# manuscripts ディレクトリ全体を検証
storyteller lsp validate --dir manuscripts --recursive

# 特定のファイルを検証
storyteller lsp validate --path $ARGUMENTS

# JSON形式で詳細を取得
storyteller lsp validate --dir manuscripts --recursive --json
\`\`\`

## 結果の分析

検証結果を以下の観点で分析してください：

### エラー分類

1. **参照エラー**: 未定義のキャラクターや設定への参照
2. **整合性警告**: 低信頼度の暗黙的参照
3. **情報**: 改善提案

### 修正優先度

| 優先度 | 種類 | アクション |
|--------|------|-----------|
| 高 | error | 即座に修正が必要 |
| 中 | warning | 確認して対応を検討 |
| 低 | info | 時間があれば改善 |

## 対象

$ARGUMENTS
`,
  },
  {
    path: ".claude/commands/story-char.md",
    content: `# Story Character

キャラクターの作成・管理を行います。

## キャラクター作成

引数からキャラクター情報を解析し、適切なコマンドを実行してください。

### 基本作成

\`\`\`bash
# 基本的なキャラクター作成
storyteller element character --name "キャラ名" --role protagonist --summary "概要"

# 詳細情報付きで作成
storyteller element character --name "キャラ名" --role supporting --summary "概要" --with-details

# トレイト付きで作成
storyteller element character --name "キャラ名" --role antagonist --summary "概要" --traits "勇敢,正義感"
\`\`\`

### 役割オプション

| 役割 | 説明 |
|------|------|
| \`protagonist\` | 主人公 |
| \`antagonist\` | 敵対者 |
| \`supporting\` | 脇役・サポート |
| \`guest\` | ゲスト・一時的登場 |

## 引数の解析

ユーザーの入力（$ARGUMENTS）を解析して、以下を特定してください：

1. **名前**: 「〜という名前」「〜を作成」などから抽出
2. **役割**: 「主人公」→protagonist、「悪役」→antagonist など
3. **概要**: 説明文があれば抽出
4. **特徴**: 「特徴は〜」「〜な性格」などから抽出

## 入力

$ARGUMENTS
`,
  },
  {
    path: ".claude/commands/story-view.md",
    content: `# Story View

プロジェクトをHTML形式で可視化します。

## 実行コマンド

\`\`\`bash
# ローカルサーバーを起動してブラウザで表示
storyteller view --serve

# カスタムポートで起動
storyteller view --serve --port 3000

# ファイル監視モード（変更を自動反映）
storyteller view --serve --watch

# HTMLファイルとして出力
storyteller view --output ./output/

# プレビューのみ（実際には出力しない）
storyteller view --dry-run
\`\`\`

## オプション一覧

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| \`--serve\` | ローカルサーバーを起動 | - |
| \`--port\` | サーバーのポート番号 | 8080 |
| \`--watch\` | ファイル変更を監視 | false |
| \`--output\` | 出力先ディレクトリ | - |
| \`--path\` | プロジェクトパス | カレント |
| \`--dry-run\` | プレビューのみ | false |
| \`--timeout\` | タイムアウト（秒） | 30 |

## 使用シーン

1. **執筆中の確認**: \`--serve --watch\` で常時表示
2. **共有用出力**: \`--output\` でHTML生成
3. **構造確認**: サーバー起動してブラウザで俯瞰

## 入力

$ARGUMENTS
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
    files: [
      storyTemplate(),
      configTemplate(template),
      readmeTemplate(template),
      ...BASE_FILES,
    ],
  };
}

const TEMPLATES = new Map<TemplateId, ProjectBlueprint>([
  ["basic", buildTemplate("basic")],
  ["novel", buildTemplate("novel")],
  ["screenplay", buildTemplate("screenplay")],
]);
