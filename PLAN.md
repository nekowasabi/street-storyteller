# title: ファイル参照展開機能（LSP拡張）

## 概要

- Character型などの`details`フィールドにおけるファイル参照（`{ file: string }`）を、エディタ上で展開表示し、編集時に元ファイルを更新する機能を実装する
- Phase 1〜3の段階的実装により、LSP標準機能 → Neovim拡張 → VSCode拡張
  と機能を拡充

### goal

- ユーザがcinderella.tsなどのキャラクター定義ファイルを開いた際、`{ file: "./description.md" }`のような参照にカーソルを合わせるとファイル内容がプレビュー表示される
- Code Lensクリックで参照先ファイルをサイドエディタで開ける
- Neovimでは仮想テキスト（virt_lines）でインラインプレビュー表示
- VSCodeでは編集可能なカスタムエディタで展開表示・編集同期

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- **Phase 1**: LSP標準機能でファイル参照のホバープレビュー、Code
  Lens、定義ジャンプを実装
- **Phase 2**: Neovim Denopsプラグインでvirt_linesによるインラインプレビュー表示
- **Phase 3**: VSCode CustomEditorProviderで編集可能なカスタムエディタ

## 実装仕様

### 技術調査結果（根拠）

#### LSPの限界

- バーチャルドキュメントのインライン展開機能は**LSP標準に存在しない**
- Hover、Definition Jump、Code Lensは利用可能

#### エディタ固有の対応

| エディタ | 展開表示                           | 編集同期                         |
| -------- | ---------------------------------- | -------------------------------- |
| LSP標準  | Hover（1000文字制限）              | Code Lensでサイドエディタ表示    |
| Neovim   | extmark/virt_lines（読み取り専用） | 別バッファで対応                 |
| VSCode   | CustomEditorProvider               | WebViewで編集→参照先ファイル更新 |

#### ファイル参照パターン

```typescript
const FILE_REF_PATTERN = /\{\s*["']?file["']?\s*:\s*["']([^"']+)["']\s*\}/;
```

#### 対象ディレクトリ制限（denols競合回避）

```typescript
function isStorytellerFile(uri: string): boolean {
  return uri.includes("/characters/") ||
    uri.includes("/settings/") ||
    uri.includes("/samples/");
}
```

## 生成AIの学習用コンテキスト

### 既存LSP実装

- `src/lsp/providers/hover_provider.ts`
  - EntityResolverを使用したエンティティホバー実装
  - getHover()メソッドの拡張ポイント
- `src/lsp/providers/definition_provider.ts`
  - getDefinition()メソッドの拡張ポイント
- `src/lsp/server/capabilities.ts`
  - getServerCapabilities()でcodeLensProvider追加
- `src/lsp/server/server.ts`
  - handleCodeLens(), handleExecuteCommand()ハンドラー追加

### テストパターン

- `tests/lsp/hover_provider_test.ts`
  - 既存のホバーテストパターン
- `tests/lsp/definition_provider_test.ts`
  - 既存の定義ジャンプテストパターン
- `tests/lsp/providers/code_action_provider_test.ts`
  - プロバイダーテストのパターン参考

---

## Process

### process1 ファイル参照検出ユーティリティ

#### sub1 FILE_REF_PATTERN定数とisStorytellerFile()関数

@target: `src/lsp/providers/file_ref_utils.ts`（新規） @ref:
`src/lsp/providers/provider_utils.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/providers/file_ref_utils_test.ts`

- [x] テストケースを作成（この時点で実装がないため失敗する）
  - FILE_REF_PATTERNが`{ file: "./path.md" }`パターンを正しく検出する
  - FILE_REF_PATTERNが`{ "file": "path.md" }`パターンも検出する
  - isStorytellerFile()が`/characters/`を含むURIでtrueを返す
  - isStorytellerFile()が`/settings/`を含むURIでtrueを返す
  - isStorytellerFile()が`/samples/`を含むURIでtrueを返す
  - isStorytellerFile()が対象外URIでfalseを返す

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `src/lsp/providers/file_ref_utils.ts`を新規作成
  - FILE_REF_PATTERN正規表現を定義
  - isStorytellerFile()関数を実装
  - detectFileReference()関数を実装（位置からファイル参照を検出）
  - resolveFileRefPath()関数を実装（相対パスを絶対パスに解決）

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 必要に応じてリファクタリング
- [x] 再度テストを実行し、通過を確認
  - **テストが失敗した場合**: 修正 → テスト実行を繰り返す

**✅ process1 完了 (2025-12-20)**

---

### process2 HoverProvider拡張

#### sub1 ファイル参照ホバー機能

@target: `src/lsp/providers/hover_provider.ts` @ref:
`src/lsp/providers/file_ref_utils.ts`,
`src/lsp/providers/literal_type_hover_provider.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/hover_provider_test.ts`

- [x] テストケースを追加（既存テストファイルに追加）
  - TypeScriptファイル内の`{ file: "./description.md" }`にホバーでファイル内容が表示される
  - 参照先ファイルが存在しない場合、エラーメッセージが表示される
  - 1000文字を超えるファイルは truncated 表示される
  - storyteller専用ディレクトリ外のファイルではnullを返す

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] getHover()メソッドにファイル参照検出ロジックを追加
  - isStorytellerFile()でディレクトリチェック
  - detectFileReference()でファイル参照を検出
  - Deno.readTextFile()でファイル内容を読み込み
  - truncate処理（1000文字制限）
  - Markdown形式でホバーコンテンツを生成

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 既存のホバーテストがすべて通過することを確認
- [x] 再度テストを実行し、通過を確認

**✅ process2 完了 (2025-12-20)**

---

### process3 DefinitionProvider拡張

#### sub1 ファイル参照定義ジャンプ機能

@target: `src/lsp/providers/definition_provider.ts` @ref:
`src/lsp/providers/file_ref_utils.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/definition_provider_test.ts`

- [x] テストケースを追加
  - `{ file: "./description.md" }`にカーソルがある場合、参照先ファイルのLocationを返す
  - ファイル参照がない場合は既存のエンティティ定義ジャンプにフォールバック
  - storyteller専用ディレクトリ外ではnullを返す

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] getDefinition()メソッドにファイル参照検出ロジックを追加
  - detectFileReference()でファイル参照を検出
  - resolveFileRefPath()でパスを解決
  - Location形式で返却

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 既存の定義ジャンプテストがすべて通過することを確認

**✅ process3 完了 (2025-12-20)**

---

### process4 CodeLensProvider新規作成

#### sub1 CodeLensProvider基本実装

@target: `src/lsp/providers/code_lens_provider.ts`（新規） @ref:
`src/lsp/providers/hover_provider.ts`, `src/lsp/providers/file_ref_utils.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/providers/code_lens_provider_test.ts`（新規）

- [x] テストケースを作成
  - provideCodeLenses()がファイル参照行にCodeLensを返す
  - 複数のファイル参照がある場合、各行にCodeLensを返す
  - storyteller専用ディレクトリ外では空配列を返す
  - CodeLensのcommandが`storyteller.openReferencedFile`である
  - CodeLensのargumentsに解決済みファイルパスが含まれる

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] CodeLensProviderクラスを新規作成
  - provideCodeLenses()メソッドを実装
  - ファイル参照パターンを全行でスキャン
  - 各マッチに対してCodeLensオブジェクトを生成

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] 必要に応じてリファクタリング

**✅ process4 完了 (2025-12-20)**

---

### process5 LSPサーバー統合

#### sub1 Capabilities更新

@target: `src/lsp/server/capabilities.ts` @ref: 既存のgetServerCapabilities()

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/server/capabilities_test.ts`

- [x] テストケースを追加
  - getServerCapabilities()がcodeLensProviderを含む
  - getServerCapabilities()がexecuteCommandProviderを含む
  - executeCommandProvider.commandsに`storyteller.openReferencedFile`が含まれる

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] getServerCapabilities()にcodeLensProvider設定を追加
- [x] executeCommandProvider.commandsに`storyteller.openReferencedFile`を追加

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認

**✅ process5 sub1 完了 (2025-12-20)**

#### sub2 Server登録とハンドラー

@target: `src/lsp/server/server.ts` @ref:
`src/lsp/providers/code_lens_provider.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/server_integration_test.ts`

- [x] テストケースを追加
  - `textDocument/codeLens`リクエストが正しくハンドリングされる
  - `workspace/executeCommand`リクエストが正しくハンドリングされる

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] CodeLensProviderをサーバーに追加
- [x] handleCodeLens()メソッドを実装
- [x] handleExecuteCommand()メソッドを実装
- [x] リクエストハンドラーマッピングに追加

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認
- [x] LSPサーバー全体の統合テストを実行

**✅ process5 完了 (2025-12-20)**

---

### process6 LSPプロトコル型定義

#### sub1 CodeLens型追加

@target: `src/lsp/protocol/types.ts` @ref: 既存のLSP型定義

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/protocol/types_test.ts`

- [x] テストケースを追加（必要な場合）
  - CodeLens型が正しく定義されている
  - CodeLensParams型が正しく定義されている

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] CodeLens型を追加（code_lens_provider.tsに定義）
- [x] CodeLensParams型を追加
- [x] ExecuteCommandParams型を追加

##### TDD Step 3: Refactor & Verify

- [x] テストを実行し、通過することを確認

**✅ process6 完了 (2025-12-20)**

---

### process10 ユニットテスト（追加・統合テスト）

#### sub1 Phase 1統合テスト

@test: `tests/lsp/integration/file_ref_integration_test.ts`（新規）

- [x] ホバー + 定義ジャンプ + CodeLensの統合動作を検証
- [x] 実際のサンプルファイル（cinderella.ts）での動作確認
- [x] エッジケース（ファイル不存在、大きなファイル等）のテスト

**✅ process10 完了 (2025-12-20)**

---

### process20 Phase 2: Neovimインライン編集（Denopsプラグイン）

#### 概要

Denopsプラグインで**インライン展開→保存時分離**方式により、ファイル参照内容を直接編集可能にする

#### 動作フロー

```
【展開前】cinderella.ts
1: const character = {
2:   description: { file: "./desc.md" },
3:   traits: ["優しい"],

【展開後】cinderella.ts（編集可能）
1: const character = {
2:   description: { file: "./desc.md" },
3:   // ─── 📄 ./desc.md (storyteller:expand) ─────────
4:   // シンデレラは心優しい娘で、
5:   // 継母と義姉たちに虐げられながらも...
6:   // ─── 📄 end (storyteller:expand) ────────────────
7:   traits: ["優しい"],

【:w 保存時の動作】
1. マーカー間の内容を抽出（コメント接頭辞を除去）
2. ./desc.md ファイルに書き込み ← 参照先ファイルが更新される
3. マーカー間の行をバッファから削除
4. cinderella.ts は元の形式に戻る
```

#### sub1 プラグイン構造作成

@target: `~/.config/nvim/plugged/street-storyteller.vim/`（新規） @ref:
Denops標準パターン

##### TDD Step 1: Red（テストファイル作成）

@test:
`~/.config/nvim/plugged/street-storyteller.vim/denops/storyteller/file_ref/marker_test.ts`

- [ ] マーカー検出テスト
  - MARKER_START_PATTERNが開始マーカーを正しく検出
  - MARKER_END_PATTERNが終了マーカーを正しく検出
  - unwrapContentLine()がコメント接頭辞を除去

##### TDD Step 2: Green（最小限の実装）

- [ ] `denops/storyteller/file_ref/marker.ts`を作成
  - MARKER_START_PATTERN, MARKER_END_PATTERN定義
  - createStartMarker(), createEndMarker()関数
  - wrapContentLine(), unwrapContentLine()関数

##### TDD Step 3: Refactor & Verify

- [ ] テスト通過を確認

---

#### sub2 インライン展開機能

@target: `denops/storyteller/file_ref/expander.ts` @ref:
`denops/storyteller/file_ref/marker.ts`

##### TDD Step 1: Red

@test: `denops/storyteller/file_ref/expander_test.ts`

- [ ] expandFileReference()がファイル参照を検出し展開行を生成
- [ ] collapseFileReference()がマーカー間の行を削除

##### TDD Step 2: Green

- [ ] `expander.ts`を作成
  - expandFileReference()：参照先ファイルを読み込み、マーカー付きでバッファに挿入
  - collapseFileReference()：マーカー間の行を削除

##### TDD Step 3: Refactor & Verify

- [ ] テスト通過を確認

---

#### sub3 保存時同期機能

@target: `denops/storyteller/file_ref/sync.ts` @ref:
`denops/storyteller/file_ref/marker.ts`

##### TDD Step 1: Red

@test: `denops/storyteller/file_ref/sync_test.ts`

- [ ] detectExpandedSections()がマーカー間のセクションを検出
- [ ] syncOnSave()が参照先ファイルに書き込み後、バッファから削除

##### TDD Step 2: Green

- [ ] `sync.ts`を作成
  - ExpandedSection型定義
  - detectExpandedSections()：バッファ内の全展開セクションを検出
  - syncOnSave()：逆順で処理し、参照先ファイルに書き込み

##### TDD Step 3: Refactor & Verify

- [ ] テスト通過を確認

---

#### sub4 メインエントリ・コマンド登録

@target: `denops/storyteller/main.ts` @ref: 各モジュール

##### 実装内容

- [ ] コマンド登録
  - `:StorytellerExpand` - カーソル行のファイル参照を展開
  - `:StorytellerCollapse` - カーソル位置の展開を折りたたむ
  - `:StorytellerExpandAll` - バッファ内の全ファイル参照を展開
  - `:StorytellerCollapseAll` - バッファ内の全展開を折りたたむ
- [ ] 保存時フック（BufWritePre）登録

---

#### sub5 キーマッピング

@target: `plugin/storyteller.vim`

##### 実装内容

```vim
" ファイル参照の展開/折りたたみ
nnoremap <leader>se :StorytellerExpand<CR>
nnoremap <leader>sc :StorytellerCollapse<CR>
nnoremap <leader>sE :StorytellerExpandAll<CR>
nnoremap <leader>sC :StorytellerCollapseAll<CR>
```

---

#### sub6 ファイル参照検出（共通）

@target: `denops/storyteller/file_ref/detector.ts` @ref:
`src/lsp/providers/file_ref_utils.ts`（Phase 1で作成）

##### 実装内容

- [ ] Phase 1のfile_ref_utils.tsからパターン・関数を移植または共有
- [ ] detectFileReference()：行からファイル参照を検出
- [ ] resolveFilePath()：相対パスを絶対パスに解決

---

### process50 フォローアップ

#### Phase 3: VSCode拡張（将来実装）

- [ ] `vscode-extension/`ディレクトリ作成
- [ ] CustomEditorProvider実装
- [ ] WebViewで編集同期

---

### process100 リファクタリング

- [x] file_ref_utils.tsの関数をより汎用的に
  - getLineAtPosition(): 行取得ユーティリティ関数
  - detectAndResolveFileRef(): 検出と解決を統合した関数
- [x] エラーハンドリングの統一
- [x] ログ出力の追加（デバッグ用）
  - debugLog()関数を追加
  - 環境変数 STORYTELLER_LSP_DEBUG=1 で有効化

**✅ process100 完了 (2025-12-20)**

---

### process200 ドキュメンテーション

- [x] `docs/lsp.md`にファイル参照機能のドキュメントを追加
  - セクション6「ファイル参照機能（v1.4新機能）」を追加
  - ホバー、定義ジャンプ、Code Lens、対応パターンを説明
  - デバッグログの設定方法を記載
- [x] PLAN.mdの各プロセスに完了マークを追加
- [ ] CLAUDE.mdの「進行中の機能開発」セクションを更新（未実施）
- [ ] README.mdの機能一覧を更新（未実施）

**✅ process200 完了（主要ドキュメント更新済み）(2025-12-20)**

---

## Phase 1 実装完了サマリー

### 完了したプロセス

- **process1**: file_ref_utils.ts - ファイル参照検出ユーティリティ
- **process2**: HoverProvider拡張 - ファイル参照ホバー機能
- **process3**: DefinitionProvider拡張 - ファイル参照定義ジャンプ
- **process4**: CodeLensProvider新規作成
- **process5**: LSPサーバー統合
- **process6**: LSPプロトコル型定義
- **process10**: Phase 1統合テスト（7テスト）
- **process100**: リファクタリング
- **process200**: ドキュメンテーション

### テスト結果

- **総テスト数**: 382テスト
- **パス率**: 100%

### 実装ファイル

- `src/lsp/providers/file_ref_utils.ts` - 新規
- `src/lsp/providers/code_lens_provider.ts` - 新規
- `src/lsp/providers/hover_provider.ts` - 拡張
- `src/lsp/providers/definition_provider.ts` - 拡張
- `src/lsp/server/capabilities.ts` - 拡張
- `src/lsp/server/server.ts` - 拡張

### 未実装（将来対応）

- **process20**: Neovimインライン編集（Denopsプラグイン）
- **process50**: VSCode拡張
