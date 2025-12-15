# Street Storyteller UI/UX ガイド

本ドキュメントは、street-storytellerの各UIプラットフォームでの使用方法を説明します。

## 概要

street-storytellerは3つのUIプラットフォームをサポートしています：

| プラットフォーム | 用途                     | 主な機能                    |
| ---------------- | ------------------------ | --------------------------- |
| Claude Desktop   | 対話的なプロジェクト構築 | MCP Tools/Resources/Prompts |
| Claude Code      | CLI/自動化統合           | スラッシュコマンド          |
| Neovim           | リアルタイム執筆支援     | Denopsプラグイン            |

## Claude Desktop

### セットアップ

Claude Desktopの設定ファイルにMCPサーバーを追加：

```json
{
  "mcpServers": {
    "storyteller": {
      "command": "storyteller",
      "args": ["mcp", "start", "--stdio"]
    }
  }
}
```

### 利用可能な機能

#### Tools

| ツール名              | 説明                  |
| --------------------- | --------------------- |
| `meta_check`          | メタデータ検証        |
| `meta_generate`       | メタデータ生成        |
| `element_create`      | キャラクター/設定作成 |
| `view_browser`        | プロジェクト可視化    |
| `lsp_validate`        | 原稿整合性チェック    |
| `lsp_find_references` | 参照箇所検索          |

#### Resources

| リソースURI                    | 説明                 |
| ------------------------------ | -------------------- |
| `storyteller://project`        | プロジェクト全体像   |
| `storyteller://characters`     | キャラクター一覧     |
| `storyteller://character/<id>` | 特定キャラクター詳細 |
| `storyteller://settings`       | 設定一覧             |
| `storyteller://setting/<id>`   | 特定設定詳細         |

#### Prompts

| プロンプト名           | 説明                                 |
| ---------------------- | ------------------------------------ |
| `story_director`       | 物語のディレクターとして応答         |
| `character_brainstorm` | キャラクター案のブレインストーミング |
| `plot_suggestion`      | プロット提案                         |
| `scene_improvement`    | シーン改善提案                       |
| `project_setup_wizard` | プロジェクト初期化ウィザード         |
| `chapter_review`       | チャプターレビュー                   |
| `consistency_fix`      | 整合性修正提案                       |

### 使用例

**プロジェクト全体の把握：**

```
「このプロジェクトの全体像を教えて」
→ story_director プロンプトが自動的に使用される
```

**キャラクター追加：**

```
「主人公を追加したい」
→ character_brainstorm でアイデア出し
→ element_create で作成
```

## Claude Code

### セットアップ

プロジェクトルートに `.claude/commands/` ディレクトリが自動で作成されます。

### スラッシュコマンド

| コマンド          | 説明                     |
| ----------------- | ------------------------ |
| `/story-director` | ディレクターに質問・相談 |
| `/story-check`    | 整合性チェック実行       |
| `/story-char`     | キャラクター追加         |
| `/story-view`     | プロジェクト可視化       |

### 使用例

**ディレクターに質問：**

```
/story-director

プロジェクトの現状を分析して、次に取り組むべきことを提案してください。
```

**整合性チェック：**

```
/story-check
```

**キャラクター追加：**

```
/story-char sage supporting 主人公を導く賢者
```

## Neovim

### セットアップ

#### 前提条件

- Neovim 0.9+
- Deno 2.0+
- denops.vim

#### インストール（lazy.nvim）

```lua
{
  "~/.config/nvim/plugged/street-storyteller.vim",
  dependencies = { "vim-denops/denops.vim" },
  config = function()
    vim.g.storyteller_openrouter_key = vim.env.OPENROUTER_API_KEY
    vim.g.storyteller_model = "anthropic/claude-3.5-sonnet"
  end,
}
```

#### 環境変数

```bash
export OPENROUTER_API_KEY="your-api-key"
```

### コマンド

| コマンド               | 説明                             |
| ---------------------- | -------------------------------- |
| `:StoryDirector`       | プロジェクト分析と推奨アクション |
| `:StoryImprove`        | 選択範囲の改善提案               |
| `:StoryAsk {question}` | 自由な質問                       |
| `:StoryValidate`       | 整合性チェック                   |
| `:StoryHealth`         | プラグイン状態確認               |

### キーマッピング

Markdownファイルでデフォルトで有効：

| キー         | コマンド         | 説明         |
| ------------ | ---------------- | ------------ |
| `<Leader>sd` | `:StoryDirector` | ディレクター |
| `<Leader>si` | `:StoryImprove`  | 文章改善     |
| `<Leader>sa` | `:StoryAsk`      | 質問         |
| `<Leader>sv` | `:StoryValidate` | 検証         |

### フローティングウィンドウ操作

| キー          | 動作                   |
| ------------- | ---------------------- |
| `q` / `<Esc>` | 閉じる                 |
| `y`           | クリップボードにコピー |
| `j` / `k`     | スクロール             |

### 設定オプション

```lua
-- API設定
vim.g.storyteller_openrouter_key = vim.env.OPENROUTER_API_KEY
vim.g.storyteller_model = "anthropic/claude-3.5-sonnet"

-- UI設定
vim.g.storyteller_float_width = 60
vim.g.storyteller_float_height = 20
vim.g.storyteller_float_border = "rounded"

-- コンテキスト設定
vim.g.storyteller_context_lines = 50

-- デフォルトキーマップ無効化
vim.g.storyteller_no_default_keymaps = 1
```

## 共通コンセプト

### SaC (StoryWriting as Code)

物語の構造をコードで定義し、検証可能にするコンセプト：

- **型定義**: キャラクター、設定、プロットをTypeScriptで定義
- **参照システム**: `@hero` (明示的) / `勇者` (暗黙的) での参照
- **整合性検証**: LSPによるリアルタイム診断

### Story Director

プロジェクト全体を俯瞰する「物語のディレクター」として、以下を提供：

1. **全体像の把握**: キャラクター関係、時系列、伏線
2. **創作的アドバイス**: プロット改善、キャラクター深掘り
3. **技術的支援**: CLIコマンド、設定方法

### 応答モード

| プラットフォーム | モード    | 特徴                     |
| ---------------- | --------- | ------------------------ |
| Claude Desktop   | 詳細応答  | Markdown形式、表、リスト |
| Claude Code      | CLI最適化 | コマンド例、JSON出力     |
| Neovim           | 簡潔応答  | 300文字以内、箇条書き    |

## トラブルシューティング

### storytellerコマンドが見つからない

```bash
# グローバルインストール
deno install -A --name storyteller jsr:@street-storyteller/cli
```

### APIキーエラー（Neovim）

```lua
-- 直接設定
vim.g.storyteller_openrouter_key = "sk-or-xxx"

-- または環境変数
export OPENROUTER_API_KEY="sk-or-xxx"
```

### LSP接続エラー

```bash
# LSPサーバー動作確認
storyteller lsp validate --path manuscripts/chapter01.md
```

## 参考リンク

- [MCP詳細ドキュメント](./mcp.md)
- [LSP詳細ドキュメント](./lsp.md)
- [CLI詳細ドキュメント](./cli.md)
- [システムプロンプト定義](./prompts/)
