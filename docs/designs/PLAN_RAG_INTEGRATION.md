# storyteller × digrag RAG 連携設計

> **目的**:
> 原稿執筆時の相談において、AIがプロジェクトの最新状態（キャラクター、設定、伏線、原稿など）を踏まえて回答できる仕組みを構築する

---

## 1. 概要

### 1.1 現状の課題

原稿執筆時にAIに相談する際、以下の情報が必要:

- キャラクターの性格、関係性、成長フェーズ
- 設定（場所、アイテム、魔法システムなど）
- 伏線の設置・回収状態
- 既存原稿の内容
- 時系列イベントと因果関係

**問題**: これらの情報は散在しており、手動でコンテキストに含めるのは非効率

### 1.2 解決策

**digrag RAG**と**storyteller**を連携させ:

1. storytellerの各要素を**検索可能なドキュメント**に変換
2. digragの**インクリメンタルビルド**で常に最新状態を維持
3. AIが相談時に**自動でRAG検索**して関連情報を取得

---

## 2. アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────┐
│                    storyteller プロジェクト                        │
├─────────────────────────────────────────────────────────────────┤
│  src/characters/*.ts    → キャラクター定義                        │
│  src/settings/*.ts      → 設定定義                                │
│  src/foreshadowings/*.ts → 伏線定義                              │
│  manuscripts/*.md       → 原稿                                   │
│  src/timeline/*.ts      → タイムライン（存在する場合）             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   RAG Document Generator                         │
│              (storyteller rag export コマンド)                   │
├─────────────────────────────────────────────────────────────────┤
│  1. 各要素を読み込み                                              │
│  2. RAG用Markdownドキュメントに変換                               │
│  3. .rag-docs/ ディレクトリに出力                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     .rag-docs/ ディレクトリ                       │
├─────────────────────────────────────────────────────────────────┤
│  characters/                                                     │
│    cinderella.md         → キャラクター情報 (構造化テキスト)      │
│    prince.md                                                     │
│  settings/                                                       │
│    kingdom.md            → 設定情報                               │
│    castle.md                                                     │
│  foreshadowings/                                                 │
│    glass_slipper.md      → 伏線情報                               │
│  manuscripts/                                                    │
│    chapter01.md          → 原稿（そのまま or 要約）               │
│  relationships/                                                  │
│    graph.md              → キャラクター関係性グラフ               │
│  timeline/                                                       │
│    main_story.md         → 時系列イベント                         │
│  _index.md               → プロジェクト全体の概要                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       digrag build                               │
├─────────────────────────────────────────────────────────────────┤
│  digrag build --input .rag-docs --output .rag                    │
│              --with-embeddings --incremental                     │
│                                                                  │
│  → BM25インデックス + Vectorインデックス生成                      │
│  → 変更分のみ処理（コスト効率）                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    digrag MCP Server                             │
├─────────────────────────────────────────────────────────────────┤
│  query_memos:   クエリベースの検索                                │
│  list_tags:     タグ一覧取得                                      │
│  get_recent_memos: 最近更新されたドキュメント                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               Claude Code / Claude Desktop                       │
├─────────────────────────────────────────────────────────────────┤
│  ユーザー: 「シンデレラと王子の関係性を深める場面を書きたい」      │
│                                                                  │
│  AI処理:                                                         │
│  1. digrag:query_memos("シンデレラ 王子 関係性", mode="hybrid")  │
│  2. 関連ドキュメント取得:                                        │
│     - characters/cinderella.md                                   │
│     - characters/prince.md                                       │
│     - relationships/graph.md                                     │
│     - foreshadowings/glass_slipper.md                            │
│  3. コンテキストを踏まえた回答生成                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. RAG用ドキュメント形式

### 3.1 キャラクタードキュメント

```markdown
- Character: シンデレラ 2025-01-15 Tags: character, protagonist, cinderella

  ## 基本情報
  - ID: cinderella
  - 役割: protagonist（主人公）
  - 登場チャプター: chapter01, chapter02, chapter03

  ## 性格・特徴
  - 優しい
  - 忍耐強い
  - 美しい
  - 夢見がち

  ## 関係性
  - 継母 (stepmother): 対立関係
  - 王子 (prince): 恋愛関係
  - 妖精のおばあさん (fairy_godmother): 支援者

  ## 詳細説明
  シンデレラは、亡き母の優しさを胸に、継母や義姉たちからの虐待にも
  耐え続ける少女です...

  ## 成長フェーズ
  - Phase 1 (chapter01-02): 虐げられた日常
  - Phase 2 (chapter03): 魔法との出会い
  - Phase 3 (chapter04): 王子との出会い
```

**ポイント**:

- `* Title YYYY-MM-DD` 形式でdigragのChangelogEntry抽出に対応
- `Tags:` で要素タイプを指定（フィルタリング用）
- 関係性は他キャラクターのIDを含める（関連検索で発見しやすく）

### 3.2 設定ドキュメント

```markdown
- Setting: フェアリーテイル王国 2025-01-15 Tags: setting, location, kingdom

  ## 基本情報
  - ID: kingdom
  - タイプ: location
  - 別名: 王国, フェアリーテイル, 王都

  ## 概要
  古き良き伝統と魔法が共存する王国。王子と姫の物語が生まれる舞台。

  ## 関連設定
  - castle: 王宮
  - mansion: シンデレラの屋敷

  ## 詳細
  ...
```

### 3.3 伏線ドキュメント

```markdown
- Foreshadowing: ガラスの靴の伏線 2025-01-15 Tags: foreshadowing, chekhov,
  major, planted

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

### 3.4 原稿ドキュメント

原稿は2つの方式を選択可能:

#### 方式A: 全文保存（小規模プロジェクト向け）

```markdown
- Manuscript: 第1章 灰かぶり姫の日常 2025-01-15 Tags: manuscript, chapter01

  ## メタデータ
  - チャプターID: chapter01
  - 順序: 1
  - 登場キャラクター: cinderella, stepmother, stepsister_elder,
    stepsister_younger
  - 設定: mansion

  ## 本文
  # 第1章：灰かぶり姫の日常

  ## Scene 1
  屋敷の朝は、シンデレラにとっていつも同じだった...
```

#### 方式B: 要約保存（大規模プロジェクト向け）

```markdown
- Manuscript: 第1章 灰かぶり姫の日常 2025-01-15 Tags: manuscript, chapter01,
  summary

  ## メタデータ
  - チャプターID: chapter01
  - 順序: 1
  - 文字数: 1,234
  - シーン数: 3

  ## 要約
  シンデレラの日常を描く導入章。継母と義姉たちからの虐待を受けながらも、
  優しさを失わない主人公の姿が描かれる。

  ## シーン構成
  1. Scene 1: 朝の家事シーン - 灰かぶり姫の由来
  2. Scene 2: 継母と義姉たちとの会話
  3. Scene 3: シンデレラの部屋と希望

  ## キーイベント
  - シンデレラが灰かぶり姫と呼ばれる経緯
  - 継母の理不尽な命令
  - 小鳥たちとの友情

  ## 全文パス
  manuscripts/chapter01.md
```

### 3.5 関係性グラフドキュメント

```markdown
- Relationships: キャラクター関係性グラフ 2025-01-15 Tags: relationships, graph,
  meta

  ## 対立関係
  - シンデレラ ←→ 継母: 虐待する/耐える
  - シンデレラ ←→ ドリゼラ: いじめる/我慢
  - シンデレラ ←→ アナスタシア: いじめる/我慢

  ## 恋愛関係
  - シンデレラ ←→ 王子: 相思相愛（chapter03以降）

  ## 支援関係
  - 妖精のおばあさん → シンデレラ: 魔法で支援
  - 王 → 王子: 父として支援

  ## 家族関係
  - 継母 → ドリゼラ: 母娘
  - 継母 → アナスタシア: 母娘
  - 王 → 王子: 父子
```

### 3.6 プロジェクト概要ドキュメント

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

## 4. タグ設計

digragの `list_tags` と `tag_filter` を活用するためのタグ体系:

| カテゴリ       | タグ例                                                | 用途                   |
| -------------- | ----------------------------------------------------- | ---------------------- |
| **要素タイプ** | `character`, `setting`, `foreshadowing`, `manuscript` | 要素種別でのフィルタ   |
| **役割**       | `protagonist`, `antagonist`, `supporting`             | キャラクター役割       |
| **伏線状態**   | `planted`, `resolved`, `abandoned`                    | 伏線の状態             |
| **重要度**     | `major`, `minor`, `subtle`                            | 伏線・イベントの重要度 |
| **チャプター** | `chapter01`, `chapter02`                              | 登場チャプター         |
| **メタ**       | `meta`, `overview`, `graph`                           | メタ情報               |

### 検索例

```bash
# キャラクターのみ検索
digrag search "王子" --tag character

# 設置済み伏線のみ検索
digrag search "伏線" --tag planted

# 第2章関連のみ検索
digrag search "舞踏会" --tag chapter02
```

---

## 5. 更新フロー（鮮度維持）

### 5.1 ファイル監視 + 自動更新

```
┌─────────────────────────────────────────────────────────────────┐
│                   storyteller watch コマンド                     │
├─────────────────────────────────────────────────────────────────┤
│  1. src/, manuscripts/ を監視 (deno.watchFs)                    │
│  2. 変更検出時:                                                  │
│     a. 該当ファイルのRAGドキュメントを再生成                      │
│     b. digrag build --incremental を実行                        │
│  3. インデックス更新完了                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 手動更新（推奨フロー）

```bash
# 1. RAGドキュメント生成
storyteller rag export --output .rag-docs

# 2. digragインデックス更新（インクリメンタル）
digrag build --input .rag-docs --output .rag --with-embeddings --incremental

# 出力例:
# Incremental build summary:
#   Added: 1 documents (新規キャラクター追加)
#   Modified: 2 documents (原稿更新)
#   Removed: 0 documents
#   Unchanged: 25 documents
#   Embeddings needed: 3
```

### 5.3 Git Hooks による自動更新

```bash
# .git/hooks/post-commit
#!/bin/bash
storyteller rag export --output .rag-docs
digrag build --input .rag-docs --output .rag --with-embeddings --incremental
```

---

## 6. MCP設定

### 6.1 Claude Codeでの設定

`.mcp.json`:

```json
{
  "mcpServers": {
    "storyteller": {
      "command": "storyteller",
      "args": ["mcp", "start", "--stdio", "--path", "."],
      "env": {}
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

### 6.2 利用可能なツール

**storyteller MCP**:

- `meta_check`: プロジェクト検証
- `view_browser`: 可視化
- `lsp_validate`: 原稿検証
- など

**digrag MCP**:

- `query_memos`: RAG検索（BM25/Semantic/Hybrid）
- `list_tags`: タグ一覧
- `get_recent_memos`: 最近の更新

---

## 7. クエリパターン

### 7.1 キャラクター関連の相談

**ユーザー**: 「シンデレラの性格に合った台詞を考えて」

**AI処理**:

1. `digrag:query_memos("シンデレラ 性格 特徴", mode="hybrid", tag="character")`
2. 取得: cinderella.md（性格: 優しい、忍耐強い、夢見がち）
3. 性格に基づいた台詞案を生成

### 7.2 整合性チェック

**ユーザー**: 「王子がシンデレラを見つける場面で矛盾はない？」

**AI処理**:

1. `digrag:query_memos("王子 シンデレラ 見つける ガラスの靴", mode="hybrid")`
2. 取得:
   - foreshadowings/glass_slipper.md（ガラスの靴の伏線）
   - characters/prince.md
   - relationships/graph.md
3. 伏線の設置・回収状況を確認して矛盾をチェック

### 7.3 伏線回収の相談

**ユーザー**: 「未回収の伏線を教えて」

**AI処理**:

1. `digrag:query_memos("伏線", tag="planted")`
2. 設置済み・未回収の伏線一覧を返却

### 7.4 原稿内容の参照

**ユーザー**: 「第2章で妖精が登場する場面を参考にしたい」

**AI処理**:

1. `digrag:query_memos("妖精 chapter02", mode="hybrid", tag="manuscript")`
2. chapter02.mdの関連部分を取得

---

## 8. 実装計画

### Phase 1: RAGドキュメントジェネレーター

```
storyteller rag export [OPTIONS]

Options:
  --output <DIR>          出力ディレクトリ（デフォルト: .rag-docs）
  --format <FORMAT>       出力形式: full | summary（デフォルト: full）
  --include <TYPES>       含める要素タイプ（デフォルト: all）
  --exclude <TYPES>       除外する要素タイプ
```

**実装ファイル**:

- `src/cli/modules/rag/export.ts`
- `src/rag/document_generator.ts`
- `src/rag/templates/` (各要素タイプのテンプレート)

### Phase 2: 自動更新システム

```
storyteller rag watch [OPTIONS]

Options:
  --output <DIR>          RAGドキュメント出力先
  --index-dir <DIR>       digragインデックスディレクトリ
  --debounce <MS>         デバウンス時間（デフォルト: 1000ms）
```

### Phase 3: MCPプロンプト統合

`story_director` プロンプトにRAG検索を統合:

```typescript
// src/mcp/prompts/definitions/story_director.ts
export const storyDirectorPrompt: McpPromptDefinition = {
  name: "story_director",
  description: "RAG検索を活用して物語の相談に応答",
  arguments: [
    { name: "question", required: true },
    { name: "search_query", required: false },
  ],
  getMessages: async (args) => {
    // digrag検索を実行してコンテキストを取得
    const context = await digragSearch(args.search_query || args.question);
    return [
      {
        role: "user",
        content: `
コンテキスト:
${context}

質問: ${args.question}
      `,
      },
    ];
  },
};
```

---

## 9. cinderellaサンプルでの適用例

### 9.1 生成されるRAGドキュメント

```
samples/cinderella/.rag-docs/
├── _index.md                        # プロジェクト概要
├── characters/
│   ├── cinderella.md               # 主人公
│   ├── prince.md                   # 王子
│   ├── stepmother.md               # 継母
│   ├── stepsister_elder.md         # ドリゼラ
│   ├── stepsister_younger.md       # アナスタシア
│   ├── fairy_godmother.md          # 妖精のおばあさん
│   └── king.md                     # 王
├── settings/
│   ├── kingdom.md                  # 王国
│   ├── castle.md                   # 王宮
│   ├── mansion.md                  # 屋敷
│   ├── glass_slipper.md            # ガラスの靴
│   └── magic_system.md             # 魔法システム
├── foreshadowings/
│   ├── glass_slipper.md            # ガラスの靴の伏線
│   ├── midnight_deadline.md        # 真夜中の期限
│   └── stepmother_jealousy.md      # 継母の嫉妬の理由
├── manuscripts/
│   ├── chapter01.md                # 第1章
│   ├── chapter02.md                # 第2章
│   ├── chapter03.md                # 第3章
│   └── chapter04.md                # 第4章
└── relationships/
    └── graph.md                    # 関係性グラフ
```

### 9.2 実際のクエリ例

```bash
# ハイブリッド検索でシンデレラ関連情報を取得
digrag search "シンデレラ 優しい" --index-dir .rag --mode hybrid --top-k 5

# 結果例:
# 1. characters/cinderella.md (score: 0.92)
#    - 性格・特徴: 優しい、忍耐強い...
# 2. manuscripts/chapter01.md (score: 0.78)
#    - シンデレラの優しさを描写するシーン...
# 3. relationships/graph.md (score: 0.65)
#    - シンデレラ ←→ 継母: 虐待する/耐える...
```

---

## 10. 技術的考慮事項

### 10.1 トークン効率

- **Embedding生成コスト**: インクリメンタルビルドで99%削減可能
- **検索時コスト**: BM25は無料、Semanticのみクエリembedding必要
- **推奨**: 通常はhybrid検索、コスト重視時はBM25のみ

### 10.2 日本語対応

- digragはLindera IPADICで日本語トークン化対応済み
- キャラクター名、設定名は日本語でそのまま検索可能
- 別名（displayNames）も含めることで検索精度向上

### 10.3 スケーラビリティ

- 小規模（〜50ドキュメント）: 全文保存推奨
- 中規模（50〜200）: 原稿は要約、他は全文
- 大規模（200+）: すべて要約、詳細は元ファイル参照

### 10.4 プライバシー

- `.rag-docs/` と `.rag/` は `.gitignore` に追加推奨
- OpenRouter APIキーは環境変数で管理

---

## 11. まとめ

### メリット

1. **最新状態の維持**: インクリメンタルビルドで常に最新
2. **効率的な検索**: BM25 + Semanticのハイブリッドで高精度
3. **コスト効率**: 変更分のみembedding生成
4. **柔軟なフィルタ**: タグによる要素タイプ別検索
5. **MCP統合**: Claude Code/Desktopからシームレスに利用

### 今後の拡張

1. **リアルタイム監視**: ファイル変更の自動検出・更新
2. **クエリ最適化**: 質問から最適な検索クエリを自動生成
3. **マルチプロジェクト**: 複数プロジェクトのインデックス統合
4. **カスタムプロンプト**: RAG結果を活用したプロンプトテンプレート

---

**作成日**: 2025-01-15 **バージョン**: 1.0
