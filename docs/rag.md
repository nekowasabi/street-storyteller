# RAG (Retrieval-Augmented Generation) 機能

Street
StorytellerのRAG機能は、物語プロジェクトの全要素をAIが検索可能なドキュメントに変換し、
執筆支援の品質を向上させます。

## 概要

### 目的

- **コンテキスト準備の自動化**: キャラクター、設定、伏線等の情報を自動収集
- **関連情報取得の高精度化**: セマンティック検索による関連性の高い情報取得
- **リアルタイム更新**: Git hooks による自動同期

### アーキテクチャ

```
storyteller project
├── src/characters/    → RAGドキュメント生成
├── src/settings/      → RAGドキュメント生成
├── src/timelines/     → RAGドキュメント生成
├── src/foreshadowing/ → RAGドキュメント生成
├── manuscripts/       → RAGドキュメント生成
│
├── .rag-docs/         ← 生成されたMarkdownドキュメント
│   ├── character_hero.md
│   ├── setting_castle.md
│   └── ...
│
└── .rag/              ← digragインデックス（オプション）
    └── index/
```

## セットアップ

### 前提条件

- Deno v2.2.12以上
- storyteller CLIがインストール済み
- （オプション）digrag CLI（セマンティック検索用）

### 基本セットアップ

```bash
# 1. プロジェクトルートに移動
cd /path/to/story-project

# 2. RAGドキュメントを生成
storyteller rag export

# 3. (オプション) Git hooksをインストール
storyteller rag install-hooks
```

## CLIコマンドリファレンス

### `storyteller rag`

RAGドキュメント管理のメインコマンドです。

```bash
storyteller rag <subcommand> [options]
```

### `storyteller rag export`

プロジェクト要素をRAGドキュメントにエクスポートします。

```bash
storyteller rag export [options]
```

#### オプション

| オプション            | 短縮形 | 説明                                              | デフォルト  |
| --------------------- | ------ | ------------------------------------------------- | ----------- |
| `--output`            | `-o`   | 出力ディレクトリ                                  | `.rag-docs` |
| `--manuscript-format` | -      | 原稿フォーマット: `full` \| `summary`             | `full`      |
| `--chunking`          | -      | チャンキング戦略: `document` \| `scene` \| `auto` | `auto`      |
| `--incremental`       | -      | 変更ファイルのみエクスポート                      | `false`     |
| `--json`              | -      | JSON形式で出力                                    | `false`     |

#### 使用例

```bash
# 全要素をデフォルト設定でエクスポート
storyteller rag export

# シーン単位チャンキングで指定ディレクトリにエクスポート
storyteller rag export -o my-docs --chunking scene

# 変更ファイルのみエクスポート
storyteller rag export --incremental

# JSON形式で結果を取得（CI/CD用）
storyteller rag export --json
```

### `storyteller rag update`

RAGドキュメント生成とdigragインデックス構築を一括実行します。

```bash
storyteller rag update [options]
```

#### オプション

| オプション        | 短縮形 | 説明                                | デフォルト  |
| ----------------- | ------ | ----------------------------------- | ----------- |
| `--output`        | `-o`   | RAGドキュメント出力ディレクトリ     | `.rag-docs` |
| `--index-dir`     | `-i`   | digragインデックスディレクトリ      | `.rag`      |
| `--no-embeddings` | -      | embedding生成をスキップ（BM25のみ） | `false`     |
| `--force`         | -      | 強制フル再構築                      | `false`     |
| `--json`          | -      | JSON形式で出力                      | `false`     |

#### 使用例

```bash
# インクリメンタル更新
storyteller rag update

# フル再構築
storyteller rag update --force

# BM25のみ（高速、オフライン対応）
storyteller rag update --no-embeddings

# JSON形式で結果出力
storyteller rag update --json
```

### `storyteller rag install-hooks`

Git hooksをインストールして、コミット時にRAGドキュメントを自動更新します。

```bash
storyteller rag install-hooks [options]
```

#### オプション

| オプション | 説明                                      | デフォルト    |
| ---------- | ----------------------------------------- | ------------- |
| `--force`  | 既存フックを上書き                        | `false`       |
| `--hook`   | フックタイプ: `post-commit` \| `pre-push` | `post-commit` |

#### 使用例

```bash
# post-commitフックをインストール
storyteller rag install-hooks

# 既存フックを上書き
storyteller rag install-hooks --force

# pre-pushフックをインストール（push前に検証）
storyteller rag install-hooks --hook pre-push
```

## 日常運用ガイド

### ワークフロー

#### 基本ワークフロー

```bash
# 1. 執筆・編集
vim manuscripts/chapter01.md

# 2. コミット（Git hooks設定済みの場合、自動更新）
git add .
git commit -m "Add chapter 01"
# → RAGドキュメントが自動生成される

# 3. (必要に応じて) 手動更新
storyteller rag update
```

#### CI/CDパイプライン

```bash
# GitHub Actions等での使用例
- name: Update RAG documents
  run: |
    storyteller rag export --incremental --json > rag-result.json
    cat rag-result.json | jq '.errors'
```

### チャンキング戦略

RAGドキュメントの分割戦略を選択できます。

| 戦略       | 説明                          | 適用条件                      |
| ---------- | ----------------------------- | ----------------------------- |
| `document` | ドキュメント単位（分割なし）  | 小サイズ（〜3,000文字）       |
| `scene`    | シーン単位分割（`##` 見出し） | 中サイズ（3,000〜15,000文字） |
| `auto`     | サイズに応じて自動選択        | デフォルト推奨                |

#### 設定値

- **最大チャンクサイズ**: 5,000文字（digrag制限6,000内）
- **オーバーラップ**: 500文字（10%）
- **最小チャンクサイズ**: 200文字

### インクリメンタル更新

`--incremental`
オプションを使用すると、変更されたファイルのみを再エクスポートします。

```bash
# 変更されたファイルのみ更新
storyteller rag export --incremental
```

変更検出は以下に基づきます：

- ファイルのMD5ハッシュ
- 最終更新日時

### digrag連携

[digrag](https://github.com/your-org/digrag) はセマンティック検索エンジンです。
storytellerが生成したRAGドキュメントをdigragでインデックス化することで、
高精度な関連情報検索が可能になります。

```bash
# digragがインストール済みの場合、updateコマンドで一括実行
storyteller rag update

# digragのみ単独実行
digrag build --input .rag-docs --output .rag
```

## 生成されるドキュメント形式

### キャラクタードキュメント

```markdown
---
id: character_hero
title: "Character: 勇者"
date: 2025-01-15
tags: [character, protagonist, chapter01, chapter02, brave, kind]
sourcePath: src/characters/hero.ts
---

## 基本情報

- ID: hero
- 名前: 勇者
- 役割: protagonist
- 登場チャプター: chapter01, chapter02

## 性格・特徴

- brave
- kind

## 関係性

- heroine: romantic
- mentor: trust

## 概要

王国を救う使命を持った若者。

## 成長フェーズ

- Phase 1 (chapter01): 出発前 - 平凡な日常
- Phase 2 (chapter02): 旅立ち - 冒険の始まり
```

### 設定ドキュメント

```markdown
---
id: setting_castle
title: "Setting: 王城"
date: 2025-01-15
tags: [setting, location, chapter01, castle, royal]
sourcePath: src/settings/castle.ts
---

## 基本情報

- ID: castle
- 名前: 王城
- タイプ: location
- 別名: 王宮, ロイヤルパレス

## 概要

王国の中心に位置する壮大な城。

## 関連設定

- throne_room
- dungeon
```

### 伏線ドキュメント

```markdown
---
id: foreshadowing_ancient_sword
title: "Foreshadowing: 古の剣"
date: 2025-01-15
tags: [foreshadowing, chekhov, planted, major, chapter01]
sourcePath: src/foreshadowings/ancient_sword.ts
---

## 基本情報

- ID: ancient_sword
- 名前: 古の剣
- タイプ: chekhov
- 重要度: major
- ステータス: planted

## 設置情報

- チャプター: chapter01
- 説明: 城の地下室で発見された謎の剣

## 関連エンティティ

- キャラクター: hero, mentor
- 設定: dungeon
```

### タイムラインドキュメント

```markdown
---
id: timeline_main
title: "Timeline: メインストーリー"
date: 2025-01-15
tags: [timeline, story, chapter01, chapter02]
sourcePath: src/timelines/main.ts
---

## 基本情報

- ID: main
- 名前: メインストーリー
- スコープ: story

## 概要

物語の主要な時系列。

## イベント

- Event 1: 物語の始まり (chapter01)
- Event 2: 旅立ちの決意 (chapter01)
- Event 3: 冒険の開始 (chapter02)
```

## トラブルシューティング

### よくある問題

#### Q: `storyteller rag export` でエラーが発生する

**A**: プロジェクトルートで実行しているか確認してください。 `storyteller.json`
または `deno.json` が存在するディレクトリで実行する必要があります。

```bash
# プロジェクトルートに移動
cd /path/to/story-project
storyteller rag export
```

#### Q: 変更が反映されない

**A**: `--force` オプションでフル再構築を試してください。

```bash
storyteller rag update --force
```

#### Q: Git hooksが動作しない

**A**: フックスクリプトの実行権限を確認してください。

```bash
chmod +x .git/hooks/post-commit
```

#### Q: digragでエラーが発生する

**A**: digragが正しくインストールされているか確認してください。

```bash
# digragのインストール確認
which digrag

# digrag単体でテスト
digrag --help
```

### デバッグ

詳細なログを確認するには `--verbose` オプションを使用します。

```bash
storyteller rag export --verbose
```

## 関連ドキュメント

- [CLI リファレンス](./cli.md)
- [MCP API](./mcp.md)
- [LSP 機能](./lsp.md)
