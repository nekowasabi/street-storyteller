# title: ファイル参照展開機能（LSP拡張）

## 概要
- Character型などの`details`フィールドにおけるファイル参照（`{ file: string }`）を、エディタ上で展開表示し、編集時に元ファイルを更新する機能を実装する
- Phase 1〜3の段階的実装により、LSP標準機能 → Neovim拡張 → VSCode拡張 と機能を拡充

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
- **Phase 1**: LSP標準機能でファイル参照のホバープレビュー、Code Lens、定義ジャンプを実装
- **Phase 2**: Neovim Denopsプラグインでvirt_linesによるインラインプレビュー表示
- **Phase 3**: VSCode CustomEditorProviderで編集可能なカスタムエディタ

## 実装仕様

### 技術調査結果（根拠）

#### LSPの限界
- バーチャルドキュメントのインライン展開機能は**LSP標準に存在しない**
- Hover、Definition Jump、Code Lensは利用可能

#### エディタ固有の対応
| エディタ | 展開表示 | 編集同期 |
|---------|---------|---------|
| LSP標準 | Hover（1000文字制限） | Code Lensでサイドエディタ表示 |
| Neovim | extmark/virt_lines（読み取り専用） | 別バッファで対応 |
| VSCode | CustomEditorProvider | WebViewで編集→参照先ファイル更新 |

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
@target: `src/lsp/providers/file_ref_utils.ts`（新規）
@ref: `src/lsp/providers/provider_utils.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/providers/file_ref_utils_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - FILE_REF_PATTERNが`{ file: "./path.md" }`パターンを正しく検出する
  - FILE_REF_PATTERNが`{ "file": "path.md" }`パターンも検出する
  - isStorytellerFile()が`/characters/`を含むURIでtrueを返す
  - isStorytellerFile()が`/settings/`を含むURIでtrueを返す
  - isStorytellerFile()が`/samples/`を含むURIでtrueを返す
  - isStorytellerFile()が対象外URIでfalseを返す

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/lsp/providers/file_ref_utils.ts`を新規作成
  - FILE_REF_PATTERN正規表現を定義
  - isStorytellerFile()関数を実装
  - detectFileReference()関数を実装（位置からファイル参照を検出）
  - resolveFileRefPath()関数を実装（相対パスを絶対パスに解決）

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認
  - **テストが失敗した場合**: 修正 → テスト実行を繰り返す

---

### process2 HoverProvider拡張

#### sub1 ファイル参照ホバー機能
@target: `src/lsp/providers/hover_provider.ts`
@ref: `src/lsp/providers/file_ref_utils.ts`, `src/lsp/providers/literal_type_hover_provider.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/hover_provider_test.ts`
- [ ] テストケースを追加（既存テストファイルに追加）
  - TypeScriptファイル内の`{ file: "./description.md" }`にホバーでファイル内容が表示される
  - 参照先ファイルが存在しない場合、エラーメッセージが表示される
  - 1000文字を超えるファイルは truncated 表示される
  - storyteller専用ディレクトリ外のファイルではnullを返す

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] getHover()メソッドにファイル参照検出ロジックを追加
  - isStorytellerFile()でディレクトリチェック
  - detectFileReference()でファイル参照を検出
  - Deno.readTextFile()でファイル内容を読み込み
  - truncate処理（1000文字制限）
  - Markdown形式でホバーコンテンツを生成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 既存のホバーテストがすべて通過することを確認
- [ ] 再度テストを実行し、通過を確認

---

### process3 DefinitionProvider拡張

#### sub1 ファイル参照定義ジャンプ機能
@target: `src/lsp/providers/definition_provider.ts`
@ref: `src/lsp/providers/file_ref_utils.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/definition_provider_test.ts`
- [ ] テストケースを追加
  - `{ file: "./description.md" }`にカーソルがある場合、参照先ファイルのLocationを返す
  - ファイル参照がない場合は既存のエンティティ定義ジャンプにフォールバック
  - storyteller専用ディレクトリ外ではnullを返す

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] getDefinition()メソッドにファイル参照検出ロジックを追加
  - detectFileReference()でファイル参照を検出
  - resolveFileRefPath()でパスを解決
  - Location形式で返却

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 既存の定義ジャンプテストがすべて通過することを確認

---

### process4 CodeLensProvider新規作成

#### sub1 CodeLensProvider基本実装
@target: `src/lsp/providers/code_lens_provider.ts`（新規）
@ref: `src/lsp/providers/hover_provider.ts`, `src/lsp/providers/file_ref_utils.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/providers/code_lens_provider_test.ts`（新規）
- [ ] テストケースを作成
  - provideCodeLenses()がファイル参照行にCodeLensを返す
  - 複数のファイル参照がある場合、各行にCodeLensを返す
  - storyteller専用ディレクトリ外では空配列を返す
  - CodeLensのcommandが`storyteller.openReferencedFile`である
  - CodeLensのargumentsに解決済みファイルパスが含まれる

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] CodeLensProviderクラスを新規作成
  - provideCodeLenses()メソッドを実装
  - ファイル参照パターンを全行でスキャン
  - 各マッチに対してCodeLensオブジェクトを生成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング

---

### process5 LSPサーバー統合

#### sub1 Capabilities更新
@target: `src/lsp/server/capabilities.ts`
@ref: 既存のgetServerCapabilities()

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/server/capabilities_test.ts`
- [ ] テストケースを追加
  - getServerCapabilities()がcodeLensProviderを含む
  - getServerCapabilities()がexecuteCommandProviderを含む
  - executeCommandProvider.commandsに`storyteller.openReferencedFile`が含まれる

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] getServerCapabilities()にcodeLensProvider設定を追加
- [ ] executeCommandProvider.commandsに`storyteller.openReferencedFile`を追加

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認

#### sub2 Server登録とハンドラー
@target: `src/lsp/server/server.ts`
@ref: `src/lsp/providers/code_lens_provider.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/server_integration_test.ts`
- [ ] テストケースを追加
  - `textDocument/codeLens`リクエストが正しくハンドリングされる
  - `workspace/executeCommand`リクエストが正しくハンドリングされる

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] CodeLensProviderをサーバーに追加
- [ ] handleCodeLens()メソッドを実装
- [ ] handleExecuteCommand()メソッドを実装
- [ ] リクエストハンドラーマッピングに追加

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] LSPサーバー全体の統合テストを実行

---

### process6 LSPプロトコル型定義

#### sub1 CodeLens型追加
@target: `src/lsp/protocol/types.ts`
@ref: 既存のLSP型定義

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/protocol/types_test.ts`
- [ ] テストケースを追加（必要な場合）
  - CodeLens型が正しく定義されている
  - CodeLensParams型が正しく定義されている

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] CodeLens型を追加（既存になければ）
- [ ] CodeLensParams型を追加
- [ ] ExecuteCommandParams型を追加

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認

---

### process10 ユニットテスト（追加・統合テスト）

#### sub1 Phase 1統合テスト
@test: `tests/lsp/integration/file_ref_integration_test.ts`（新規）
- [ ] ホバー + 定義ジャンプ + CodeLensの統合動作を検証
- [ ] 実際のサンプルファイル（cinderella.ts）での動作確認
- [ ] エッジケース（ファイル不存在、大きなファイル等）のテスト

---

### process50 フォローアップ

#### Phase 2: Neovim Denopsプラグイン（将来実装）
- [ ] `~/.config/nvim/plugged/street-storyteller.vim/`にプラグイン作成
- [ ] virt_linesでインラインプレビュー表示
- [ ] `:StorytellerTogglePreviews`コマンド実装

#### Phase 3: VSCode拡張（将来実装）
- [ ] `vscode-extension/`ディレクトリ作成
- [ ] CustomEditorProvider実装
- [ ] WebViewで編集同期

---

### process100 リファクタリング

- [ ] file_ref_utils.tsの関数をより汎用的に
- [ ] エラーハンドリングの統一
- [ ] ログ出力の追加（デバッグ用）

---

### process200 ドキュメンテーション

- [ ] `docs/lsp.md`にファイル参照機能のドキュメントを追加
- [ ] CLAUDE.mdの「進行中の機能開発」セクションを更新
- [ ] README.mdの機能一覧を更新
