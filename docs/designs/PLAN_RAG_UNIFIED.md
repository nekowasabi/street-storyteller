# storyteller RAG統合 - 統合設計ドキュメント

> **目的**: storytellerプロジェクトにdigrag
> RAGを統合し、原稿執筆時のAI相談において
> プロジェクトの最新状態を踏まえた回答を可能にする

**作成日**: 2025-12-29 **関連ドキュメント**:

- [PLAN_RAG_INTEGRATION.md](./PLAN_RAG_INTEGRATION.md) - RAG連携基本設計
- [PLAN_RAG_CHUNKING.md](./PLAN_RAG_CHUNKING.md) - チャンキング戦略

---

## 1. エグゼクティブサマリー

### 1.1 背景

原稿執筆時にAIに相談する際、以下の情報が散在しており手動コンテキスト管理が非効率:

- キャラクター情報（性格、関係性、成長フェーズ）
- 設定（場所、アイテム、魔法システム）
- 伏線（設置・回収状態）
- 既存原稿内容
- 時系列イベントと因果関係

### 1.2 解決策

**digrag RAG**と**storyteller**を連携:

1. storytellerの各要素を**検索可能なドキュメント**に変換
2. digragの**インクリメンタルビルド**で最新状態を維持
3. AIが相談時に**自動RAG検索**で関連情報を取得

### 1.3 期待効果

| 指標                 | 現状             | 目標         |
| -------------------- | ---------------- | ------------ |
| コンテキスト準備時間 | 5-10分/相談      | 自動化       |
| 関連情報取得精度     | 手動（漏れあり） | 90%+         |
| 更新反映遅延         | 手動更新         | リアルタイム |
| 月間運用コスト       | -                | $0.03以下    |

---

## 2. システムアーキテクチャ

### 2.1 全体構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                    storyteller プロジェクト                          │
├─────────────────────────────────────────────────────────────────────┤
│  src/characters/*.ts    → キャラクター定義                           │
│  src/settings/*.ts      → 設定定義                                   │
│  src/foreshadowings/*.ts → 伏線定義                                  │
│  manuscripts/*.md       → 原稿                                       │
│  src/timeline/*.ts      → タイムライン                               │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  storyteller rag export                              │
│                 (RAG Document Generator)                             │
├─────────────────────────────────────────────────────────────────────┤
│  1. TypeScript/Markdown読み込み                                      │
│  2. digrag互換Markdownへ変換                                         │
│  3. チャンキング戦略適用                                              │
│  4. メタデータ・タグ付与                                              │
│  5. .rag-docs/ へ出力                                                │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     .rag-docs/ ディレクトリ                          │
├─────────────────────────────────────────────────────────────────────┤
│  _index.md              → プロジェクト概要                           │
│  characters/*.md        → キャラクター情報                           │
│  settings/*.md          → 設定情報                                   │
│  foreshadowings/*.md    → 伏線情報                                   │
│  manuscripts/*.md       → 原稿（全文 or シーン分割）                 │
│  relationships/graph.md → 関係性グラフ                               │
│  timeline/*.md          → タイムライン                               │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      digrag build                                    │
├─────────────────────────────────────────────────────────────────────┤
│  digrag build --input .rag-docs --output .rag                        │
│              --with-embeddings --incremental                         │
│                                                                      │
│  → BM25インデックス + Vectorインデックス生成                         │
│  → 変更分のみ処理（インクリメンタル）                                │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│               Claude Code / Claude Desktop                           │
├─────────────────────────────────────────────────────────────────────┤
│  storyteller MCP:                                                    │
│    - 既存ツール群                                                    │
│    - story_director プロンプト                                       │
│                                                                      │
│  digrag MCP:                                                         │
│    - query_memos（BM25/Semantic/Hybrid検索）                         │
│    - list_tags（タグ一覧）                                           │
│    - get_recent_memos（最近の更新）                                  │
│                                                                      │
│  → AIが両方のMCPを連携して応答生成                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 データフロー

```
[ユーザー入力]
    │
    ▼
[storyteller watch / post-commit hook]
    │
    ├─── 変更検出
    │
    ▼
[storyteller rag export --incremental]
    │
    ├─── TypeScript解析
    ├─── Markdown解析
    ├─── チャンキング
    ├─── メタデータ付与
    │
    ▼
[.rag-docs/ 更新]
    │
    ▼
[digrag build --incremental --with-embeddings]
    │
    ├─── ハッシュ比較
    ├─── 差分embedding生成
    ├─── インデックス更新
    │
    ▼
[.rag/ インデックス更新完了]
    │
    ▼
[AIからの検索クエリ]
    │
    ▼
[digrag MCP query_memos]
    │
    ▼
[関連コンテキスト取得・回答生成]
```

---

## 3. 技術仕様

### 3.1 RAGドキュメントジェネレーター

#### 3.1.1 モジュール構造

```
src/rag/
├── document_generator.ts     # コアジェネレーター
├── chunker.ts                # チャンキングエンジン
├── templates/                # 要素タイプ別テンプレート
│   ├── character.ts
│   ├── setting.ts
│   ├── foreshadowing.ts
│   ├── manuscript.ts
│   ├── timeline.ts
│   └── relationships.ts
├── metadata/
│   ├── tag_generator.ts      # タグ自動生成
│   └── frontmatter_parser.ts # FrontMatter解析
└── export.ts                 # エクスポートエントリ
```

#### 3.1.2 主要インターフェース

```typescript
// src/rag/document_generator.ts

export interface RagDocument {
  /** ドキュメントID（ファイル名ベース） */
  id: string;
  /** digrag互換タイトル */
  title: string;
  /** 日付（ISO8601） */
  date: string;
  /** タグリスト */
  tags: string[];
  /** 本文 */
  content: string;
  /** 元ファイルパス */
  sourcePath: string;
}

export interface GeneratorOptions {
  /** 出力ディレクトリ */
  outputDir: string;
  /** 原稿出力形式 */
  manuscriptFormat: "full" | "summary";
  /** チャンキング設定 */
  chunking: ChunkingOptions;
  /** インクリメンタルモード */
  incremental: boolean;
}

export interface ChunkingOptions {
  /** チャンキング戦略 */
  strategy: "document" | "scene" | "semantic";
  /** 最大チャンクサイズ（文字数） */
  maxChunkChars: number;
  /** オーバーラップ（文字数） */
  overlapChars: number;
  /** 最小チャンクサイズ */
  minChunkChars: number;
}

export interface DocumentGenerator {
  /** プロジェクト全体をエクスポート */
  exportAll(options: GeneratorOptions): Promise<ExportResult>;

  /** 単一要素をエクスポート */
  exportElement(
    type: ElementType,
    id: string,
    options: GeneratorOptions,
  ): Promise<RagDocument[]>;

  /** 変更差分をエクスポート */
  exportIncremental(
    lastExport: Date,
    options: GeneratorOptions,
  ): Promise<ExportResult>;
}

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
```

#### 3.1.3 ドキュメントテンプレート

```typescript
// src/rag/templates/character.ts

export function generateCharacterDocument(
  character: Character,
  project: StoryProject,
): RagDocument {
  const tags = [
    "character",
    character.role,
    ...character.appearingChapters,
    ...(character.traits || []),
  ];

  const content = `
## 基本情報
- ID: ${character.id}
- 名前: ${character.name}
- 役割: ${character.role}
- 登場チャプター: ${character.appearingChapters.join(", ")}

## 性格・特徴
${(character.traits || []).map((t) => `- ${t}`).join("\n")}

## 関係性
${formatRelationships(character.relationships)}

## 概要
${character.summary}

${character.details ? formatDetails(character.details) : ""}

## 成長フェーズ
${character.phases ? formatPhases(character.phases) : "（未設定）"}
`.trim();

  return {
    id: `character_${character.id}`,
    title: `Character: ${character.name}`,
    date: new Date().toISOString().split("T")[0],
    tags,
    content,
    sourcePath: `src/characters/${character.id}.ts`,
  };
}
```

### 3.2 チャンキングエンジン

#### 3.2.1 戦略選択ロジック

```typescript
// src/rag/chunker.ts

export function selectChunkingStrategy(
  content: string,
  options: ChunkingOptions,
): ChunkingStrategy {
  const charCount = content.length;

  // 小規模: ドキュメント単位
  if (charCount <= 3000) {
    return "document";
  }

  // 中規模: シーン単位
  if (charCount <= 15000) {
    return "scene";
  }

  // 大規模: セマンティック分割
  return "semantic";
}

export function chunkContent(
  content: string,
  metadata: DocumentMetadata,
  options: ChunkingOptions,
): RagDocument[] {
  const strategy = options.strategy === "auto"
    ? selectChunkingStrategy(content, options)
    : options.strategy;

  switch (strategy) {
    case "document":
      return [createSingleDocument(content, metadata)];
    case "scene":
      return chunkByScene(content, metadata, options);
    case "semantic":
      return chunkSemantically(content, metadata, options);
  }
}
```

#### 3.2.2 シーン単位分割

```typescript
// src/rag/chunker.ts

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

    // 空のシーンはスキップ
    if (scene.trim().length < options.minChunkChars) {
      continue;
    }

    // オーバーラップ追加
    const overlap = i > 0
      ? getOverlap(scenes[i - 1], options.overlapChars)
      : "";

    const chunkContent = overlap + scene;

    // チャンクが大きすぎる場合は再分割
    if (chunkContent.length > options.maxChunkChars) {
      documents.push(
        ...splitLargeChunk(chunkContent, metadata, options, i),
      );
    } else {
      documents.push({
        id: `${metadata.id}_scene${String(i + 1).padStart(2, "0")}`,
        title: `${metadata.title} - Scene ${i + 1}`,
        date: metadata.date,
        tags: [...metadata.tags, `scene${i + 1}`],
        content: chunkContent,
        sourcePath: metadata.sourcePath,
      });
    }
  }

  return documents;
}
```

### 3.3 CLIコマンド

#### 3.3.1 rag export

```typescript
// src/cli/modules/rag/export.ts

export const ragExportCommand: CommandDescriptor = {
  path: ["rag", "export"],
  metadata: {
    summary: "Export story elements to RAG-compatible documents",
    description: `
Export storyteller project elements (characters, settings, foreshadowings,
manuscripts, timelines) to digrag-compatible Markdown documents.

The output can be used with 'digrag build' to create a searchable index.
`,
    usage: "storyteller rag export [options]",
    examples: [
      "storyteller rag export",
      "storyteller rag export --output .rag-docs",
      "storyteller rag export --manuscript-format summary",
      "storyteller rag export --incremental",
    ],
    options: [
      {
        name: "--output, -o",
        description: "Output directory (default: .rag-docs)",
      },
      {
        name: "--manuscript-format",
        description: "Manuscript output: full|summary (default: full)",
      },
      {
        name: "--chunking",
        description: "Chunking strategy: document|scene|auto (default: auto)",
      },
      { name: "--incremental", description: "Only export changed files" },
      { name: "--json", description: "Output result as JSON" },
    ],
  },
  handler: async (args, context) => {
    const options = parseRagExportOptions(args);
    const generator = createDocumentGenerator(context.project);

    const result = options.incremental
      ? await generator.exportIncremental(getLastExportTime(), options)
      : await generator.exportAll(options);

    if (args.json) {
      return { type: "success", data: result };
    }

    return formatExportResult(result);
  },
};
```

#### 3.3.2 rag update

```typescript
// src/cli/modules/rag/update.ts

export const ragUpdateCommand: CommandDescriptor = {
  path: ["rag", "update"],
  metadata: {
    summary: "Update RAG index (export + digrag build)",
    description: `
Combined command that exports storyteller elements and rebuilds the digrag index.
Equivalent to running 'storyteller rag export' followed by 'digrag build'.
`,
    usage: "storyteller rag update [options]",
    examples: [
      "storyteller rag update",
      "storyteller rag update --no-embeddings",
      "storyteller rag update --force",
    ],
    options: [
      {
        name: "--output, -o",
        description: "RAG docs directory (default: .rag-docs)",
      },
      {
        name: "--index-dir, -i",
        description: "digrag index directory (default: .rag)",
      },
      {
        name: "--no-embeddings",
        description: "Skip embedding generation (BM25 only)",
      },
      { name: "--force", description: "Force full rebuild" },
      { name: "--json", description: "Output result as JSON" },
    ],
  },
  handler: async (args, context) => {
    // 1. Export
    const exportResult = await runRagExport(args, context);

    // 2. digrag build
    const buildResult = await runDigragBuild(args, context);

    return combineResults(exportResult, buildResult, args.json);
  },
};
```

#### 3.3.3 rag install-hooks

```typescript
// src/cli/modules/rag/install_hooks.ts

export const ragInstallHooksCommand: CommandDescriptor = {
  path: ["rag", "install-hooks"],
  metadata: {
    summary: "Install Git hooks for automatic RAG updates",
    description: `
Install Git hooks that automatically update the RAG index on commits.
Creates a post-commit hook that runs 'storyteller rag update --incremental'.
`,
    usage: "storyteller rag install-hooks [options]",
    options: [
      { name: "--force", description: "Overwrite existing hooks" },
      {
        name: "--hook",
        description: "Hook type: post-commit|pre-push (default: post-commit)",
      },
    ],
  },
  handler: async (args, context) => {
    const hookType = args.hook || "post-commit";
    const hookPath = join(context.project.path, ".git", "hooks", hookType);

    if (await exists(hookPath) && !args.force) {
      return {
        type: "error",
        message: `Hook ${hookType} already exists. Use --force to overwrite.`,
      };
    }

    await writeHookScript(hookPath, hookType);
    await chmod(hookPath, 0o755);

    return {
      type: "success",
      message: `Installed ${hookType} hook at ${hookPath}`,
    };
  },
};
```

### 3.4 MCP統合

#### 3.4.1 story_directorプロンプト拡張

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
    // 1. プロジェクト概要を取得
    const projectSummary = await getProjectSummary(context.project);

    // 2. フォーカスに応じたタグフィルタを設定
    const tagFilter = mapFocusToTag(args.focus);

    // 3. RAG検索クエリを構築
    const searchQuery = buildSearchQuery(args.question, args.search_hint);

    // 4. RAG検索を推奨するプロンプト生成
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
```

---

## 4. 実装タスク一覧

### Issue #N: RAG統合基盤 - Phase 1

**タイトル**: `feat(rag): RAGドキュメントジェネレーター基盤実装`

**概要**:
storytellerプロジェクトの各要素をdigrag互換のMarkdownドキュメントに変換する
基盤機能を実装する。

**完了条件**:

- [ ] `src/rag/` ディレクトリ構造作成
- [ ] `DocumentGenerator` インターフェース定義
- [ ] キャラクタードキュメントテンプレート実装
- [ ] 設定ドキュメントテンプレート実装
- [ ] `storyteller rag export` 基本コマンド実装
- [ ] ユニットテスト作成

**推定工数**: 5日

---

### Issue #N+1: RAGチャンキング実装 - Phase 1.5

**タイトル**: `feat(rag): チャンキングエンジン実装`

**概要**: 原稿ファイルを適切なサイズに分割するチャンキングエンジンを実装する。

**完了条件**:

- [ ] `Chunker` インターフェース定義
- [ ] ドキュメント単位分割（戦略A）実装
- [ ] シーン単位分割（戦略B）実装
- [ ] オーバーラップ処理実装
- [ ] 戦略自動選択ロジック実装
- [ ] ユニットテスト作成

**推定工数**: 3日

---

### Issue #N+2: RAGドキュメント拡張 - Phase 2

**タイトル**: `feat(rag): 全要素タイプのドキュメント生成対応`

**概要**:
伏線、タイムライン、関係性グラフなど全要素タイプのドキュメント生成を実装。

**完了条件**:

- [ ] 伏線ドキュメントテンプレート実装
- [ ] タイムライン/イベントドキュメントテンプレート実装
- [ ] 関係性グラフドキュメント生成実装
- [ ] プロジェクト概要（_index.md）生成実装
- [ ] 原稿ドキュメント生成（full/summary両対応）
- [ ] ユニットテスト作成

**推定工数**: 5日

---

### Issue #N+3: インクリメンタルエクスポート - Phase 3

**タイトル**: `feat(rag): インクリメンタルエクスポート実装`

**概要**: 変更されたファイルのみをエクスポートするインクリメンタル機能を実装。

**完了条件**:

- [ ] ファイルハッシュ管理機能実装
- [ ] 変更検出ロジック実装
- [ ] `--incremental` オプション対応
- [ ] エクスポート状態永続化
- [ ] インテグレーションテスト作成

**推定工数**: 3日

---

### Issue #N+4: RAG自動更新 - Phase 4

**タイトル**: `feat(rag): 自動更新システム実装`

**概要**: Git hookとragwatchコマンドによる自動更新システムを実装。

**完了条件**:

- [ ] `storyteller rag update` コマンド実装
- [ ] `storyteller rag install-hooks` コマンド実装
- [ ] post-commit hookテンプレート作成
- [ ] digrag build呼び出し統合
- [ ] ドキュメント作成

**推定工数**: 3日

---

### Issue #N+5: MCP統合 - Phase 5

**タイトル**: `feat(mcp): story_directorプロンプトRAG統合`

**概要**: story_directorプロンプトにdigrag RAG検索を統合し、
コンテキストに基づいた応答を可能にする。

**完了条件**:

- [ ] story_directorプロンプト拡張
- [ ] RAG検索推奨ロジック実装
- [ ] フォーカス別タグフィルタ実装
- [ ] MCP設定例ドキュメント更新
- [ ] 統合テスト作成

**推定工数**: 3日

---

## 5. フェーズ別スケジュール

### 5.1 タイムライン

```
Week 1 (Phase 1)
├─ Day 1-2: 基盤設計・ディレクトリ構造
├─ Day 3-4: DocumentGenerator・テンプレート基本実装
└─ Day 5:   キャラクター/設定ドキュメント生成

Week 2 (Phase 1.5 + 2)
├─ Day 1-2: チャンキングエンジン実装
├─ Day 3:   伏線/タイムラインテンプレート
├─ Day 4:   関係性グラフ・概要生成
└─ Day 5:   原稿ドキュメント生成

Week 3 (Phase 3 + 4)
├─ Day 1-2: インクリメンタルエクスポート
├─ Day 3:   rag update コマンド
├─ Day 4:   Git hooks統合
└─ Day 5:   テスト・ドキュメント

Week 4 (Phase 5 + 統合テスト)
├─ Day 1-2: MCP統合（story_director拡張）
├─ Day 3:   統合テスト・E2Eテスト
├─ Day 4:   ドキュメント整備
└─ Day 5:   リリース準備
```

### 5.2 マイルストーン

| マイルストーン       | 完了条件                              | 予定日 |
| -------------------- | ------------------------------------- | ------ |
| M1: 基本エクスポート | キャラクター/設定のエクスポートが動作 | Week 1 |
| M2: 全要素対応       | 全要素タイプのエクスポートが動作      | Week 2 |
| M3: 自動更新         | Git hook経由の自動更新が動作          | Week 3 |
| M4: MCP統合          | Claude Codeからの利用が可能           | Week 4 |

### 5.3 リスクと対策

| リスク                 | 影響 | 対策                               |
| ---------------------- | ---- | ---------------------------------- |
| digrag API変更         | 高   | digragバージョン固定、互換性テスト |
| 大規模プロジェクト性能 | 中   | インクリメンタル処理、並列化       |
| OpenRouter API制限     | 低   | BM25フォールバック、レート制限対応 |

---

## 6. テスト戦略

### 6.1 ユニットテスト

```typescript
// tests/rag/document_generator_test.ts

Deno.test("DocumentGenerator - キャラクタードキュメント生成", async () => {
  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["勇敢", "正義感"],
    relationships: { princess: "love" },
    appearingChapters: ["chapter01", "chapter02"],
    summary: "王国を救う勇者",
  };

  const doc = generateCharacterDocument(character, mockProject);

  assertEquals(doc.id, "character_hero");
  assertEquals(doc.title, "Character: 勇者");
  assertStringIncludes(doc.content, "役割: protagonist");
  assertArrayIncludes(doc.tags, ["character", "protagonist"]);
});
```

### 6.2 インテグレーションテスト

```typescript
// tests/rag/export_integration_test.ts

Deno.test("rag export - cinderellaサンプル全体エクスポート", async () => {
  const project = await loadProject("samples/cinderella");
  const generator = createDocumentGenerator(project);

  const result = await generator.exportAll({
    outputDir: "tmp/claude/rag-test",
    manuscriptFormat: "full",
    chunking: { strategy: "auto", maxChunkChars: 5000, overlapChars: 500 },
    incremental: false,
  });

  assertEquals(result.errors.length, 0);
  assert(result.documentCount > 0);

  // 出力ファイル確認
  assert(await exists("tmp/claude/rag-test/_index.md"));
  assert(await exists("tmp/claude/rag-test/characters/cinderella.md"));
});
```

### 6.3 E2Eテスト

```typescript
// tests/rag/e2e_test.ts

Deno.test("RAG E2E - エクスポート→ビルド→検索", async () => {
  // 1. Export
  const exportResult = await runCommand([
    "rag",
    "export",
    "--output",
    "tmp/claude/e2e-rag-docs",
  ]);
  assertEquals(exportResult.code, 0);

  // 2. Build (digrag)
  const buildResult = await runProcess([
    "digrag",
    "build",
    "--input",
    "tmp/claude/e2e-rag-docs",
    "--output",
    "tmp/claude/e2e-rag",
    "--with-embeddings",
  ]);
  assertEquals(buildResult.code, 0);

  // 3. Search
  const searchResult = await runProcess([
    "digrag",
    "search",
    "シンデレラ",
    "--index-dir",
    "tmp/claude/e2e-rag",
    "--mode",
    "hybrid",
  ]);
  assertEquals(searchResult.code, 0);
  assertStringIncludes(searchResult.stdout, "cinderella");
});
```

---

## 7. 運用ガイド

### 7.1 初期セットアップ

```bash
# 1. digrag インストール（未インストールの場合）
curl -sSL https://raw.githubusercontent.com/takets/digrag/main/install.sh | bash

# 2. OpenRouter APIキー設定
export OPENROUTER_API_KEY="sk-or-v1-..."

# 3. RAGドキュメント初回エクスポート
storyteller rag export --output .rag-docs

# 4. digragインデックス構築
digrag build --input .rag-docs --output .rag --with-embeddings

# 5. Git hooks設定（オプション）
storyteller rag install-hooks
```

### 7.2 MCP設定

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

### 7.3 日常運用

```bash
# 手動更新
storyteller rag update

# インデックス状態確認
digrag search "" --index-dir .rag --top-k 0  # 統計表示

# タグ一覧確認
# (digrag MCP経由: list_tags)
```

### 7.4 トラブルシューティング

| 症状             | 原因               | 対策                        |
| ---------------- | ------------------ | --------------------------- |
| 検索結果が古い   | インデックス未更新 | `storyteller rag update`    |
| embedding エラー | APIキー未設定      | `OPENROUTER_API_KEY` 確認   |
| 検索精度が低い   | タグフィルタ未使用 | `tag_filter` パラメータ追加 |

---

## 8. 将来の拡張

### 8.1 Phase 6以降の検討事項

1. **リアルタイム監視**
   - `storyteller rag watch` コマンド
   - ファイル変更の自動検出・即時更新

2. **クエリ最適化**
   - 質問から最適な検索クエリを自動生成
   - LLMベースのクエリリライト統合

3. **マルチプロジェクト**
   - 複数プロジェクトのインデックス統合
   - プロジェクト横断検索

4. **カスタムプロンプト**
   - RAG結果を活用したプロンプトテンプレート
   - シーン執筆支援、キャラクター対話生成

5. **セマンティック分割**
   - 大規模ファイル用の高度なチャンキング
   - RecursiveCharacterTextSplitter相当の実装

---

## 9. 参考資料

- [digrag README](https://github.com/takets/digrag)
- [PLAN_RAG_INTEGRATION.md](./PLAN_RAG_INTEGRATION.md)
- [PLAN_RAG_CHUNKING.md](./PLAN_RAG_CHUNKING.md)
- [Best Chunking Strategies for RAG in 2025](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025)
- [OpenRouter Embeddings API](https://openrouter.ai/docs/api/reference/embeddings)
