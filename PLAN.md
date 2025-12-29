---
mission_id: rag-integration-2025
title: "storyteller RAG統合計画"
status: planning
progress: 0
phase: planning
tdd_mode: true
blockers: 0
created_at: "2025-12-29"
updated_at: "2025-12-29"
---

# Commander's Intent

## Purpose

storytellerプロジェクトにdigrag
RAGを統合し、原稿執筆時にAIが最新のプロジェクト情報（キャラクター、設定、伏線、タイムライン、既存原稿）を自動取得して、より正確で文脈に基づいた支援を提供する。

## End State

- **`storyteller rag`
  ワンコマンドでプロジェクト全要素をRAGインデックスに変換可能**
  - ドキュメント生成 → インデックス構築を一括実行
  - 追加オプションでサブコマンド(`export`, `build`, `install-hooks`)も利用可
- RAGインデックスから関連情報を自動検索
- story_directorプロンプトがRAG検索を活用して応答
- Git hook経由でコミット時に自動更新

## Key Tasks

1. RAGドキュメントジェネレーター基盤実装（キャラクター、設定対応）
2. チャンキングエンジン実装（ドキュメント/シーン単位分割）
3. 全要素タイプの対応（伏線、タイムライン、原稿、関係性グラフ）
4. インクリメンタルエクスポート実装
5. 自動更新システム（Git hooks, CLIコマンド）
6. MCPプロンプト統合（story_director拡張）

## Constraints

- TypeScript/Denoを使用（プロジェクト既存の技術スタック）
- **専用のMarkdown形式を採用（検索精度重視）**
  - digrag互換形式ではなく、storyteller専用のセマンティック検索最適化形式
  - 関係性・メタデータを明示的に構造化
- embedding APIはOpenRouter経由で提供（テスト環境でBM25フォールバック対応）
- 既存プロジェクト要素（キャラクター、設定等）の型定義を変更しない

## Restraints

- TDD（テスト駆動開発）を厳守
- 全テスト・フォーマッタ・Linter通過が完了条件
- 各フェーズで段階的にマージ可能な状態を保つ
- ドキュメント整備は実装と並行して実施

---

# Context

## 概要

原稿執筆時にAIに相談する際、キャラクター関係性、世界観設定、伏線状態などの情報が散在しており、手動でコンテキストを準備する必要があります。digrag
RAGを統合することで、storytellerの全要素を検索可能なドキュメント基盤に変換し、AIからの質問に対して最新の関連情報を自動取得できる環境を構築します。

期待効果：

- コンテキスト準備時間が自動化される
- 関連情報取得精度が90%以上に向上
- 更新反映がリアルタイム化される
- 月間運用コストが$0.03以下（embedding API費用）

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテスト、フォーマッタ、Linterが通過していること

## 開発のゴール

- storytellerの全要素タイプを**専用の精度重視Markdownドキュメント**に自動変換する仕組みを構築
- 差分検出によるインクリメンタル更新でパフォーマンス最適化
- story_directorプロンプトがRAG検索を活用し、創作支援の品質向上

---

# References

| @ref                        | @target              | @test                            |
| --------------------------- | -------------------- | -------------------------------- |
| PLAN_RAG_UNIFIED.md         | src/rag/             | tests/rag/*_test.ts              |
| PLAN_RAG_CHUNKING.md        | src/rag/chunker.ts   | tests/rag/chunker_test.ts        |
| RAG_IMPLEMENTATION_TASKS.md | src/cli/modules/rag/ | tests/cli/rag/*_test.ts          |
| PLAN_RAG_INTEGRATION.md     | src/mcp/prompts/     | tests/mcp/story_director_test.ts |

---

# Progress Map

| Process     | Status       | Progress     | Phase        | Notes                                     |
| ----------- | ------------ | ------------ | ------------ | ----------------------------------------- |
| Process 1   | planning     | ▯▯▯▯▯ 0%     | Red          | RAG基盤モジュール構造作成                 |
| Process 2   | planning     | ▯▯▯▯▯ 0%     | Red          | キャラクタードキュメントテンプレート      |
| Process 3   | planning     | ▯▯▯▯▯ 0%     | Red          | 設定ドキュメントテンプレート              |
| Process 10  | planning     | ▯▯▯▯▯ 0%     | Red          | チャンキングエンジン基盤                  |
| Process 11  | planning     | ▯▯▯▯▯ 0%     | Red          | rag export コマンド                       |
| Process 20  | planning     | ▯▯▯▯▯ 0%     | Red          | 全要素タイプ対応（伏線、タイムライン）    |
| Process 30  | planning     | ▯▯▯▯▯ 0%     | Red          | インクリメンタルエクスポート              |
| Process 40  | planning     | ▯▯▯▯▯ 0%     | Red          | 自動更新システム（rag update, Git hooks） |
| Process 50  | planning     | ▯▯▯▯▯ 0%     | Red          | MCP統合（story_director拡張）             |
|             |              |              |              |                                           |
| **Overall** | **planning** | **▯▯▯▯▯ 0%** | **planning** | **Blockers: 0**                           |

---

# Processes

## Process 1: RAG基盤モジュール構造作成

> **GitHub Issue**: feat(rag): RAG基盤モジュール構造を作成 **参照**:
> [Appendix A: 型定義](#appendix-a-型定義)

### Red Phase: テスト作成と失敗確認

- [ ] `tests/rag/document_generator_test.ts` 作成
  - RagDocument インターフェースのスキーム検証
  - DocumentGenerator インターフェース定義確認
- [ ] `tests/rag/types_test.ts` 作成
  - GeneratorOptions, ChunkingOptions 型検証
  - ExportResult 型検証
- [ ] テストを実行して失敗することを確認

**テストコード例**:

```typescript
// tests/rag/types_test.ts
import { assertEquals, assertExists } from "@std/assert";
import type {
  ExportResult,
  GeneratorOptions,
  RagDocument,
} from "@storyteller/rag/types.ts";

Deno.test("RagDocument - 必須フィールド検証", () => {
  const doc: RagDocument = {
    id: "character_hero",
    title: "Character: 勇者",
    date: "2025-01-15",
    tags: ["character", "protagonist"],
    content: "## 基本情報\n- ID: hero\n...",
    sourcePath: "src/characters/hero.ts",
  };

  assertExists(doc.id);
  assertExists(doc.title);
  assertExists(doc.date);
  assertEquals(doc.tags.length > 0, true);
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認

- [ ] `src/rag/` ディレクトリ構造作成
  ```
  src/rag/
  ├── mod.ts
  ├── types.ts
  ├── document_generator.ts
  ├── chunker.ts
  ├── templates/
  │   └── mod.ts
  └── metadata/
      └── mod.ts
  ```
- [ ] `src/rag/types.ts` に型定義を実装（Appendix A参照）
  - RagDocument インターフェース
  - GeneratorOptions インターフェース
  - ChunkingOptions インターフェース
  - ExportResult インターフェース
- [ ] `src/rag/mod.ts` でエクスポート
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認

- [ ] 型定義の正確性を確認
- [ ] JSDocコメント追加
- [ ] フォーマッタ・Lint実行
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 2: キャラクタードキュメントテンプレート実装

> **GitHub Issue**: feat(rag): キャラクタードキュメント生成テンプレートを実装
> **参照**:
> [Appendix B: digrag ChangelogEntry形式](#appendix-b-digrag-changelogentry形式),
> [Appendix C: サンプルプロジェクト構造](#appendix-c-サンプルプロジェクト構造)

### Red Phase: テスト作成と失敗確認

- [ ] `tests/rag/templates/character_test.ts` 作成
  - キャラクタードキュメント生成の入出力テスト
  - digrag ChangelogEntry形式確認
  - タグ生成ロジック検証
  - 関係性セクション生成確認
  - 成長フェーズセクション生成確認
- [ ] テストを実行して失敗することを確認

**テストコード例**:

```typescript
// tests/rag/templates/character_test.ts
import { assertEquals, assertStringIncludes } from "@std/assert";
import { generateCharacterDocument } from "@storyteller/rag/templates/character.ts";
import type { Character } from "@storyteller/types/v2/character.ts";

Deno.test("generateCharacterDocument - 基本的なキャラクター", () => {
  const character: Character = {
    id: "cinderella",
    name: "シンデレラ",
    role: "protagonist",
    traits: ["優しい", "忍耐強い", "美しい"],
    relationships: { prince: "romantic", stepmother: "enemy" },
    appearingChapters: ["chapter01", "chapter02"],
    summary: "継母にいじめられながらも優しさを失わない少女",
  };

  const doc = generateCharacterDocument(character);

  // digrag ChangelogEntry形式の確認
  assertStringIncludes(doc.title, "Character:");
  assertStringIncludes(doc.title, "シンデレラ");
  assertEquals(doc.id, "character_cinderella");

  // タグ確認
  assertEquals(doc.tags.includes("character"), true);
  assertEquals(doc.tags.includes("protagonist"), true);
  assertEquals(doc.tags.includes("chapter01"), true);

  // コンテンツ確認
  assertStringIncludes(doc.content, "## 基本情報");
  assertStringIncludes(doc.content, "役割: protagonist");
  assertStringIncludes(doc.content, "## 関係性");
  assertStringIncludes(doc.content, "prince");
});

Deno.test("generateCharacterDocument - 成長フェーズ付きキャラクター", () => {
  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["勇敢"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "王国を救う勇者",
    phases: [
      {
        id: "phase1",
        name: "出発前",
        summary: "平凡な日常",
        chapters: ["chapter01"],
      },
      {
        id: "phase2",
        name: "旅立ち",
        summary: "冒険の始まり",
        chapters: ["chapter02"],
      },
    ],
  };

  const doc = generateCharacterDocument(character);

  assertStringIncludes(doc.content, "## 成長フェーズ");
  assertStringIncludes(doc.content, "Phase 1");
  assertStringIncludes(doc.content, "出発前");
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認

- [ ] `src/rag/templates/character.ts` 作成
- [ ] `generateCharacterDocument()` 関数実装
  - Character型からRagDocument型への変換
  - digrag互換Markdown形式出力
  - タグ自動生成（role, chapters, traits）
  - 関係性セクション生成
  - 成長フェーズセクション生成
- [ ] `src/rag/templates/mod.ts` で再エクスポート
- [ ] テストを実行して成功することを確認

**実装コード例**:

```typescript
// src/rag/templates/character.ts
import type { Character } from "@storyteller/types/v2/character.ts";
import type { RagDocument } from "../types.ts";

/**
 * キャラクターからRAGドキュメントを生成
 */
export function generateCharacterDocument(character: Character): RagDocument {
  const tags = buildCharacterTags(character);
  const content = buildCharacterContent(character);

  return {
    id: `character_${character.id}`,
    title: `Character: ${character.name} ${
      new Date().toISOString().split("T")[0]
    }`,
    date: new Date().toISOString().split("T")[0],
    tags,
    content,
    sourcePath: `src/characters/${character.id}.ts`,
  };
}

function buildCharacterTags(character: Character): string[] {
  const tags: string[] = ["character", character.role];

  // 登場チャプター
  tags.push(...character.appearingChapters);

  // 特徴（最大5つ）
  tags.push(...character.traits.slice(0, 5));

  return tags;
}

function buildCharacterContent(character: Character): string {
  const sections: string[] = [];

  // 基本情報
  sections.push(`## 基本情報
- ID: ${character.id}
- 名前: ${character.name}
- 役割: ${character.role}
- 登場チャプター: ${character.appearingChapters.join(", ") || "（未設定）"}`);

  // 性格・特徴
  if (character.traits.length > 0) {
    sections.push(`## 性格・特徴
${character.traits.map((t) => `- ${t}`).join("\n")}`);
  }

  // 関係性
  const relationships = Object.entries(character.relationships);
  if (relationships.length > 0) {
    sections.push(`## 関係性
${relationships.map(([name, type]) => `- ${name}: ${type}`).join("\n")}`);
  }

  // 概要
  sections.push(`## 概要
${character.summary}`);

  // 成長フェーズ（存在する場合）
  if (character.phases && character.phases.length > 0) {
    sections.push(`## 成長フェーズ
${
      character.phases.map((p, i) =>
        `- Phase ${i + 1} (${p.chapters.join("-")}): ${p.name} - ${p.summary}`
      ).join("\n")
    }`);
  }

  return sections.join("\n\n");
}
```

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認

- [ ] コードの可読性向上（ヘルパー関数抽出など）
- [ ] エラーハンドリング整備
- [ ] JSDocコメント追加
- [ ] テスト継続実行確認

✅ **Phase Complete**

---

## Process 3: 設定ドキュメントテンプレート実装

> **GitHub Issue**: feat(rag): 設定ドキュメント生成テンプレートを実装 **参照**:
> [Appendix A: 型定義](#appendix-a-型定義),
> [Appendix C: サンプルプロジェクト構造](#appendix-c-サンプルプロジェクト構造)

### Red Phase: テスト作成と失敗確認

- [ ] `tests/rag/templates/setting_test.ts` 作成
  - 設定ドキュメント生成テスト
  - タイプ別タグ生成（location, item, system等）
  - 関連設定セクション生成確認
  - displayNames対応確認

**テストコード例**:

```typescript
// tests/rag/templates/setting_test.ts
import { assertEquals, assertStringIncludes } from "@std/assert";
import { generateSettingDocument } from "@storyteller/rag/templates/setting.ts";
import type { Setting } from "@storyteller/types/v2/setting.ts";

Deno.test("generateSettingDocument - 場所設定", () => {
  const setting: Setting = {
    id: "kingdom",
    name: "フェアリーテイル王国",
    type: "location",
    summary: "古き良き伝統と魔法が共存する王国",
    appearingChapters: ["chapter01", "chapter02"],
    displayNames: ["王国", "フェアリーテイル", "王都"],
    relatedSettings: ["castle", "mansion"],
  };

  const doc = generateSettingDocument(setting);

  assertStringIncludes(doc.title, "Setting:");
  assertEquals(doc.tags.includes("setting"), true);
  assertEquals(doc.tags.includes("location"), true);
  assertStringIncludes(doc.content, "## 関連設定");
  assertStringIncludes(doc.content, "castle");
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認

- [ ] `src/rag/templates/setting.ts` 作成
- [ ] `generateSettingDocument()` 関数実装
- [ ] テストを実行して成功することを確認

**実装コード例**:

```typescript
// src/rag/templates/setting.ts
import type { Setting } from "@storyteller/types/v2/setting.ts";
import type { RagDocument } from "../types.ts";

export function generateSettingDocument(setting: Setting): RagDocument {
  const tags = ["setting", setting.type, ...setting.appearingChapters];
  if (setting.displayNames) {
    tags.push(...setting.displayNames.slice(0, 3));
  }

  const sections: string[] = [];

  sections.push(`## 基本情報
- ID: ${setting.id}
- 名前: ${setting.name}
- タイプ: ${setting.type}
- 別名: ${setting.displayNames?.join(", ") || "（なし）"}`);

  sections.push(`## 概要
${setting.summary}`);

  if (setting.relatedSettings && setting.relatedSettings.length > 0) {
    sections.push(`## 関連設定
${setting.relatedSettings.map((s) => `- ${s}`).join("\n")}`);
  }

  return {
    id: `setting_${setting.id}`,
    title: `Setting: ${setting.name} ${new Date().toISOString().split("T")[0]}`,
    date: new Date().toISOString().split("T")[0],
    tags,
    content: sections.join("\n\n"),
    sourcePath: `src/settings/${setting.id}.ts`,
  };
}
```

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認

- [ ] コード品質改善
- [ ] テスト継続実行確認

✅ **Phase Complete**

---

## Process 10: チャンキングエンジン基盤実装

> **GitHub Issue**: feat(rag):
> チャンキングエンジン基盤とドキュメント単位分割を実装 **参照**:
> [Appendix D: チャンキング戦略](#appendix-d-チャンキング戦略)

### Red Phase: テスト作成と失敗確認

- [ ] `tests/rag/chunker_test.ts` 作成
  - 戦略選択ロジック（サイズベース）テスト
  - ドキュメント単位分割テスト
  - メタデータ継承テスト

**テストコード例**:

```typescript
// tests/rag/chunker_test.ts
import { assertEquals } from "@std/assert";
import {
  chunkContent,
  selectChunkingStrategy,
} from "@storyteller/rag/chunker.ts";
import type { ChunkingOptions } from "@storyteller/rag/types.ts";

Deno.test("selectChunkingStrategy - 小規模ファイルはドキュメント単位", () => {
  const content = "短いテキスト".repeat(100); // 約600文字
  const strategy = selectChunkingStrategy(content);
  assertEquals(strategy, "document");
});

Deno.test("selectChunkingStrategy - 中規模ファイルはシーン単位", () => {
  const content = "中規模テキスト".repeat(1000); // 約6000文字
  const strategy = selectChunkingStrategy(content);
  assertEquals(strategy, "scene");
});

Deno.test("chunkContent - ドキュメント単位は分割なし", () => {
  const content = "短いコンテンツ";
  const options: ChunkingOptions = {
    strategy: "document",
    maxChunkChars: 5000,
    overlapChars: 500,
    minChunkChars: 200,
  };

  const chunks = chunkContent(content, { id: "test", title: "Test" }, options);
  assertEquals(chunks.length, 1);
  assertEquals(chunks[0].content, content);
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認

- [ ] `src/rag/chunker.ts` 作成
- [ ] `Chunker` インターフェース定義
- [ ] `selectChunkingStrategy()` 関数実装
  - 〜3000文字：ドキュメント単位
  - 〜15000文字：シーン単位
  - 15000文字以上：セマンティック
- [ ] ドキュメント単位分割（分割なし）実装
- [ ] テストを実行して成功することを確認

**実装コード例**:

```typescript
// src/rag/chunker.ts
import type { ChunkingOptions, RagDocument } from "./types.ts";

export type ChunkingStrategy = "document" | "scene" | "semantic";

export interface DocumentMetadata {
  id: string;
  title: string;
  date?: string;
  tags?: string[];
  sourcePath?: string;
}

/**
 * コンテンツサイズに基づいてチャンキング戦略を選択
 */
export function selectChunkingStrategy(content: string): ChunkingStrategy {
  const charCount = content.length;

  // 小規模: ドキュメント単位（分割なし）
  if (charCount <= 3000) {
    return "document";
  }

  // 中規模: シーン単位（## 見出しで分割）
  if (charCount <= 15000) {
    return "scene";
  }

  // 大規模: セマンティック分割
  return "semantic";
}

/**
 * コンテンツをチャンクに分割
 */
export function chunkContent(
  content: string,
  metadata: DocumentMetadata,
  options: ChunkingOptions,
): RagDocument[] {
  const strategy = options.strategy === "auto"
    ? selectChunkingStrategy(content)
    : options.strategy;

  switch (strategy) {
    case "document":
      return [createSingleDocument(content, metadata)];
    case "scene":
      return chunkByScene(content, metadata, options);
    case "semantic":
      // Phase 2以降で実装
      return [createSingleDocument(content, metadata)];
    default:
      return [createSingleDocument(content, metadata)];
  }
}

function createSingleDocument(
  content: string,
  metadata: DocumentMetadata,
): RagDocument {
  return {
    id: metadata.id,
    title: metadata.title,
    date: metadata.date || new Date().toISOString().split("T")[0],
    tags: metadata.tags || [],
    content,
    sourcePath: metadata.sourcePath || "",
  };
}

function chunkByScene(
  content: string,
  metadata: DocumentMetadata,
  options: ChunkingOptions,
): RagDocument[] {
  // ## 見出しで分割
  const scenes = content.split(/(?=^## )/m);
  const documents: RagDocument[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];

    // 最小サイズ未満はスキップ
    if (scene.trim().length < options.minChunkChars) {
      continue;
    }

    // オーバーラップ追加
    const overlap = i > 0
      ? getOverlap(scenes[i - 1], options.overlapChars)
      : "";

    const chunkContent = overlap + scene;
    const sceneNum = String(i + 1).padStart(2, "0");

    documents.push({
      id: `${metadata.id}_scene${sceneNum}`,
      title: `${metadata.title} - Scene ${i + 1}`,
      date: metadata.date || new Date().toISOString().split("T")[0],
      tags: [...(metadata.tags || []), `scene${i + 1}`],
      content: chunkContent,
      sourcePath: metadata.sourcePath || "",
    });
  }

  return documents;
}

function getOverlap(previousContent: string, overlapChars: number): string {
  if (previousContent.length <= overlapChars) {
    return previousContent;
  }
  return "..." + previousContent.slice(-overlapChars);
}
```

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認

- [ ] テスト継続実行確認

✅ **Phase Complete**

---

## Process 11: rag export コマンド実装

> **GitHub Issue**: feat(cli): storyteller rag export コマンドを実装 **参照**:
> [Appendix E: CLIコマンド仕様](#appendix-e-cliコマンド仕様)

### Red Phase: テスト作成と失敗確認

- [ ] `tests/cli/rag/export_test.ts` 作成
  - コマンド引数解析テスト
  - ドキュメント生成統合テスト
  - JSON出力形式テスト

**テストコード例**:

```typescript
// tests/cli/rag/export_test.ts
import { assertEquals, assertExists } from "@std/assert";
import { parseRagExportOptions } from "@storyteller/cli/modules/rag/export.ts";

Deno.test("parseRagExportOptions - デフォルト値", () => {
  const options = parseRagExportOptions({});

  assertEquals(options.outputDir, ".rag-docs");
  assertEquals(options.manuscriptFormat, "full");
  assertEquals(options.chunking.strategy, "auto");
  assertEquals(options.incremental, false);
});

Deno.test("parseRagExportOptions - カスタム値", () => {
  const options = parseRagExportOptions({
    output: "custom-rag-docs",
    "manuscript-format": "summary",
    chunking: "scene",
    incremental: true,
  });

  assertEquals(options.outputDir, "custom-rag-docs");
  assertEquals(options.manuscriptFormat, "summary");
  assertEquals(options.chunking.strategy, "scene");
  assertEquals(options.incremental, true);
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認

- [ ] `src/cli/modules/rag/export.ts` 作成
- [ ] `src/cli/modules/rag/index.ts` 作成
- [ ] rag exportコマンドディスクリプタ定義
- [ ] オプション解析（--output, --manuscript-format, --chunking）
- [ ] DocumentGeneratorとの統合
- [ ] テストを実行して成功することを確認

**CLIインターフェース**:

```bash
storyteller rag export [options]

Options:
  -o, --output <dir>         Output directory (default: .rag-docs)
  --manuscript-format <fmt>  Manuscript format: full|summary (default: full)
  --chunking <strategy>      Chunking: document|scene|auto (default: auto)
  --incremental              Only export changed files
  --json                     Output result as JSON
  -h, --help                 Show help
```

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認

- [ ] テスト継続実行確認

✅ **Phase Complete**

---

## Process 20: 全要素タイプドキュメント対応

> **GitHub Issue**: feat(rag): 全要素タイプのドキュメント生成対応 **参照**:
> [Appendix A: 型定義](#appendix-a-型定義),
> [Appendix B: digrag ChangelogEntry形式](#appendix-b-digrag-changelogentry形式)

### Red Phase: テスト作成と失敗確認

- [ ] `tests/rag/templates/foreshadowing_test.ts` 作成
- [ ] `tests/rag/templates/timeline_test.ts` 作成
- [ ] `tests/rag/templates/manuscript_test.ts` 作成
- [ ] `tests/rag/templates/relationships_test.ts` 作成
- [ ] `tests/rag/templates/index_test.ts` 作成

**伏線テストコード例**:

```typescript
// tests/rag/templates/foreshadowing_test.ts
import { assertStringIncludes } from "@std/assert";
import { generateForeshadowingDocument } from "@storyteller/rag/templates/foreshadowing.ts";
import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

Deno.test("generateForeshadowingDocument - 設置済み伏線", () => {
  const foreshadowing: Foreshadowing = {
    id: "glass_slipper",
    name: "ガラスの靴の伏線",
    type: "chekhov",
    summary: "ガラスの靴による身元判明",
    planting: {
      chapter: "chapter02",
      description: "妖精のおばあさんが特別なガラスの靴を用意する",
    },
    status: "planted",
    importance: "major",
    relations: {
      characters: ["fairy_godmother", "cinderella"],
      settings: ["glass_slipper"],
    },
  };

  const doc = generateForeshadowingDocument(foreshadowing);

  assertStringIncludes(doc.title, "Foreshadowing:");
  assertStringIncludes(doc.content, "## 設置情報");
  assertStringIncludes(doc.content, "chapter02");
  assertEquals(doc.tags.includes("planted"), true);
  assertEquals(doc.tags.includes("chekhov"), true);
  assertEquals(doc.tags.includes("major"), true);
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認

- [ ] `src/rag/templates/foreshadowing.ts` 実装
  - 伏線ドキュメント生成
  - ステータス別タグ（planted, resolved等）
  - 設置・回収情報セクション
- [ ] `src/rag/templates/timeline.ts` 実装
  - タイムラインドキュメント生成
  - イベント個別ドキュメント生成
  - 因果関係セクション
- [ ] `src/rag/templates/manuscript.ts` 実装
  - 原稿ドキュメント生成
  - full/summaryモード対応
  - FrontMatter解析
- [ ] `src/rag/templates/relationships.ts` 実装
  - 関係性グラフドキュメント生成
  - 関係タイプ別グルーピング
- [ ] `src/rag/templates/index.ts` 実装
  - プロジェクト概要（_index.md）生成
  - 統計情報表示
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認

- [ ] テスト継続実行確認

✅ **Phase Complete**

---

## Process 30: シーン単位チャンキング実装

> **GitHub Issue**: feat(rag): シーン単位（## 見出し）チャンキングを実装
> **参照**: [Appendix D: チャンキング戦略](#appendix-d-チャンキング戦略)

### Red Phase: テスト作成と失敗確認

- [ ] `tests/rag/chunker_test.ts` に追加テスト
  - シーン単位分割（## 見出し）テスト
  - オーバーラップ処理テスト
  - 大きすぎるチャンクの再分割テスト

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認

- [ ] `chunkByScene()` 関数実装
  - ## 見出しでの分割ロジック
  - オーバーラップ処理（前シーン末尾N文字）
  - 大きすぎるチャンクの再分割
  - シーン番号タグ自動付与
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認

- [ ] テスト継続実行確認

✅ **Phase Complete**

---

## Process 40: インクリメンタルエクスポート実装

> **GitHub Issue**: feat(rag): インクリメンタルエクスポート機能を実装 **参照**:
> [Appendix F: インクリメンタルビルド仕様](#appendix-f-インクリメンタルビルド仕様)

### Red Phase: テスト作成と失敗確認

- [ ] `tests/rag/incremental_export_test.ts` 作成
  - ファイルハッシュ計算・保存テスト
  - 変更検出ロジック（added/modified/removed）テスト
  - 差分レポート出力テスト

**テストコード例**:

```typescript
// tests/rag/incremental_export_test.ts
import { assertEquals } from "@std/assert";
import {
  computeContentHash,
  detectChanges,
} from "@storyteller/rag/incremental.ts";

Deno.test("computeContentHash - 同一コンテンツは同一ハッシュ", () => {
  const hash1 = computeContentHash("Title", "Content");
  const hash2 = computeContentHash("Title", "Content");
  assertEquals(hash1, hash2);
});

Deno.test("computeContentHash - 異なるコンテンツは異なるハッシュ", () => {
  const hash1 = computeContentHash("Title", "Content A");
  const hash2 = computeContentHash("Title", "Content B");
  assertNotEquals(hash1, hash2);
});

Deno.test("detectChanges - 変更検出", () => {
  const previousState = {
    "doc1": "hash1",
    "doc2": "hash2",
    "doc3": "hash3",
  };

  const currentDocs = [
    { id: "doc1", hash: "hash1" }, // unchanged
    { id: "doc2", hash: "hash2_modified" }, // modified
    { id: "doc4", hash: "hash4" }, // added
    // doc3 is removed
  ];

  const diff = detectChanges(previousState, currentDocs);

  assertEquals(diff.unchanged.length, 1);
  assertEquals(diff.modified.length, 1);
  assertEquals(diff.added.length, 1);
  assertEquals(diff.removed.length, 1);
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認

- [ ] ファイルハッシュ計算機能実装
- [ ] `.rag-state.json` 状態管理
- [ ] 変更検出ロジック実装
- [ ] `DocumentGenerator.exportIncremental()` 実装
- [ ] テストを実行して成功することを確認

**状態ファイル形式**:

```json
{
  "lastExport": "2025-01-15T10:00:00Z",
  "files": {
    "src/characters/hero.ts": {
      "hash": "a3c5d2e1f7b9c4e6",
      "exportedAt": "2025-01-15T10:00:00Z"
    }
  }
}
```

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認

- [ ] テスト継続実行確認

✅ **Phase Complete**

---

## Process 50: 自動更新システム実装

> **GitHub Issue**: feat(cli): storyteller rag update コマンドを実装 /
> feat(cli): storyteller rag install-hooks コマンドを実装 **参照**:
> [Appendix E: CLIコマンド仕様](#appendix-e-cliコマンド仕様),
> [Appendix G: Git Hooks](#appendix-g-git-hooks)

### Red Phase: テスト作成と失敗確認

- [ ] `tests/cli/rag/update_test.ts` 作成
  - rag updateコマンド統合テスト
  - digrag build呼び出しテスト
- [ ] `tests/cli/rag/install_hooks_test.ts` 作成
  - Gitフック生成テスト
  - 既存フック検出テスト

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認

- [ ] `src/cli/modules/rag/update.ts` 実装
  - rag export + digrag buildを一括実行
  - `--no-embeddings` オプション対応
  - `--force` オプション対応
- [ ] `src/cli/modules/rag/install_hooks.ts` 実装
  - post-commit hookテンプレート
  - フック生成・インストール
  - 既存フック検出・警告
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認

- [ ] テスト継続実行確認

✅ **Phase Complete**

---

## Process 60: MCP統合（story_director拡張）

> **GitHub Issue**: feat(mcp): story_directorプロンプトにRAG検索統合を実装
> **参照**: [Appendix H: digrag MCP仕様](#appendix-h-digrag-mcp仕様)

### Red Phase: テスト作成と失敗確認

- [ ] `tests/mcp/story_director_rag_test.ts` 作成
  - story_directorプロンプト拡張テスト
  - focus引数マッピングテスト
  - 検索クエリ構築テスト

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認

- [ ] `src/mcp/prompts/definitions/story_director.ts` 拡張
  - `focus` 引数追加
  - `search_hint` 引数追加
  - タグフィルタマッピング実装
  - 検索クエリ構築ロジック
  - プロンプトテンプレート更新
- [ ] テストを実行して成功することを確認

**story_directorプロンプト拡張例**:

```typescript
// src/mcp/prompts/definitions/story_director.ts
export const storyDirectorPrompt: McpPromptDefinition = {
  name: "story_director",
  description: `
物語のディレクターとして、プロジェクト全体を把握して応答します。
digrag RAGを活用して関連情報を自動取得し、コンテキストに基づいた回答を提供します。
`,
  arguments: [
    {
      name: "question",
      description: "質問または相談内容",
      required: true,
    },
    {
      name: "focus",
      description: "フォーカス領域: character|setting|plot|foreshadowing|all",
      required: false,
    },
    {
      name: "search_hint",
      description: "RAG検索のヒント（追加キーワード）",
      required: false,
    },
  ],
  getMessages: async (args, context) => {
    const projectSummary = await getProjectSummary(context.project);
    const tagFilter = mapFocusToTag(args.focus);
    const searchQuery = buildSearchQuery(args.question, args.search_hint);

    return [
      {
        role: "user",
        content: `
あなたは物語「${projectSummary.name}」のディレクターです。

## プロジェクト概要
${projectSummary.summary}

## 統計情報
- キャラクター: ${projectSummary.characterCount}人
- 設定: ${projectSummary.settingCount}件
- 伏線: ${projectSummary.foreshadowingCount}件（未回収: ${projectSummary.unresolvedForeshadowings}件）
- 原稿: ${projectSummary.manuscriptCount}章

## 相談内容
${args.question}

## 推奨アクション
関連情報を取得するために、以下のdigragツールを使用してください:
- \`query_memos\`: "${searchQuery}" で検索${
          tagFilter ? `（tag: ${tagFilter}）` : ""
        }
- \`list_tags\`: 利用可能なタグを確認
- \`get_recent_memos\`: 最近更新された要素を確認

取得した情報に基づいて、創作的かつ具体的なアドバイスを提供してください。
`,
      },
    ];
  },
};

function mapFocusToTag(focus?: string): string | undefined {
  const mapping: Record<string, string> = {
    character: "character",
    setting: "setting",
    plot: "manuscript",
    foreshadowing: "foreshadowing",
  };
  return focus ? mapping[focus] : undefined;
}
```

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認

- [ ] テスト継続実行確認

✅ **Phase Complete**

---

## Process 200: ドキュメンテーション

### Red Phase: ドキュメント設計

- [ ] 文書化対象を特定
  - ユーザーガイド（docs/rag.md）
  - CLAUDE.md更新
  - README.md更新
  - MCP設定例
  - トラブルシューティング
- [ ] ドキュメント構成を作成

✅ **Phase Complete**

### Green Phase: ドキュメント記述

- [ ] `docs/rag.md` ユーザーガイド作成
  - セットアップ手順
  - CLIコマンドリファレンス
  - 日常運用ガイド
- [ ] CLAUDE.md更新（RAGコマンド追加）
- [ ] README.md更新（RAG機能紹介）
- [ ] MCP設定例ドキュメント更新
- [ ] トラブルシューティングセクション作成

✅ **Phase Complete**

### Refactor Phase: 品質確認

- [ ] 一貫性チェック（用語・フォーマット統一）
- [ ] 網羅性チェック（不足項目なし）
- [ ] リンク検証（リンク切れなし）
- [ ] 最終レビューと修正

✅ **Phase Complete**

---

## Process 300: OODAフィードバックループ（教訓・知見の保存）

### Red Phase: フィードバック収集設計

**Observe（観察）**

- [ ] 実装過程で発生した問題・課題を収集
- [ ] テスト結果から得られた知見を記録
- [ ] パフォーマンス計測結果（インクリメンタル効果等）

**Orient（方向付け）**

- [ ] 収集した情報をカテゴリ別に分類
  - Technical: RAGドキュメント生成パターン、チャンキング戦略
  - Process: インクリメンタル更新フロー、Git hook管理
  - Antipattern: 避けるべきパターン
  - Best Practice: digrag連携、MCP統合のベストプラクティス

✅ **Phase Complete**

### Green Phase: 教訓・知見の永続化

**Decide（決心）**

- [ ] 保存すべき教訓・知見を選定
- [ ] 各項目の保存先を決定
  - Serena Memory: 組織的な知見（RAG統合パターン等）
  - Project CLAUDE.md: プロジェクト固有のベストプラクティス

**Act（行動）**

- [ ] 教訓をSerena Memoryに永続化
- [ ] プロジェクト知見をCLAUDE.mdに記録

✅ **Phase Complete**

### Refactor Phase: フィードバック品質改善

**Feedback Loop**

- [ ] 保存した教訓の品質を検証
  - 再現可能性: 他のプロジェクトで適用可能か
  - 明確性: 内容が明確で理解しやすいか
  - 実用性: 実際に役立つ情報か

**Cross-Feedback**

- [ ] 他のProcess（1-60, 200）との連携を確認
- [ ] 将来のミッションへの引き継ぎ事項を整理

✅ **Phase Complete**

---

# Management

## Blockers

| ID | Description        | Status   | Resolution             |
| -- | ------------------ | -------- | ---------------------- |
| B1 | digrag API仕様確認 | resolved | Appendix Hで文書化済み |

## Lessons

| ID | Insight                                                 | Severity | Applied |
| -- | ------------------------------------------------------- | -------- | ------- |
| L1 | RAG統合による効率化の期待効果（コンテキスト準備自動化） | high     | ☐       |
| L2 | インクリメンタル更新の重要性（大規模プロジェクト対応）  | high     | ☐       |

## Feedback Log

| Date       | Type     | Content                     | Status |
| ---------- | -------- | --------------------------- | ------ |
| 2025-12-29 | planning | RAG統合計画をPLAN.md に反映 | open   |

## Completion Checklist

- [ ] すべてのProcess完了（1-60, 200, 300）
- [ ] すべてのテスト合格
- [ ] コードレビュー完了
- [ ] ドキュメント更新完了
- [ ] マージ可能な状態

---

# 実装フェーズ・スケジュール

## フェーズ別タイムライン

```
Week 1 (Phase 1): RAG基盤実装
├─ Day 1-2: Process 1 (基盤モジュール)
├─ Day 3: Process 2 (キャラクタードキュメント)
├─ Day 4: Process 3 (設定ドキュメント)
└─ Day 5: Process 11 (rag export コマンド)
  推定: 4日

Week 2 (Phase 1.5): チャンキング実装
├─ Day 1-2: Process 10 (チャンキング基盤)
├─ Day 3-4: Process 30 (シーン分割)
└─ Day 5: 統合テスト
  推定: 2.5日

Week 3 (Phase 2): 全要素対応
├─ Day 1-2: Process 20 (伏線/タイムライン/原稿/関係性/概要)
├─ Day 3: インテグレーションテスト
└─ Day 4-5: ドキュメント初版
  推定: 4日

Week 4 (Phase 3-4): インクリメンタル・自動更新
├─ Day 1-2: Process 40 (インクリメンタルエクスポート)
├─ Day 3-4: Process 50 (rag update, Git hooks)
└─ Day 5: インテグレーションテスト
  推定: 2日 + 2日

Week 5 (Phase 5): MCP統合・仕上げ
├─ Day 1-2: Process 60 (story_director拡張)
├─ Day 3-4: Process 200 (ドキュメント仕上げ)
├─ Day 5: Process 300 (OODAフィードバック)
└─ リリース準備
  推定: 4日

総工数: 18.5日（バッファ込み4週間）
```

## マイルストーン

| マイルストーン       | 完了条件                              | 予定日 |
| -------------------- | ------------------------------------- | ------ |
| M1: 基本エクスポート | キャラクター/設定のエクスポートが動作 | Week 1 |
| M2: 全要素対応       | 全要素タイプのエクスポートが動作      | Week 3 |
| M3: 自動更新         | Git hook経由の自動更新が動作          | Week 4 |
| M4: MCP統合          | Claude Codeからの利用が可能           | Week 5 |

---

# コスト試算

## embedding APIコスト

想定プロジェクト規模（cinderellaサンプル）：

- キャラクター: 10人 × 1000文字 = 10KB
- 設定: 15件 × 500文字 = 7.5KB
- 伏線: 8件 × 300文字 = 2.4KB
- タイムライン: 20イベント × 200文字 = 4KB
- 原稿: 10章 × 3000文字 = 30KB
- **合計**: 約53.9KB = 約54,000トークン

月1回フル更新 + 週3回インクリメンタル（10%相当）:

```
フル更新: 54,000 × 1 = 54,000トークン
インク更新: 54,000 × 0.1 × 12 = 64,800トークン
合計: 118,800トークン/月
コスト: 118,800 × 0.02 / 1,000,000 ≈ $0.00238/月
```

**実質無料レベル（$0.03以下）**

---

# リスク・対策

| リスク                     | 影響度 | 対策                                |
| -------------------------- | ------ | ----------------------------------- |
| digrag API仕様変更         | 高     | APIバージョン固定、互換性テスト強化 |
| OpenRouter API不安定       | 中     | BM25フォールバック、レート制限対応  |
| 大規模プロジェクト性能     | 中     | インクリメンタル処理、並列化検討    |
| ファイルハッシュ衝突       | 低     | SHA256採用で実質ゼロ                |
| embedding コスト予測外増加 | 低     | 月額上限監視、quota設定             |

---

# Appendices

## Appendix A: 型定義

### RagDocument型（実装対象）

```typescript
// src/rag/types.ts

/**
 * RAGドキュメント
 * digrag互換のドキュメント形式
 */
export interface RagDocument {
  /** ドキュメントID（ファイル名ベース） */
  id: string;
  /** digrag互換タイトル（`* Title YYYY-MM-DD` 形式用） */
  title: string;
  /** 日付（ISO8601: YYYY-MM-DD） */
  date: string;
  /** タグリスト（フィルタリング用） */
  tags: string[];
  /** 本文（Markdown形式） */
  content: string;
  /** 元ファイルパス */
  sourcePath: string;
}

/**
 * ドキュメント生成オプション
 */
export interface GeneratorOptions {
  /** 出力ディレクトリ（デフォルト: .rag-docs） */
  outputDir: string;
  /** 原稿出力形式: full=全文, summary=要約 */
  manuscriptFormat: "full" | "summary";
  /** チャンキング設定 */
  chunking: ChunkingOptions;
  /** インクリメンタルモード（変更分のみエクスポート） */
  incremental: boolean;
}

/**
 * チャンキングオプション
 */
export interface ChunkingOptions {
  /** チャンキング戦略: document=分割なし, scene=##見出し単位, semantic=意味単位, auto=自動選択 */
  strategy: "document" | "scene" | "semantic" | "auto";
  /** 最大チャンクサイズ（文字数、デフォルト: 5000） */
  maxChunkChars: number;
  /** オーバーラップ（文字数、デフォルト: 500） */
  overlapChars: number;
  /** 最小チャンクサイズ（文字数、デフォルト: 200） */
  minChunkChars: number;
}

/**
 * エクスポート結果
 */
export interface ExportResult {
  /** 生成されたドキュメント数 */
  documentCount: number;
  /** エラー */
  errors: ExportError[];
  /** 処理時間（ms） */
  duration: number;
  /** 差分情報（incrementalの場合） */
  diff?: {
    added: number;
    modified: number;
    removed: number;
    unchanged: number;
  };
}

export interface ExportError {
  /** エラーが発生したファイルパス */
  filePath: string;
  /** エラーメッセージ */
  message: string;
  /** エラーの種類 */
  type: "parse" | "generate" | "write";
}
```

### Character型（既存、参照用）

```typescript
// src/type/v2/character.ts

export type CharacterRole =
  | "protagonist"
  | "antagonist"
  | "supporting"
  | "guest";
export type RelationType =
  | "ally"
  | "enemy"
  | "neutral"
  | "romantic"
  | "respect"
  | "competitive"
  | "mentor";

export type Character = {
  /** 一意なID */
  id: string;
  /** キャラクター名 */
  name: string;
  /** 役割 */
  role: CharacterRole;
  /** 特徴・属性リスト */
  traits: string[];
  /** 他キャラクターとの関係性マップ */
  relationships: Record<string, RelationType>;
  /** 登場チャプターIDリスト */
  appearingChapters: string[];
  /** 短い概要 */
  summary: string;
  /** 表示名バリエーション（例: "勇者", "若者"） */
  displayNames?: string[];
  /** 別名・愛称 */
  aliases?: string[];
  /** 詳細情報 */
  details?: CharacterDetails;
  /** 成長フェーズリスト */
  phases?: CharacterPhase[];
};
```

### Setting型（既存、参照用）

```typescript
// src/type/v2/setting.ts

export type SettingType = "location" | "world" | "culture" | "organization";

export type Setting = {
  /** 一意なID */
  id: string;
  /** 設定名 */
  name: string;
  /** 設定の種類 */
  type: SettingType;
  /** 登場チャプターIDリスト */
  appearingChapters: string[];
  /** 短い概要 */
  summary: string;
  /** 表示名バリエーション */
  displayNames?: string[];
  /** 詳細情報 */
  details?: SettingDetails;
  /** 関連する設定ID */
  relatedSettings?: string[];
};
```

### Foreshadowing型（既存、参照用）

```typescript
// src/type/v2/foreshadowing.ts

export type ForeshadowingStatus =
  | "planted"
  | "partially_resolved"
  | "resolved"
  | "abandoned";
export type ForeshadowingType =
  | "hint"
  | "prophecy"
  | "mystery"
  | "symbol"
  | "chekhov"
  | "red_herring";
export type ForeshadowingImportance = "major" | "minor" | "subtle";

export type PlantingInfo = {
  chapter: string;
  description: string;
  excerpt?: string | { file: string };
  eventId?: string;
};

export type ResolutionInfo = {
  chapter: string;
  description: string;
  excerpt?: string | { file: string };
  eventId?: string;
  completeness: number; // 0.0 - 1.0
};

export type Foreshadowing = {
  id: string;
  name: string;
  type: ForeshadowingType;
  summary: string;
  planting: PlantingInfo;
  status: ForeshadowingStatus;
  importance?: ForeshadowingImportance;
  resolutions?: ResolutionInfo[];
  plannedResolutionChapter?: string;
  relations?: {
    characters: string[];
    settings: string[];
    relatedForeshadowings?: string[];
  };
  displayNames?: string[];
};
```

### Timeline型（既存、参照用）

```typescript
// src/type/v2/timeline.ts

export type EventCategory =
  | "plot_point"
  | "character_event"
  | "world_event"
  | "backstory"
  | "foreshadow"
  | "climax"
  | "resolution";
export type EventImportance = "major" | "minor" | "background";
export type TimelineScope = "story" | "world" | "character" | "arc";

export type TimePoint = {
  order: number;
  label?: string;
  date?: string;
  chapter?: string;
};

export type TimelineEvent = {
  id: string;
  title: string;
  category: EventCategory;
  time: TimePoint;
  summary: string;
  characters: string[];
  settings: string[];
  chapters: string[];
  causedBy?: string[];
  causes?: string[];
  importance?: EventImportance;
};

export type Timeline = {
  id: string;
  name: string;
  scope: TimelineScope;
  summary: string;
  events: TimelineEvent[];
  parentTimeline?: string;
  childTimelines?: string[];
  relatedCharacter?: string;
  displayNames?: string[];
};
```

---

## Appendix B: digrag ChangelogEntry形式

### 基本形式

digragが認識するドキュメント形式は `* Title YYYY-MM-DD`
で始まるChangelogEntry形式です。

```markdown
- Title YYYY-MM-DD Tags: tag1, tag2, tag3

  ## セクション1
  コンテンツ...

  ## セクション2
  コンテンツ...
```

### キャラクター出力例

```markdown
- Character: シンデレラ 2025-01-15 Tags: character, protagonist, chapter01,
  chapter02, 優しい, 忍耐強い

  ## 基本情報
  - ID: cinderella
  - 名前: シンデレラ
  - 役割: protagonist
  - 登場チャプター: chapter01, chapter02

  ## 性格・特徴
  - 優しい
  - 忍耐強い
  - 美しい
  - 夢見がち

  ## 関係性
  - stepmother: enemy（対立関係）
  - prince: romantic（恋愛関係）
  - fairy_godmother: ally（支援者）

  ## 概要
  継母にいじめられながらも優しさを失わない少女

  ## 成長フェーズ
  - Phase 1 (chapter01-02): 虐げられた日常
  - Phase 2 (chapter03): 魔法との出会い
  - Phase 3 (chapter04): 王子との出会い
```

### 設定出力例

```markdown
- Setting: フェアリーテイル王国 2025-01-15 Tags: setting, location, kingdom,
  王国, 王都

  ## 基本情報
  - ID: kingdom
  - 名前: フェアリーテイル王国
  - タイプ: location
  - 別名: 王国, フェアリーテイル, 王都

  ## 概要
  古き良き伝統と魔法が共存する王国。王子と姫の物語が生まれる舞台。

  ## 関連設定
  - castle: 王宮
  - mansion: シンデレラの屋敷
```

### 伏線出力例

```markdown
- Foreshadowing: ガラスの靴の伏線 2025-01-15 Tags: foreshadowing, chekhov,
  major, planted, chapter02

  ## 基本情報
  - ID: glass_slipper_foreshadowing
  - タイプ: chekhov（チェーホフの銃）
  - 重要度: major
  - 状態: planted（設置済み・未回収）

  ## 設置情報
  - チャプター: chapter02
  - 説明: 妖精のおばあさんが特別なガラスの靴を用意する

  ## 関連要素
  - キャラクター: fairy_godmother, cinderella
  - 設定: glass_slipper

  ## 回収予定
  - 予定チャプター: chapter04
  - 回収方法: 王子がガラスの靴で花嫁を探す
```

### タイムラインイベント出力例

```markdown
- Event: 舞踏会への招待 2025-01-15 Tags: event, plot_point, major, chapter02

  ## 基本情報
  - ID: ball_invitation
  - カテゴリ: plot_point
  - 重要度: major
  - 発生時点: Order 5 (chapter02)

  ## 概要
  王子の花嫁選びの舞踏会への招待状が届く

  ## 関連要素
  - キャラクター: cinderella, prince, stepmother
  - 設定: castle
  - チャプター: chapter02

  ## 因果関係
  - 原因: 王の決断（king_decision）
  - 結果: シンデレラの変身（cinderella_transformation）
```

### 関係性グラフ出力例

```markdown
- Relationships: キャラクター関係性グラフ 2025-01-15 Tags: relationships, graph,
  meta

  ## 対立関係 (enemy)
  - シンデレラ ←→ 継母: 虐待する/耐える
  - シンデレラ ←→ ドリゼラ: いじめる/我慢
  - シンデレラ ←→ アナスタシア: いじめる/我慢

  ## 恋愛関係 (romantic)
  - シンデレラ ←→ 王子: 相思相愛

  ## 支援関係 (ally)
  - 妖精のおばあさん → シンデレラ: 魔法で支援

  ## 師弟関係 (mentor)
  - 王 → 王子: 父として導く
```

### プロジェクト概要出力例

```markdown
- Index: シンデレラ物語プロジェクト概要 2025-01-15 Tags: index, meta, overview

  ## プロジェクト情報
  - プロジェクト名: cinderella
  - 作成日: 2025-01-01
  - 最終更新: 2025-01-15

  ## 統計
  - キャラクター数: 10
  - 設定数: 5
  - 伏線数: 3 (設置済み: 2, 回収済み: 1)
  - 原稿チャプター数: 4

  ## 主要キャラクター
  1. シンデレラ (protagonist)
  2. 王子 (supporting)
  3. 継母 (antagonist)
  4. 妖精のおばあさん (supporting)

  ## あらすじ
  継母にいじめられるシンデレラが、妖精の魔法で舞踏会に参加し、
  王子と出会う古典的なおとぎ話。

  ## 現在の執筆状況
  - chapter01: 完成
  - chapter02: 完成
  - chapter03: 執筆中
  - chapter04: 未着手
```

---

## Appendix C: サンプルプロジェクト構造

### cinderellaサンプルのディレクトリ構造

```
samples/cinderella/
├── deno.json                      # Denoプロジェクト設定（import map含む）
├── story.ts                       # 物語のエントリポイント
├── story.config.ts                # 設定ファイル
├── .storyteller.json              # storyteller設定
├── .mcp.json                      # MCP設定
├── src/
│   ├── characters/                # キャラクター定義
│   │   ├── cinderella.ts          # シンデレラ
│   │   ├── prince.ts              # 王子
│   │   ├── stepmother.ts          # 継母
│   │   ├── fairy_godmother.ts     # 妖精のおばあさん
│   │   └── ...
│   ├── settings/                  # 設定定義
│   │   ├── kingdom.ts             # フェアリーテイル王国
│   │   ├── castle.ts              # 王宮
│   │   ├── mansion.ts             # 屋敷
│   │   ├── glass_slipper.ts       # ガラスの靴
│   │   └── magic_system.ts        # 魔法システム
│   ├── foreshadowings/            # 伏線定義
│   │   ├── ガラスの靴の伏線.ts
│   │   ├── 真夜中の期限.ts
│   │   └── 継母の嫉妬の理由.ts
│   └── timeline/                  # タイムライン定義
│       └── ...
├── manuscripts/                   # 原稿
│   ├── chapter01.md               # 第1章原稿
│   ├── chapter01.meta.ts          # 第1章メタデータ
│   ├── chapter02.md
│   └── ...
└── tests/                         # テスト
    └── story_test.ts
```

### キャラクター定義例（実際のコード）

```typescript
// samples/cinderella/src/characters/cinderella.ts
import type { Character } from "@storyteller/types/v2/character.ts";

/**
 * シンデレラ
 * 継母にいじめられながらも優しさを失わない少女
 */
export const cinderella: Character = {
  "id": "cinderella",
  "name": "シンデレラ",
  "role": "protagonist",
  "traits": [
    "優しい",
    "忍耐強い",
    "美しい",
    "夢見がち",
  ],
  "relationships": {},
  "appearingChapters": [],
  "summary": "継母にいじめられながらも優しさを失わない少女",
  "details": {
    "description": { "file": "./cinderella_description.md" },
  },
};
```

### 設定定義例（実際のコード）

```typescript
// samples/cinderella/src/settings/kingdom.ts
import type { Setting } from "@storyteller/types/v2/setting.ts";

/**
 * フェアリーテイル王国
 * 古き良き伝統と魔法が共存する王国。王子と姫の物語が生まれる舞台。
 */
export const kingdom: Setting = {
  "id": "kingdom",
  "name": "フェアリーテイル王国",
  "type": "location",
  "summary": "古き良き伝統と魔法が共存する王国。王子と姫の物語が生まれる舞台。",
  "appearingChapters": [],
  "displayNames": [
    "王国",
    "フェアリーテイル",
    "王都",
  ],
  "relatedSettings": [
    "castle",
    "mansion",
  ],
};
```

### 伏線定義例（実際のコード）

```typescript
// samples/cinderella/src/foreshadowings/ガラスの靴の伏線.ts
import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

/**
 * ガラスの靴の伏線
 */
export const ガラスの靴の伏線: Foreshadowing = {
  "id": "ガラスの靴の伏線",
  "name": "ガラスの靴の伏線",
  "type": "chekhov",
  "summary": "ガラスの靴の伏線の概要（要追加）",
  "planting": {
    "chapter": "chapter_02",
    "description": "妖精のおばあさんが特別なガラスの靴を用意する",
  },
  "status": "planted",
  "importance": "major",
  "relations": {
    "characters": [
      "fairy_godmother",
      "cinderella",
    ],
    "settings": [
      "glass_slipper",
    ],
  },
  "displayNames": [
    "ガラスの靴",
    "特別な靴",
  ],
};
```

### 原稿例（FrontMatter付き）

```markdown
---
storyteller:
  chapter_id: chapter01
  title: "灰かぶり姫の日常"
  order: 1
  characters:
    - cinderella
    - stepmother
    - stepsister_elder
    - stepsister_younger
  settings:
    - mansion
---

# 第1章：灰かぶり姫の日常

## Scene 1

屋敷の朝は、シンデレラにとっていつも同じだった。

夜明け前に起き出し、暖炉の灰をかき出す。その灰が髪や顔につくことから、義姉たちは彼女を「灰かぶり姫」と呼んでからかった。

「シンデレラ！まだ朝食の準備ができていないの？」

継母の甲高い声が屋敷中に響く。

## Scene 2

「ドリゼラお姉様、アナスタシアお姉様、朝食の準備ができました」

シンデレラは丁寧に頭を下げた。

「遅いわよ、まったく」ドリゼラは不機嫌そうに言った。

## Scene 3

屋敷の片隅にある小さな部屋が、シンデレラの居場所だった。

窓から見える空を眺めながら、彼女は小さな声で歌を口ずさむ。
```

---

## Appendix D: チャンキング戦略

### 戦略選択フロー

```
ファイルサイズ判定
│
├─ 小（〜3,000文字）
│   └─ 戦略A: ドキュメント単位（分割なし）
│
├─ 中（3,000〜15,000文字）
│   └─ 戦略B: シーン単位分割
│
└─ 大（15,000文字超）
    └─ 戦略C: セマンティック分割（将来実装）
```

### 戦略A: ドキュメント単位（推奨：小規模）

```
対象: 〜3,000文字
分割: なし（1ファイル = 1ドキュメント）
オーバーラップ: 不要

メリット:
├─ 最もシンプル
├─ コンテキスト損失なし
├─ 埋め込みコスト最小
└─ digrag互換性最高

用途:
├─ キャラクター定義
├─ 設定定義
├─ 伏線定義
└─ 単一タイムラインイベント
```

### 戦略B: シーン単位分割（推奨：中規模）

```
対象: 3,000〜15,000文字
分割単位: ## 見出し（Scene区切り）
チャンクサイズ: 目標〜5,000文字
オーバーラップ: 10%（〜500文字）

メリット:
├─ 物語構造を尊重
├─ シーン単位の検索精度向上
├─ 自然な境界で分割
└─ メタデータ継承が容易

処理フロー:
1. ## 見出しで分割
2. 各シーンにメタデータを継承
3. オーバーラップとして前シーン末尾を追加
4. シーン番号タグを自動付与

出力例:
┌────────────────────────────────────────────────┐
│ * Manuscript: chapter01_scene01 2025-01-15     │
│   Tags: manuscript, chapter01, scene01         │
│                                                │
│   ## メタデータ                                 │
│   - チャプターID: chapter01                     │
│   - シーン番号: 1                               │
│   - 登場キャラクター: cinderella, stepmother   │
│                                                │
│   ## 本文                                       │
│   屋敷の朝は、シンデレラにとっていつも同じ...   │
└────────────────────────────────────────────────┘
```

### 戦略C: セマンティック分割（将来実装、大規模用）

```
対象: 15,000文字超
分割方式: RecursiveCharacterTextSplitter相当
チャンクサイズ: 〜4,000文字
オーバーラップ: 10-20%

分割優先順位:
1. ## 見出し（Scene区切り）
2. 段落（空行）
3. 文（。）
4. 文字

注意点:
├─ 埋め込みコスト増加
├─ 実装複雑度上昇
└─ メタデータ継承の設計必要
```

### digrag制約

- **MAX_TEXT_CHARS**: 6,000文字（digrag実装の制限）
- 推奨最大チャンクサイズ: 5,000文字（安全マージン確保）

### トークン数・文字数の関係

```
日本語テキストの場合:
├─ 1文字 ≒ 1.3〜1.5トークン（平均）
├─ 8,191トークン ≒ 5,500〜6,300文字
└─ digrag MAX_TEXT_CHARS = 6,000文字（安全マージン確保）
```

---

## Appendix E: CLIコマンド仕様

### storyteller rag（メインコマンド）

プロジェクト全要素をRAGインデックスに一括変換。ドキュメント生成とインデックス構築を自動実行。

```bash
storyteller rag [options]

Options:
  -o, --output <dir>         RAG docs directory (default: .rag-docs)
  -i, --index-dir <dir>      Index directory (default: .rag)
  --manuscript-format <fmt>  Manuscript format: full|summary (default: full)
  --chunking <strategy>      Chunking: document|scene|auto (default: auto)
  --incremental              Only process changed files
  --no-embeddings            Skip embedding generation (BM25 only)
  --json                     Output result as JSON
  -h, --help                 Show help

Examples:
  storyteller rag                          # 一括変換
  storyteller rag --incremental            # 差分のみ更新
  storyteller rag --no-embeddings          # BM25のみ（高速）
  storyteller rag export                   # サブコマンド: エクスポートのみ
  storyteller rag build                    # サブコマンド: ビルドのみ
```

### storyteller rag export

プロジェクト要素をRAGドキュメントにエクスポート。

```bash
storyteller rag export [options]

Options:
  -o, --output <dir>         Output directory (default: .rag-docs)
  --manuscript-format <fmt>  Manuscript format: full|summary (default: full)
  --chunking <strategy>      Chunking: document|scene|auto (default: auto)
  --incremental              Only export changed files
  --json                     Output result as JSON
  -h, --help                 Show help

Examples:
  storyteller rag export
  storyteller rag export --output .rag-docs
  storyteller rag export --manuscript-format summary
  storyteller rag export --incremental
```

### storyteller rag update

エクスポート + digrag buildを一括実行。

```bash
storyteller rag update [options]

Options:
  -o, --output <dir>    RAG docs directory (default: .rag-docs)
  -i, --index-dir <dir> digrag index directory (default: .rag)
  --no-embeddings       Skip embedding generation (BM25 only)
  --force               Force full rebuild
  --json                Output result as JSON

Examples:
  storyteller rag update
  storyteller rag update --no-embeddings
  storyteller rag update --force
```

### storyteller rag install-hooks

Git hooksをインストール。

```bash
storyteller rag install-hooks [options]

Options:
  --force  Overwrite existing hooks
  --hook   Hook type: post-commit|pre-push (default: post-commit)

Examples:
  storyteller rag install-hooks
  storyteller rag install-hooks --force
  storyteller rag install-hooks --hook pre-push
```

---

## Appendix F: インクリメンタルビルド仕様

### ハッシュベース差分検出

```typescript
// SHA256ハッシュ計算
function computeContentHash(title: string, text: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(title + "\0" + text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // 最初の8バイト = 16 hex文字
  return hashArray.slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
}
```

### 状態ファイル形式

```json
// .rag-state.json
{
  "version": 1,
  "lastExport": "2025-01-15T10:00:00Z",
  "files": {
    "src/characters/hero.ts": {
      "hash": "a3c5d2e1f7b9c4e6",
      "exportedAt": "2025-01-15T10:00:00Z",
      "outputFiles": ["characters/hero.md"]
    },
    "manuscripts/chapter01.md": {
      "hash": "b7e2f1d9c5a3e8f4",
      "exportedAt": "2025-01-15T10:00:00Z",
      "outputFiles": [
        "manuscripts/chapter01_scene01.md",
        "manuscripts/chapter01_scene02.md",
        "manuscripts/chapter01_scene03.md"
      ]
    }
  }
}
```

### 差分分類

```typescript
interface IncrementalDiff {
  added: Document[]; // 新規ファイル
  modified: Document[]; // 変更されたファイル
  removed: string[]; // 削除されたファイル
  unchanged: string[]; // 変更なし
}
```

### コスト削減効果

```
シナリオ: 週次更新（640文書プロジェクト）

従来型（毎回フル構築）:
  52週 × 640文書 = 33,280 API呼び出し
  コスト: $1.00/年

インクリメンタル型（変更率1-2%）:
  52週 × 7文書 = 364 API呼び出し
  コスト: $0.011/年

削減率: 98.9%
```

---

## Appendix G: Git Hooks

### post-commit hook テンプレート

```bash
#!/bin/bash
# .git/hooks/post-commit (storyteller rag)

set -e

# 変更されたファイルを取得
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)

# storyteller関連ファイルの変更を検出
STORY_CHANGES=$(echo "$CHANGED_FILES" | grep -E "^(src/|manuscripts/)" || true)

if [ -n "$STORY_CHANGES" ]; then
    echo "[storyteller] Updating RAG index..."

    # 1. RAGドキュメント生成（インクリメンタル）
    storyteller rag export --output .rag-docs --incremental 2>/dev/null || {
        echo "[storyteller] Warning: rag export failed"
        exit 0
    }

    # 2. digragインデックス更新（インクリメンタル + embedding）
    if command -v digrag &> /dev/null; then
        digrag build --input .rag-docs --output .rag --with-embeddings --incremental 2>/dev/null || {
            echo "[storyteller] Warning: digrag build failed"
            exit 0
        }
        echo "[storyteller] RAG index updated successfully"
    else
        echo "[storyteller] Warning: digrag not found, skipping index build"
    fi
fi
```

### pre-push hook テンプレート（代替）

```bash
#!/bin/bash
# .git/hooks/pre-push (storyteller rag)

# push前にインデックスを最新化
echo "[storyteller] Ensuring RAG index is up to date..."

storyteller rag export --output .rag-docs 2>/dev/null || exit 0

if command -v digrag &> /dev/null; then
    digrag build --input .rag-docs --output .rag --with-embeddings --incremental 2>/dev/null || exit 0
fi

# .rag-docs と .rag は .gitignore に追加済み想定
```

### .gitignore 追加推奨

```gitignore
# RAG関連
.rag-docs/
.rag/
.rag-state.json
```

---

## Appendix H: digrag MCP仕様

### 概要

digragはMCP（Model Context Protocol）サーバーとして動作し、Claude Code/Claude
Desktopから直接検索機能を利用できます。

### MCPサーバー起動

```bash
digrag serve --index-dir .rag
```

### 提供ツール

#### query_memos

ドキュメントを検索します。

```typescript
// パラメータ
interface QueryMemosParams {
  /** 検索クエリ（必須） */
  query: string;
  /** 返す結果件数（デフォルト: 10） */
  top_k?: number;
  /** タグフィルタ（オプション） */
  tag_filter?: string;
  /** 検索モード: "bm25" | "semantic" | "hybrid"（デフォルト: "bm25"） */
  mode?: string;
  /** コンテンツ抽出戦略: "snippet" | "entry" | "full"（デフォルト: "snippet"） */
  extraction_mode?: string;
  /** 最大抽出文字数（デフォルト: 5000） */
  max_chars?: number;
  /** 要約を含める（デフォルト: true） */
  include_summary?: boolean;
  /** 生テキストを含める（デフォルト: true） */
  include_raw?: boolean;
}

// レスポンス
interface QueryMemosResponse {
  results: MemoResult[];
  total: number;
}

interface MemoResult {
  id: string;
  title: string;
  date: string;
  tags: string[];
  snippet: string;
  score: number;
  summary?: Summary;
  raw_content?: string;
}
```

**使用例**:

```json
{
  "query": "シンデレラ 王子 関係性",
  "mode": "hybrid",
  "top_k": 5,
  "tag_filter": "character"
}
```

#### list_tags

インデックス内のすべてのタグをリストアップします。

```typescript
// パラメータ: なし

// レスポンス
interface ListTagsResponse {
  tags: TagInfo[];
}

interface TagInfo {
  name: string;
  count: number;
}
```

#### get_recent_memos

最近更新されたドキュメントを取得します。

```typescript
// パラメータ
interface GetRecentMemosParams {
  /** 取得件数（デフォルト: 10） */
  limit?: number;
}

// レスポンス
interface GetRecentMemosResponse {
  memos: MemoResult[];
}
```

### MCP設定例

```json
// .mcp.json
{
  "mcpServers": {
    "storyteller": {
      "command": "storyteller",
      "args": ["mcp", "start", "--stdio", "--path", "."]
    },
    "digrag": {
      "command": "digrag",
      "args": ["serve", "--index-dir", ".rag"],
      "env": {
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}"
      }
    }
  }
}
```

### 検索モード

| モード   | 説明            | 特徴                        |
| -------- | --------------- | --------------------------- |
| bm25     | キーワード検索  | 高速（~30μs）、APIコスト0   |
| semantic | ベクトル検索    | 意味的類似性、embedding必要 |
| hybrid   | BM25 + Semantic | 最高精度、RRFで結果融合     |

### extraction_mode

| モード  | 説明               | 用途               |
| ------- | ------------------ | ------------------ |
| snippet | 最初のN文字        | プレビュー表示     |
| entry   | ChangelogEntry単位 | 構造化ドキュメント |
| full    | 全文               | 詳細表示           |

---

## Appendix I: OpenRouter Embeddings API

### エンドポイント

```
POST https://openrouter.ai/api/v1/embeddings
```

### 必須ヘッダー

```
Authorization: Bearer {OPENROUTER_API_KEY}
Content-Type: application/json
```

### リクエスト形式

```json
{
  "model": "openai/text-embedding-3-small",
  "input": "テキストまたはテキスト配列"
}
```

**バッチリクエスト例**:

```json
{
  "model": "openai/text-embedding-3-small",
  "input": [
    "シンデレラは優しい少女です",
    "王子は舞踏会で彼女に出会いました",
    "ガラスの靴が物語の鍵となります"
  ]
}
```

### レスポンス形式

```json
{
  "data": [
    {
      "embedding": [0.123, -0.456, 0.789, ...],
      "index": 0
    },
    {
      "embedding": [0.234, -0.567, 0.890, ...],
      "index": 1
    }
  ],
  "model": "openai/text-embedding-3-small",
  "usage": {
    "prompt_tokens": 45,
    "total_tokens": 45
  }
}
```

### エラーコード

| コード | 説明             | 対処                            |
| ------ | ---------------- | ------------------------------- |
| 400    | 無効な入力形式   | パラメータ確認                  |
| 401    | APIキー無効      | キー再確認                      |
| 402    | クレジット不足   | クレジット追加                  |
| 404    | モデル不存在     | モデル名確認                    |
| 429    | レート制限       | リトライ（exponential backoff） |
| 529    | プロバイダ過負荷 | 時間をおいてリトライ            |

### 推奨モデル

| モデル                        | 価格/1Mトークン | 次元数 | 特徴                                 |
| ----------------------------- | --------------- | ------ | ------------------------------------ |
| openai/text-embedding-3-small | $0.02           | 1536   | digragデフォルト、高品質、多言語対応 |
| openai/text-embedding-3-large | $0.13           | 3072   | 最高精度、コスト高                   |
| qwen/qwen3-embedding-8b       | $0.01           | -      | 最安、多言語、長文対応（32K）        |

### エラーハンドリング例

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/text-embedding-3-small",
          input: text,
        }),
      });

      if (response.status === 429) {
        // レート制限: exponential backoff
        const waitTime = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Max retries exceeded");
}
```

---

## Appendix J: テストデータ・モックデータ

### キャラクターモックデータ

```typescript
// tests/fixtures/mock_character.ts
import type { Character } from "@storyteller/types/v2/character.ts";

export const mockHero: Character = {
  id: "hero",
  name: "勇者",
  role: "protagonist",
  traits: ["勇敢", "正義感", "誠実"],
  relationships: {
    princess: "romantic",
    demon_lord: "enemy",
    mentor: "mentor",
  },
  appearingChapters: ["chapter01", "chapter02", "chapter03"],
  summary: "王国を救う運命を背負った若者",
  displayNames: ["勇者", "若者", "英雄"],
  phases: [
    {
      id: "phase1",
      name: "平凡な日常",
      summary: "村での平和な暮らし",
      chapters: ["chapter01"],
    },
    {
      id: "phase2",
      name: "旅立ち",
      summary: "使命を受け冒険の旅へ",
      chapters: ["chapter02", "chapter03"],
    },
  ],
};

export const mockVillain: Character = {
  id: "demon_lord",
  name: "魔王",
  role: "antagonist",
  traits: ["冷酷", "強大", "孤独"],
  relationships: {
    hero: "enemy",
  },
  appearingChapters: ["chapter03"],
  summary: "世界を支配しようとする存在",
};
```

### 設定モックデータ

```typescript
// tests/fixtures/mock_setting.ts
import type { Setting } from "@storyteller/types/v2/setting.ts";

export const mockKingdom: Setting = {
  id: "kingdom",
  name: "アルテミス王国",
  type: "location",
  summary: "勇者が生まれ育った平和な王国",
  appearingChapters: ["chapter01", "chapter02"],
  displayNames: ["王国", "アルテミス", "故郷"],
  relatedSettings: ["castle", "village"],
};
```

### 伏線モックデータ

```typescript
// tests/fixtures/mock_foreshadowing.ts
import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

export const mockSword: Foreshadowing = {
  id: "legendary_sword",
  name: "伝説の剣",
  type: "chekhov",
  summary: "勇者だけが抜ける伝説の剣",
  planting: {
    chapter: "chapter01",
    description: "村の祠に眠る古い剣が紹介される",
  },
  status: "planted",
  importance: "major",
  relations: {
    characters: ["hero", "mentor"],
    settings: ["shrine"],
  },
  plannedResolutionChapter: "chapter03",
};
```

### 原稿モックデータ

```typescript
// tests/fixtures/mock_manuscript.ts
export const mockManuscript = {
  frontMatter: {
    storyteller: {
      chapter_id: "chapter01",
      title: "始まりの日",
      order: 1,
      characters: ["hero", "mentor"],
      settings: ["village"],
    },
  },
  content: `# 第1章：始まりの日

## Scene 1

村は朝靄に包まれていた。

勇者と呼ばれることになる青年は、まだ自分の運命を知らない。
いつものように畑仕事をしていた。

## Scene 2

「お前に話がある」

師匠の声がした。
青年は手を止め、振り返った。

## Scene 3

夕暮れの空を見上げながら、青年は決意を固めた。
明日から、旅が始まる。
`,
};
```

---

<!--
Process番号規則
- 1-9: 機能実装
- 10-49: テスト拡充
- 50-99: フォローアップ
- 100-199: 品質向上（リファクタリング）
- 200-299: ドキュメンテーション
- 300+: OODAフィードバックループ（教訓・知見保存）
-->
