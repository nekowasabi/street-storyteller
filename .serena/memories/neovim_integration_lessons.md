# Neovim連携に関する教訓

## 最終更新: 2025-12-23

---

## 1. LSPセマンティックトークンハイライト

### 問題パターン

LSPサーバーがセマンティックトークンを正しく送信しているのに、Neovimで色分けされない

### 原因

Neovim側にハイライトグループが未定義

### 解決策

`~/.config/nvim/rc/plugins/lsp.vim` の `setup_storyteller_highlights()`
関数にハイライト定義を追加

### ハイライトグループの優先度（高→低）

1. `@lsp.typemod.<type>.<modifier>.<filetype>` -
   タイプ+モディファイア+ファイルタイプ
2. `@lsp.type.<type>.<filetype>` - タイプ+ファイルタイプ
3. `@lsp.mod.<modifier>` - モディファイアのみ

### storyteller LSP用ハイライト設定

```lua
local function setup_storyteller_highlights()
  -- キャラクター
  vim.api.nvim_set_hl(0, '@lsp.type.character', { fg = '#FF8800' })
  vim.api.nvim_set_hl(0, '@lsp.type.character.markdown', { fg = '#FF8800' })
  
  -- 設定
  vim.api.nvim_set_hl(0, '@lsp.type.setting', { fg = '#0087FF' })
  vim.api.nvim_set_hl(0, '@lsp.type.setting.markdown', { fg = '#0087FF' })
  
  -- 低信頼度
  vim.api.nvim_set_hl(0, '@lsp.mod.lowConfidence', { underdashed = true })

  -- 伏線（foreshadowing）
  vim.api.nvim_set_hl(0, '@lsp.type.foreshadowing', { fg = '#e67e22', italic = true })
  vim.api.nvim_set_hl(0, '@lsp.type.foreshadowing.markdown', { fg = '#e67e22', italic = true })
  vim.api.nvim_set_hl(0, '@lsp.mod.planted', { fg = '#e67e22' })
  vim.api.nvim_set_hl(0, '@lsp.mod.resolved', { fg = '#27ae60' })
  vim.api.nvim_set_hl(0, '@lsp.typemod.foreshadowing.planted.markdown', { fg = '#e67e22', bold = true })
  vim.api.nvim_set_hl(0, '@lsp.typemod.foreshadowing.resolved.markdown', { fg = '#27ae60', bold = true })
end
```

### ColorScheme対応

ColorScheme変更時にハイライトがリセットされるため、autocmdで再設定が必要：

```lua
vim.api.nvim_create_autocmd('ColorScheme', {
  callback = setup_storyteller_highlights,
})
```

---

## 2. render-markdown.nvim HTMLコメント問題

### 問題パターン

HTMLコメント `<!-- @foreshadowing:ID -->` がMarkdownファイルで非表示になる

### 原因

render-markdown.nvim の `html.comment.conceal` がデフォルトで `true`

### 解決策

#### オプションA: HTMLコメントを表示（推奨）

```lua
require('render-markdown').setup({
  html = {
    comment = {
      conceal = false,
    },
  },
})
```

#### オプションB: HTML処理を完全無効化

```lua
require('render-markdown').setup({
  html = {
    enabled = false,
  },
})
```

### トラブルシューティング

設定が反映されない場合のチェックリスト：

1. **設定確認**:
   `:lua print(vim.inspect(require('render-markdown').config.html))`
2. **Treesitterパーサー**: `:TSInstallInfo html`
3. **conceallevel**: `:set conceallevel?`
4. **プラグイン読み込み順序**: lazy.nvim/packer設定確認

### 関連設定ファイル

- `~/.config/nvim/rc/plugins/render-markdown.vim`

---

## 3. LspSagaとdenolsの互換性

### 問題パターン

LspSagaのコマンド（`,cd`, `,ck`等）がdenolsで動作しない

### 原因

LspSagaがdenolsと正しく連携できない

### 解決策

TypeScriptファイルでは `vim.lsp.buf` を直接使用するキーマッピングを設定：

```lua
vim.api.nvim_create_autocmd("FileType", {
  pattern = { "typescript", "typescriptreact", "javascript", "javascriptreact" },
  callback = function()
    local opts = { buffer = true, silent = true }
    vim.keymap.set("n", ",cd", vim.lsp.buf.definition, opts)
    vim.keymap.set("n", ",ck", vim.lsp.buf.hover, opts)
  end,
})
```

---

## 4. 一般的なデバッグ手順

### LSP関連

```vim
" LSPクライアント状態確認
:LspInfo
:lua print(vim.inspect(vim.lsp.get_active_clients()))

" LSP再起動
:LspRestart

" ログ確認
:lua vim.lsp.set_log_level("trace")
:LspLog
```

### セマンティックトークン確認

```vim
:lua print(vim.inspect(vim.lsp.semantic_tokens))
:Inspect  " カーソル位置のハイライトグループ確認
```

### Treesitter確認

```vim
:TSInstallInfo
:InspectTree  " Treesitter AST表示
```

---

## 5. 設定ファイル一覧

| 用途            | パス                                            |
| --------------- | ----------------------------------------------- |
| LSP設定         | `~/.config/nvim/rc/plugins/lsp.vim`             |
| render-markdown | `~/.config/nvim/rc/plugins/render-markdown.vim` |
| Neovim本体      | `~/.config/nvim/init.vim`                       |

---

## 6. LSPファイル変更監視（File Watching）

### 問題パターン

外部ファイル（エンティティ定義等）を変更しても、原稿ファイルのハイライトが更新されない。
Neovim再起動すると反映される。

### 原因（v1.5以前）

storyteller LSPに`workspace/didChangeWatchedFiles`ハンドラーが未実装。

**v1.5以前の実装（`src/lsp/server/server.ts`）**:

- `textDocument/didOpen` - 実装済み
- `textDocument/didChange` - 実装済み
- `textDocument/didClose` - 実装済み
- `workspace/didChangeWatchedFiles` - **未実装**

### 解決策（v1.6 以降 - 実装済み）

`workspace/didChangeWatchedFiles`が実装されました。

#### 実装内容

1. `ServerCapabilities`に`workspace.fileOperations`を追加
2. `handleNotification`に`workspace/didChangeWatchedFiles`ケースを追加
3. 変更通知受信時に`projectContextManager.clearCache()`を呼び出し
4. 影響を受けるドキュメントの診断・セマンティックトークンを再計算

#### 動作フロー

1. エディタ（Neovim/VSCode等）がエンティティファイル変更を検知
2. 登録済みの監視対象パターンにマッチした場合、`workspace/didChangeWatchedFiles`をLSPサーバーに通知
3. storyteller LSPがキャッシュをクリア
4. 開いている原稿ファイルの表示が自動的に更新

#### 監視対象パターン

- `src/characters/**/*.ts`
- `src/settings/**/*.ts`
- `src/foreshadowings/**/*.ts`
- `src/timelines/**/*.ts`

#### Neovimでの使用

Neovim組み込みLSPクライアントはファイル監視を自動的に処理します。特別な設定は不要です。

**参考**: `docs/lsp.md`の「7. ファイル変更監視」セクション参照

### 関連ファイル

- `src/lsp/server/server.ts` - `handleNotification` - **実装済み**
- `src/lsp/server/capabilities.ts` - `ServerCapabilities` - **実装済み**
- `src/lsp/project/project_context_manager.ts` - `clearCache` - **実装済み**

---

## 7. Denoモジュールキャッシュと動的リロード

### 問題パターン

伏線ファイル（`src/foreshadowings/*.ts`）のstatusを変更しても、原稿ファイルのセマンティックトークンハイライト（伏線の色）がリアルタイムで更新されない。LSPを再起動すると反映される。

### 原因

**Denoのdynamic import（`import()`）はモジュールをキャッシュする**。

```typescript
// この呼び出しは最初の1回だけファイルを読み込み、以降はキャッシュから返す
const module = await import(filePath);
```

LSPサーバーのプロセス内で`loadEntities()`が呼ばれても、以前にimportしたモジュールはキャッシュされたままで、ファイルの変更が反映されない。

### 解決策

**import
URLにキャッシュバスター（クエリパラメータ）を追加**して、毎回新しいモジュールとして読み込む。

```typescript
// Before - キャッシュされる
const module = await import(filePath);

// After - 毎回新しいモジュールとして読み込み
const module = await import(`${filePath}?v=${Date.now()}`);
```

### 実装箇所

`src/cli/modules/lsp/start.ts`の`loadEntities()`関数内でキャッシュバスターを追加。

### デバッグプロセス（参考）

この問題の特定に至った段階的デバッグ手順:

1. **Step 1**: セマンティックトークン自体の動作確認
   - 結果: オレンジ色表示OK（トークンは送信されている）

2. **Step 2**: Neovimのハイライトグループ定義確認
   - 結果: `@lsp.type.foreshadowing.markdown`定義OK

3. **Step 3**: `:Inspect`で適用されているハイライト確認
   - 結果: priority 200-202で適用OK
   - 注意: `vim.hl.priorities.semantic_tokens = 200`設定が必要

4. **Step 4**: ファイル変更後のLSPログ確認
   - **発見**: `status=planted`のまま（変更が反映されていない）

5. **Step 5**: 根本原因特定
   - Denoのモジュールキャッシュ問題を特定
   - 参考Issue:
     - https://github.com/denoland/deno/issues/6946
     - https://github.com/denoland/deno/issues/5548

### 関連知識

- Denoはdynamic importをキャッシュする（プロセス中は永続）
- Node.jsでは`delete require.cache[modulePath]`でキャッシュクリアできるが、Denoには同等機能がない
- キャッシュバスターは一般的なワークアラウンド（ブラウザのキャッシュ回避と同じ手法）

### 教訓

1. **LSPサーバーでファイル変更監視+再読み込みを行う場合、Denoモジュールキャッシュに注意**
2. **問題の切り分けは単純なところから始める**（「動いているか」→「設定されているか」→「データが正しいか」）
3. **vim.hl.priorities.semantic_tokensの設定が重要**（デフォルトでは他のハイライトに負ける場合がある）

---

## 教訓サマリー

1. **LSPとNeovimは別レイヤー**:
   LSP正常でもNeovimハイライト未定義なら表示されない
2. **プラグイン干渉に注意**:
   render-markdown等がconcealでテキストを隠す場合がある
3. **設定反映確認を習慣化**: `:lua print(vim.inspect(...))` で実際の設定値を確認
4. **ColorSchemeリセット対策**: autocmd ColorScheme でハイライト再設定
5. **Denoモジュールキャッシュに注意**: dynamic
   importはキャッシュされる。動的リロードには`?v=${Date.now()}`キャッシュバスター必須
6. **段階的デバッグ**: 「動作確認」→「設定確認」→「データ確認」の順で切り分け
