# LSP (Language Server Protocol) ドキュメント

Street Storytellerは、エディタ統合のためのLSPサーバーを提供します。
原稿（Markdown）内のキャラクター・設定・伏線参照をリアルタイムで検出し、診断情報・ナビゲーション機能を提供します。

## クイックスタート

### LSPサーバー起動

```bash
# 標準入出力モードで起動
storyteller lsp start --stdio
```

### エディタ設定

```bash
# neovim用設定を生成
storyteller lsp install nvim

# VSCode用設定を生成
storyteller lsp install vscode
```

### ワンショット検証

```bash
# 単一ファイルを検証
storyteller lsp validate manuscripts/chapter01.md

# ディレクトリ内のファイルを検証
storyteller lsp validate --dir manuscripts/ --recursive
```

## サポート機能

### 1. テキストドキュメント同期

| メソッド                 | 説明                       |
| ------------------------ | -------------------------- |
| `textDocument/didOpen`   | ドキュメントを開いた時     |
| `textDocument/didChange` | ドキュメントが変更された時 |
| `textDocument/didClose`  | ドキュメントを閉じた時     |

### 2. 定義ジャンプ（Definition）

原稿内のエンティティ参照から、定義ファイルへジャンプできます。

```markdown
勇者は剣を抜いた。 ← カーソルを置いてGo to Definition
```

↓ ジャンプ先

```typescript
// src/characters/hero.ts
export const hero: Character = {
  name: "hero",
  displayNames: ["勇者"],
  ...
};
```

### 3. ホバー情報（Hover）

カーソル位置のエンティティ情報を表示します。

```
勇者 (character)
役割: protagonist
概要: 世界を救う運命を背負った若者
信頼度: 90%
```

### 4. 診断（Diagnostics）

リアルタイムで参照の整合性をチェックします。

| レベル      | 条件         | 説明             |
| ----------- | ------------ | ---------------- |
| Warning     | 信頼度 < 70% | 曖昧な参照       |
| Hint        | 信頼度 < 90% | 明示的参照の推奨 |
| Information | -            | 検出された参照   |

### 5. Code Action（v1.0新機能）

低信頼度（85%以下）の参照に対して、Quick Fixを提案します。

#### 機能概要

- 暗黙的な参照（`勇者`）を明示的参照（`@hero`）に変換
- エディタ上で直接適用可能
- 信頼度の低い参照を一括で改善

#### 対象となる参照

| 検出方法       | 信頼度 | Code Action           |
| -------------- | ------ | --------------------- |
| name（内部ID） | 1.0    | 対象外                |
| displayNames   | 0.9    | 対象外                |
| aliases        | 0.8    | 対象（Quick Fix提案） |

#### 使用例

1. エディタで原稿を開く
2. 低信頼度の参照（黄色の下線など）にカーソルを置く
3. Code Action（電球アイコン）をクリック
4. 「明示的参照に変換」を選択

```markdown
<!-- 変換前 -->

勇者は剣を抜いた。

<!-- 変換後 -->

@heroは剣を抜いた。
```

### 6. セマンティックトークン（v1.1新機能）

キャラクター名・設定名をエディタ上でハイライト表示します。

#### 機能概要

- キャラクター名を `character` トークンとしてハイライト
- 設定名（場所・世界観）を `setting` トークンとしてハイライト
- 信頼度に応じた3段階のスタイル

#### トークンタイプ

| トークンタイプ  | 対象                                          | 例                 |
| --------------- | --------------------------------------------- | ------------------ |
| `character`     | キャラクター名（name, displayNames, aliases） | 勇者、姫、主人公   |
| `setting`       | 設定名（name, displayNames）                  | 城、王都、魔法の森 |
| `foreshadowing` | 伏線名（name, displayNames）                  | ガラスの靴、予言   |

#### 信頼度モディファイア

| モディファイア     | 条件                | 推奨スタイル |
| ------------------ | ------------------- | ------------ |
| `highConfidence`   | 信頼度 >= 90%       | 通常色       |
| `mediumConfidence` | 70% <= 信頼度 < 90% | 薄め         |
| `lowConfidence`    | 信頼度 < 70%        | 点線下線     |

#### 伏線ステータスモディファイア（v1.2新機能）

| モディファイア | 条件           | 推奨スタイル       |
| -------------- | -------------- | ------------------ |
| `planted`      | 未回収の伏線   | オレンジ (#e67e22) |
| `resolved`     | 回収済みの伏線 | グリーン (#27ae60) |

#### サポートするメソッド

| メソッド                            | 説明                           |
| ----------------------------------- | ------------------------------ |
| `textDocument/semanticTokens/full`  | ドキュメント全体のトークン取得 |
| `textDocument/semanticTokens/range` | 指定範囲のトークン取得         |

#### neovim設定例

```lua
-- セマンティックトークンのハイライトグループを設定
vim.api.nvim_set_hl(0, "@lsp.type.character", { fg = "#61afef", bold = true })
vim.api.nvim_set_hl(0, "@lsp.type.setting", { fg = "#98c379", italic = true })
vim.api.nvim_set_hl(0, "@lsp.type.foreshadowing", { fg = "#e67e22", italic = true })

-- 信頼度によるスタイル分け
vim.api.nvim_set_hl(0, "@lsp.mod.highConfidence", {})
vim.api.nvim_set_hl(0, "@lsp.mod.mediumConfidence", { fg = "#abb2bf" })
vim.api.nvim_set_hl(0, "@lsp.mod.lowConfidence", { underdotted = true })

-- 伏線ステータスによるスタイル分け
vim.api.nvim_set_hl(0, "@lsp.mod.planted", { fg = "#e67e22" })  -- オレンジ（未回収）
vim.api.nvim_set_hl(0, "@lsp.mod.resolved", { fg = "#27ae60" }) -- グリーン（回収済み）
```

#### VSCode設定例

`settings.json`:

```json
{
  "editor.semanticTokenColorCustomizations": {
    "[*]": {
      "rules": {
        "character": { "foreground": "#61afef", "bold": true },
        "setting": { "foreground": "#98c379", "italic": true },
        "foreshadowing": { "foreground": "#e67e22", "italic": true },
        "*.lowConfidence": { "fontStyle": "underline" },
        "*.planted": { "foreground": "#e67e22" },
        "*.resolved": { "foreground": "#27ae60" }
      }
    }
  }
}
```

## 信頼度システム

### 基本信頼度

```typescript
const BASE_CONFIDENCE = {
  name: 1.0, // 内部ID名での完全一致
  displayNames: 0.9, // 表示名での一致
  aliases: 0.8, // 別名での一致
};
```

### 文脈による補正

- 助詞パターン（は/が/を/に/の/と/で/へ）がある場合: +0.1

### 診断の閾値

```typescript
const CONFIDENCE_THRESHOLD = {
  WARNING: 0.7, // これ未満でWarning
  HINT: 0.9, // これ未満でHint
  CODE_ACTION: 0.85, // これ以下でCode Action提案
};
```

## エディタ設定例

### neovim (nvim-lspconfig)

```lua
local lspconfig = require('lspconfig')

lspconfig.storyteller = {
  cmd = { 'storyteller', 'lsp', 'start', '--stdio' },
  filetypes = { 'markdown' },
  root_dir = lspconfig.util.root_pattern('storyteller.json', '.storyteller'),
  settings = {},
}

lspconfig.storyteller.setup{}
```

### VSCode

`.vscode/settings.json`:

```json
{
  "storyteller.enable": true,
  "storyteller.path": "storyteller",
  "storyteller.args": ["lsp", "start", "--stdio"]
}
```

## トラブルシューティング

### LSPサーバーが起動しない

```bash
# デバッグログを有効化
storyteller lsp start --stdio --debug

# 設定ファイルの確認
storyteller config show
```

### エンティティが検出されない

1. `storyteller.json`が正しく設定されているか確認
2. キャラクター/設定ファイルが存在するか確認
3. `displayNames`や`aliases`が正しく定義されているか確認

### Code Actionが表示されない

- 信頼度が85%を超える参照には表示されません
- `@`付きの明示的参照には表示されません
- エディタがCode Actionをサポートしているか確認

### coc.nvimとの競合（定義ジャンプ時エラー）

Neovim組み込みLSPでstoryteller
LSPを使用し、TypeScriptファイルにcoc.nvimを使用している場合、
定義ジャンプ（`textDocument/definition`）で`.ts`ファイルを開く際にエラーが発生することがあります。

**エラー例:**

```
Plugin not ready
```

**原因:**

storyteller LSPがキャラクター定義ファイル（`.ts`）へのジャンプを返した際、
coc.nvimがそのファイルにアタッチしようとしますが、初期化が完了していない状態で失敗します。

**解決策1: storytellerプロジェクト内の.tsファイルでcocを無効化**

```lua
-- ~/.config/nvim/lua/storyteller.lua に追加
vim.api.nvim_create_autocmd("BufReadPost", {
  pattern = { "*/src/characters/*.ts", "*/src/settings/*.ts" },
  callback = function()
    vim.b.coc_enabled = 0
  end,
})
```

**解決策2: プロジェクトルートでcocを無効化**

プロジェクトルートに`.vim/coc-settings.json`を作成:

```json
{
  "coc.preferences.enableMessageDialog": false,
  "typescript.enable": false
}
```

**解決策3: TypeScriptもNeovim組み込みLSPに移行**

coc-tsserverの代わりに`typescript-language-server`をNeovim組み込みLSPで使用することで、
競合を完全に回避できます。

## 関連ドキュメント

- [lsp-implementation.md](./lsp-implementation.md) - 実装詳細
- [mcp.md](./mcp.md) - MCPサーバー統合
- [cli.md](./cli.md) - CLIリファレンス

---

_Last updated: 2025-12-17 (v1.2 - 伏線対応追加)_
