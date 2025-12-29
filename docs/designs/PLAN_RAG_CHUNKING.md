# RAG チャンキング戦略設計

> **目的**:
> シーン単位ファイル（最大数十KB）に対する最適なRAGチャンキング戦略を定義し、OpenRouter埋め込みモデルの選定とGit
> hook/手動更新フローを具体化する

---

## 1. 前提条件

### 1.1 ファイル構成

```
シーン単位ファイル
├─ サイズ: 最大数十KB（〜50KB想定）
├─ 形式: Markdown + FrontMatter
├─ 構造:
│   ├─ FrontMatter（メタデータ）
│   ├─ タイトル（# 見出し）
│   ├─ Scene 1, Scene 2...（## 見出し）
│   └─ 本文（日本語創作文）
└─ 文字数想定: 〜20,000文字（日本語）
```

### 1.2 digrag制約

- **Lindera IPADIC**: 日本語形態素解析（BM25検索用）
- **OpenRouter API**: 埋め込み生成（Semantic検索用）
- **インクリメンタルビルド**: 変更分のみ処理
- **MAX_TEXT_CHARS**: 6,000文字（digrag実装の制限）

---

## 2. OpenRouter埋め込みモデル選定

### 2.1 候補モデル比較

| モデル                            | 価格/1Mトークン | コンテキスト | 次元数 | 特徴                                 |
| --------------------------------- | --------------- | ------------ | ------ | ------------------------------------ |
| **openai/text-embedding-3-small** | $0.02           | 8,191        | 1536   | digragデフォルト、高品質、多言語対応 |
| openai/text-embedding-3-large     | $0.13           | 8,192        | 3072   | 最高精度、コスト高                   |
| qwen/qwen3-embedding-8b           | $0.01           | 32,768       | -      | 最安、多言語、長文対応               |

### 2.2 推奨モデル

```
第1推奨: openai/text-embedding-3-small（現行デフォルト）
├─ 理由:
│   ├─ 日本語を含む多言語で高いMIRACLスコア（44.0%）
│   ├─ 1536次元で精度と効率のバランス良好
│   ├─ Matryoshka対応（512/1024次元に削減可能）
│   └─ digrag既存実装との互換性
└─ コスト: 〜$0.02/1Mトークン

代替案: qwen/qwen3-embedding-8b
├─ 理由:
│   ├─ 32Kコンテキスト（長文シーン対応）
│   ├─ 最安コスト（$0.01/1Mトークン）
│   └─ 多言語に強い
└─ 注意: digragでモデル変更テストが必要
```

### 2.3 トークン数・文字数の関係

```
日本語テキストの場合:
├─ 1文字 ≒ 1.3〜1.5トークン（平均）
├─ 8,191トークン ≒ 5,500〜6,300文字
└─ digrag MAX_TEXT_CHARS = 6,000文字（安全マージン確保）

シーン単位ファイル（50KB）の場合:
├─ 50KB ≒ 25,000〜50,000文字（UTF-8）
├─ 必要トークン: 32,500〜75,000トークン
└─ 結論: チャンキング必須（8K制限超過）
```

---

## 3. チャンキング戦略

### 3.1 戦略選択フロー

```
ファイルサイズ判定
│
├─ 小（〜6KB / 〜3,000文字）
│   └─ 戦略A: ドキュメント単位（分割なし）
│
├─ 中（6KB〜30KB / 3,000〜15,000文字）
│   └─ 戦略B: シーン単位分割
│
└─ 大（30KB超 / 15,000文字超）
    └─ 戦略C: セマンティック分割
```

### 3.2 戦略A: ドキュメント単位（推奨：小規模）

```
対象: 〜6KB / 〜3,000文字
分割: なし（1ファイル = 1ドキュメント）
オーバーラップ: 不要

メリット:
├─ 最もシンプル
├─ コンテキスト損失なし
├─ 埋め込みコスト最小
└─ digrag互換性最高

実装:
└─ storyteller rag export でそのまま出力
```

### 3.3 戦略B: シーン単位分割（推奨：中規模）

```
対象: 6KB〜30KB / 3,000〜15,000文字
分割単位: ## 見出し（Scene区切り）
チャンクサイズ: 目標512〜2000トークン（400〜1,500文字）
オーバーラップ: 10%（〜150文字）

メリット:
├─ 物語構造を尊重
├─ シーン単位の検索精度向上
├─ 自然な境界で分割
└─ メタデータ継承が容易

実装例:
┌────────────────────────────────────────────────┐
│ * Scene: chapter01_scene01 2025-01-15          │
│   Tags: manuscript, chapter01, scene01         │
│                                                │
│   ## メタデータ                                 │
│   - チャプターID: chapter01                     │
│   - シーン番号: 1                               │
│   - 登場キャラクター: cinderella, stepmother   │
│                                                │
│   ## 本文                                       │
│   屋敷の朝は、シンデレラにとっていつも同じだった。│
│   夜明け前に起き出し、暖炉の灰をかき出す...      │
│                                                │
│   [オーバーラップ: 前シーン末尾150文字]          │
└────────────────────────────────────────────────┘
```

### 3.4 戦略C: セマンティック分割（推奨：大規模）

```
対象: 30KB超 / 15,000文字超
分割方式: RecursiveCharacterTextSplitter相当
チャンクサイズ: 512トークン（400文字）
オーバーラップ: 50〜100トークン（10-20%）

分割優先順位:
1. ## 見出し（Scene区切り）
2. 段落（空行）
3. 文（。）
4. 文字

メリット:
├─ 長文対応
├─ 意味的まとまりを保持
└─ 業界ベストプラクティス準拠

注意点:
├─ 埋め込みコスト増加
├─ 実装複雑度上昇
└─ メタデータ継承の設計必要
```

### 3.5 推奨デフォルト設定

```toml
# storyteller.toml（将来の設定ファイル）
[rag]
# チャンキング設定
chunking_strategy = "scene"  # "document" | "scene" | "semantic"
max_chunk_chars = 5000       # digrag制限内
overlap_chars = 500          # 10%オーバーラップ
min_chunk_chars = 200        # 最小チャンクサイズ

# 閾値
small_file_threshold = 3000   # これ以下はドキュメント単位
large_file_threshold = 15000  # これ以上はセマンティック分割

# メタデータ継承
inherit_frontmatter = true
add_scene_context = true
```

---

## 4. メタデータ付与設計

### 4.1 チャンクへのメタデータ継承

```markdown
## 元ファイル FrontMatter:

## storyteller: chapter_id: chapter01 title: "灰かぶり姫の日常" order: 1 characters: - cinderella - stepmother settings: - mansion

チャンク出力:

- Manuscript: chapter01_scene01 2025-01-15 Tags: manuscript, chapter01, scene,
  cinderella, stepmother, mansion

  ## メタデータ
  - 元ファイル: manuscripts/chapter01.md
  - チャプターID: chapter01
  - シーン: 1/3
  - 登場キャラクター: cinderella, stepmother
  - 設定: mansion

  ## 本文
  ...
```

### 4.2 タグ設計

| カテゴリ     | タグ例                               | 用途                 |
| ------------ | ------------------------------------ | -------------------- |
| 要素タイプ   | `manuscript`, `character`, `setting` | 基本フィルタ         |
| チャプター   | `chapter01`, `chapter02`             | チャプター検索       |
| シーン       | `scene`, `scene01`                   | シーン単位検索       |
| キャラクター | `cinderella`, `prince`               | キャラクター関連検索 |
| 設定         | `mansion`, `castle`                  | 設定関連検索         |

---

## 5. 更新フロー設計

### 5.1 Git Hook: post-commit（推奨）

```bash
#!/bin/bash
# .git/hooks/post-commit

set -e

# 変更されたファイルを取得
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)

# storyteller関連ファイルの変更を検出
STORY_CHANGES=$(echo "$CHANGED_FILES" | grep -E "^(src/|manuscripts/)" || true)

if [ -n "$STORY_CHANGES" ]; then
    echo "[storyteller] Updating RAG index..."

    # 1. RAGドキュメント生成
    storyteller rag export --output .rag-docs --incremental

    # 2. digragインデックス更新
    digrag build --input .rag-docs --output .rag --with-embeddings --incremental

    echo "[storyteller] RAG index updated successfully"
fi
```

### 5.2 Git Hook: pre-push（代替）

```bash
#!/bin/bash
# .git/hooks/pre-push

# push前にインデックスを最新化
echo "[storyteller] Ensuring RAG index is up to date..."

storyteller rag export --output .rag-docs
digrag build --input .rag-docs --output .rag --with-embeddings --incremental

# .rag-docs と .rag は .gitignore に追加済み想定
```

### 5.3 手動更新コマンド

```bash
# 基本フロー
storyteller rag update

# 内部処理:
# 1. storyteller rag export --output .rag-docs
# 2. digrag build --input .rag-docs --output .rag --with-embeddings --incremental

# オプション
storyteller rag update --force        # フル再構築
storyteller rag update --no-embeddings # BM25のみ
storyteller rag update --verbose      # 詳細ログ
```

### 5.4 CLIコマンド設計

```typescript
// src/cli/modules/rag/update.ts
export const ragUpdateCommand: CommandDefinition = {
  name: "update",
  description: "Update RAG index incrementally",
  flags: {
    force: {
      type: "boolean",
      short: "f",
      description: "Force full rebuild",
      default: false,
    },
    noEmbeddings: {
      type: "boolean",
      description: "Skip embedding generation (BM25 only)",
      default: false,
    },
    output: {
      type: "string",
      short: "o",
      description: "Output directory for RAG documents",
      default: ".rag-docs",
    },
    indexDir: {
      type: "string",
      short: "i",
      description: "Index directory for digrag",
      default: ".rag",
    },
  },
  execute: async (options, context) => {
    // 1. Export RAG documents
    await runRagExport(options);

    // 2. Run digrag build
    await runDigragBuild(options);

    return { success: true };
  },
};
```

### 5.5 更新フロー図

```
┌─────────────────────────────────────────────────────────────────┐
│                        更新トリガー                              │
├────────────────┬────────────────────┬───────────────────────────┤
│   Git Hook     │   手動コマンド      │   ファイル監視（将来）     │
│  (post-commit) │ (storyteller rag)  │   (storyteller watch)     │
└───────┬────────┴─────────┬──────────┴────────────┬──────────────┘
        │                  │                       │
        ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                   変更検出                                       │
│  git diff-tree / ファイルハッシュ比較                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              storyteller rag export --incremental               │
├─────────────────────────────────────────────────────────────────┤
│  1. 変更ファイル検出                                             │
│  2. チャンキング戦略適用                                         │
│  3. メタデータ継承                                               │
│  4. digrag互換Markdown生成                                       │
│  5. .rag-docs/ に出力                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│       digrag build --incremental --with-embeddings              │
├─────────────────────────────────────────────────────────────────┤
│  1. ドキュメントハッシュ比較                                     │
│  2. 変更分のみ埋め込み生成（OpenRouter API）                     │
│  3. BM25インデックス更新                                         │
│  4. Vectorインデックス更新                                       │
│  5. .rag/ に保存                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. コスト見積もり

### 6.1 初期ビルド

```
前提:
├─ シーンファイル数: 50
├─ 平均ファイルサイズ: 10KB（5,000文字）
├─ チャンキング: シーン単位（平均3シーン/ファイル）
└─ チャンク総数: 150

トークン計算:
├─ 1チャンク平均: 2,000文字 × 1.3 = 2,600トークン
├─ 総トークン: 150 × 2,600 = 390,000トークン
└─ コスト: 0.39M × $0.02 = $0.0078 ≒ 1円

結論: 初期ビルドコストは無視できるレベル
```

### 6.2 インクリメンタル更新

```
前提:
├─ 更新頻度: 1日3回
├─ 平均変更ファイル: 2ファイル/回
└─ 変更チャンク: 6チャンク/回

月間コスト:
├─ 日次トークン: 6 × 2,600 × 3 = 46,800トークン
├─ 月間トークン: 46,800 × 30 = 1,404,000トークン
└─ コスト: 1.4M × $0.02 = $0.028 ≒ 4円/月

結論: 月額10円以下で運用可能
```

---

## 7. 実装計画

### 7.1 Phase 1: 基本チャンキング

```
目標: 戦略A（ドキュメント単位）の実装

タスク:
├─ storyteller rag export コマンド強化
│   ├─ シーン分割オプション追加
│   └─ メタデータ継承ロジック
├─ チャンキング設定の導入
└─ テスト

期間: 1週間
```

### 7.2 Phase 2: シーン単位分割

```
目標: 戦略B（シーン単位）の実装

タスク:
├─ ## 見出しでの分割ロジック
├─ オーバーラップ処理
├─ タグ自動生成
└─ インクリメンタル対応

期間: 1週間
```

### 7.3 Phase 3: 更新自動化

```
目標: Git hook + 手動更新コマンド

タスク:
├─ storyteller rag update コマンド
├─ Git hook テンプレート生成
│   └─ storyteller rag install-hooks
├─ 変更検出の最適化
└─ ドキュメント

期間: 1週間
```

### 7.4 Phase 4: セマンティック分割（オプション）

```
目標: 戦略C（大規模ファイル対応）

タスク:
├─ RecursiveCharacterTextSplitter相当の実装
├─ 分割優先順位の設定
└─ 長文ファイルのテスト

期間: 要検討
```

---

## 8. まとめ

### 8.1 推奨構成

| 項目               | 推奨値                        |
| ------------------ | ----------------------------- |
| **埋め込みモデル** | openai/text-embedding-3-small |
| **デフォルト戦略** | シーン単位分割（戦略B）       |
| **チャンクサイズ** | 〜5,000文字（digrag制限内）   |
| **オーバーラップ** | 10%（〜500文字）              |
| **更新トリガー**   | Git hook (post-commit) + 手動 |

### 8.2 決定事項

1. **小規模ファイル（〜3,000文字）**: 分割なしで1ドキュメント
2. **中規模ファイル（3,000〜15,000文字）**: ## 見出しでシーン分割
3. **大規模ファイル（15,000文字超）**: 将来的にセマンティック分割を検討
4. **メタデータ**: FrontMatterから継承し、タグとして付与
5. **更新**: post-commit hookで自動化、手動コマンドも提供

---

**作成日**: 2025-12-29 **関連ドキュメント**:
[PLAN_RAG_INTEGRATION.md](./PLAN_RAG_INTEGRATION.md)

---

## 参考資料

### チャンキング戦略

- [Best Chunking Strategies for RAG in 2025](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025)
- [Chunking Strategies for RAG - Weaviate](https://weaviate.io/blog/chunking-strategies-for-rag)
- [Chunking for RAG: best practices - Unstructured](https://unstructured.io/blog/chunking-for-rag-best-practices)
- [Breaking up is hard to do: Chunking in RAG - Stack Overflow](https://stackoverflow.blog/2024/12/27/breaking-up-is-hard-to-do-chunking-in-rag-applications/)

### 埋め込みモデル

- [OpenRouter Embeddings API](https://openrouter.ai/docs/api/reference/embeddings)
- [text-embedding-3-small Guide](https://zilliz.com/ai-models/text-embedding-3-small)
- [Qwen3 Embedding 8B - OpenRouter](https://openrouter.ai/qwen/qwen3-embedding-8b)

### 日本語処理

- [Beyond English: Implementing a multilingual RAG solution](https://towardsdatascience.com/beyond-english-implementing-a-multilingual-rag-solution-12ccba0428b6/)

### Git Hooks

- [Git Hooks Documentation](https://git-scm.com/docs/githooks)
- [Mastering Git Hooks - Kinsta](https://kinsta.com/blog/git-hooks/)
