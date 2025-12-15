# Street Storyteller - Neovim プラットフォームプロンプト

このドキュメントは、Neovim環境でStory Directorを使用する際のプラットフォーム固有情報を定義します。
基盤として `core.md` と `director.md` を参照します。

## プラットフォーム概要

NeovimはDenopsプラグインを通じてStory Directorと連携します。
執筆中にバッファを離れることなく、AI支援を受けられる環境を提供します。

### 特徴

- **簡潔応答モード**: エディタ内表示に最適化された簡潔な応答
- **フローティングウィンドウ**: カーソル位置に応答を表示
- **コンテキスト自動収集**: 現在のバッファとプロジェクト情報を自動取得
- **LSP連携**: diagnosticsと連携した整合性チェック

## インストール

### 前提条件

- Neovim 0.9+
- Deno 2.0+
- denops.vim

### プラグイン設定（lazy.nvim）

```lua
{
  "street-storyteller/street-storyteller.vim",
  dependencies = { "vim-denops/denops.vim" },
  config = function()
    vim.g.storyteller_openrouter_key = vim.env.OPENROUTER_API_KEY
    vim.g.storyteller_model = "anthropic/claude-3.5-sonnet"
  end,
}
```

### 環境変数

```bash
export OPENROUTER_API_KEY="your-api-key"
```

## Denops コマンド一覧

### `:StoryDirector`

物語のディレクターとしてAI応答を取得します。
現在のバッファとプロジェクト情報をコンテキストとして使用します。

**使用方法:**
```vim
:StoryDirector
```

**動作:**
1. 現在のバッファ内容を取得
2. カーソル位置を特定
3. `storyteller meta check --json` でプロジェクト情報取得
4. OpenRouter APIを呼び出し
5. フローティングウィンドウに応答を表示

### `:StoryImprove`

選択範囲またはカーソル行の文章改善提案を取得します。

**使用方法:**
```vim
" ビジュアルモードで選択してから
:'<,'>StoryImprove

" または現在行に対して
:StoryImprove
```

**動作:**
1. 選択範囲（または現在行）を取得
2. 前後の文脈を含めてコンテキスト構築
3. 改善提案をフローティングウィンドウに表示

### `:StoryAsk {question}`

自由な質問をAIに投げかけます。

**使用方法:**
```vim
:StoryAsk この章の問題点は？
:StoryAsk 主人公の動機を強化するには
```

**動作:**
1. 現在のバッファをコンテキストに含める
2. 指定された質問でAI呼び出し
3. フローティングウィンドウに応答を表示

### `:StoryValidate`

現在のファイルの整合性チェックを実行します。

**使用方法:**
```vim
:StoryValidate
```

**動作:**
1. `storyteller lsp validate {current_file}` を実行
2. 結果をquickfixリストに設定
3. 問題がある場合はdiagnosticsとして表示

## キーマッピング推奨設定

### 基本設定

```lua
-- ~/.config/nvim/after/ftplugin/markdown.lua
local opts = { buffer = true, silent = true }

-- ディレクター呼び出し
vim.keymap.set("n", "<Leader>sd", ":StoryDirector<CR>", opts)

-- 文章改善（ノーマルモード - 現在行）
vim.keymap.set("n", "<Leader>si", ":StoryImprove<CR>", opts)

-- 文章改善（ビジュアルモード - 選択範囲）
vim.keymap.set("v", "<Leader>si", ":'<,'>StoryImprove<CR>", opts)

-- 質問
vim.keymap.set("n", "<Leader>sa", ":StoryAsk ", opts)

-- 整合性チェック
vim.keymap.set("n", "<Leader>sv", ":StoryValidate<CR>", opts)
```

### 拡張設定

```lua
-- フローティングウィンドウを閉じる
vim.keymap.set("n", "<Leader>sc", function()
  -- 最後に開いたフローティングウィンドウを閉じる
  vim.cmd("pclose")
end, opts)

-- 結果をレジスタにヤンク
vim.keymap.set("n", "<Leader>sy", function()
  -- フローティングウィンドウの内容をクリップボードへ
  -- (プラグイン側で実装)
end, opts)
```

### キーマッピング一覧

| キー | コマンド | 説明 |
|------|----------|------|
| `<Leader>sd` | `:StoryDirector` | ディレクター呼び出し |
| `<Leader>si` | `:StoryImprove` | 文章改善 |
| `<Leader>sa` | `:StoryAsk ` | 質問（入力待ち） |
| `<Leader>sv` | `:StoryValidate` | 整合性チェック |
| `<Leader>sc` | - | ウィンドウを閉じる |

## 簡潔応答モード

Neovim環境では、フローティングウィンドウでの表示に最適化された**簡潔応答モード**が有効です。

### 特徴

- **文字数制限**: 応答は300文字以内に要約
- **箇条書き優先**: 長文の説明は箇条書きに変換
- **コード優先**: コマンド例は省略せず表示
- **段階的詳細化**: 「詳しく」と追加質問で詳細を取得

### 応答フォーマット例

**通常応答（Claude Desktop/Code）:**
```markdown
## 分析結果

### 概要
このプロジェクトは現在8章構成で、5名のキャラクターと3つの設定が定義されています。

### 詳細
...（長文の説明）...

### 推奨アクション
...
```

**簡潔応答（Neovim）:**
```
[分析] 8章/5キャラ/3設定
警告2件:
- ch03:15 未定義「魔女」
- ch05:42 低信頼度(65%)

fix: storyteller element character --name witch
```

### 詳細取得

簡潔な応答の後、詳細が必要な場合：

```vim
:StoryAsk 詳しく教えて
:StoryAsk 警告1の詳細
```

## フローティングウィンドウUI

### 表示仕様

```
+----------------------------------+
|  [Story Director]                |
+----------------------------------+
| [分析] 8章/5キャラ/3設定         |
| 警告2件:                         |
| - ch03:15 未定義「魔女」         |
| - ch05:42 低信頼度(65%)          |
|                                  |
| fix: storyteller element ...     |
+----------------------------------+
| q:閉じる  y:コピー  Enter:適用   |
+----------------------------------+
```

### 操作方法

| キー | 動作 |
|------|------|
| `q` / `<Esc>` | ウィンドウを閉じる |
| `y` | 内容をクリップボードにコピー |
| `Enter` | コマンド提案を実行（該当する場合） |
| `j` / `k` | スクロール |

## 設定オプション

```lua
-- ~/.config/nvim/lua/config/storyteller.lua

vim.g.storyteller_openrouter_key = vim.env.OPENROUTER_API_KEY
vim.g.storyteller_model = "anthropic/claude-3.5-sonnet"

-- フローティングウィンドウ設定
vim.g.storyteller_float_width = 60
vim.g.storyteller_float_height = 20
vim.g.storyteller_float_border = "rounded"

-- 簡潔モード設定
vim.g.storyteller_concise_mode = true
vim.g.storyteller_max_response_chars = 300

-- コンテキスト設定
vim.g.storyteller_context_lines = 50  -- 前後50行をコンテキストに含める
```

## LSP連携

### diagnostics統合

`:StoryValidate` の結果は Neovim の diagnostics に統合されます。

```lua
-- diagnostics設定例
vim.diagnostic.config({
  virtual_text = {
    prefix = "●",
    source = "always",
  },
  signs = true,
  underline = true,
})
```

### 表示例

```
manuscripts/chapter03.md
  15: ● [storyteller] 未定義キャラクター「魔女」
  42: ○ [storyteller] 低信頼度参照（信頼度: 65%）
```

## トラブルシューティング

### APIキーエラー

```
E: OPENROUTER_API_KEY not set
```

**解決方法:**
```bash
export OPENROUTER_API_KEY="your-key"
```

または

```lua
vim.g.storyteller_openrouter_key = "your-key"
```

### Denopsエラー

```
E: denops server not started
```

**解決方法:**
```vim
:call denops#server#start()
```

### フローティングウィンドウが表示されない

**確認事項:**
1. Neovim 0.9以上であること
2. `nvim_open_win` が利用可能であること

```vim
:echo has('nvim-0.9')  " 1 が返ること
```

---

_このドキュメントはNeovim固有の情報です。他のプラットフォームについては各ドキュメントを参照してください。_
