# title: Street Storyteller v1.0 未完了タスク実装

## 概要
- Issue #9ロードマップに定義された未完了タスクを実装し、v1.0リリースを完成させる
- LSP Code Action、CLI JSON出力、IntentAnalyzer拡張を優先実装
- Phase 5のタスク（最適化、テスト、ドキュメント、リリース準備）を完了

### goal
- storytellerコマンドがv1.0として完成し、プロダクション利用可能な状態になる
- エディタ統合（LSP）でQuick Fix機能が使用可能になる
- MCPサーバーがより多くの自然言語パターンに対応する

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール
- Issue #3: LSP Code Action機能の実装
- Issue #6: CLI構造化出力（JSON）サポート
- Issue #8: IntentAnalyzer拡張（3→20+パターン）
- Issue #9 Phase 5: パフォーマンス最適化、テストカバレッジ80%、ドキュメント完成、v1.0リリース準備

## 実装仕様

### LSP Code Action機能
- `textDocument/codeAction`リクエストに対応
- 信頼度が低い参照（< 0.8）に対して@付き変換を提案
- 曖昧な参照に対する解決策を提案

### CLI JSON出力
- `--json`フラグで構造化出力を提供
- 各コマンドの結果をJSON形式で返却
- プログラマティックな処理を可能に

### IntentAnalyzer拡張
- 自然言語パターンを3個から20+個に拡張
- キャラクター、設定、メタデータ、LSP、ビュー、プロジェクト管理をカバー

## 生成AIの学習用コンテキスト

### LSP関連ファイル
- `src/lsp/server/capabilities.ts`
  - 現在の実装: `definitionProvider: true`, `hoverProvider: true`
  - 追加予定: `codeActionProvider: true`
- `src/lsp/server/server.ts`
  - LSPサーバーのメインハンドラー
  - `textDocument/definition`, `textDocument/hover`が実装済み
- `src/lsp/providers/hover_provider.ts`
  - 参照実装として活用
- `src/lsp/providers/definition_provider.ts`
  - 参照実装として活用
- `src/lsp/detection/positioned_detector.ts`
  - 信頼度計算、エンティティ検出ロジック

### CLI関連ファイル
- `src/cli/output_presenter.ts`
  - 現在: テキスト出力のみ（showInfo, showSuccess, showWarning, showError）
- `src/cli/types.ts`
  - CLI型定義
- `src/cli/modules/*.ts`
  - 各コマンドモジュール

### MCP/NLP関連ファイル
- `src/mcp/nlp/intent_analyzer.ts`
  - 現在: 3パターンのみ（キャラクター作成、メタデータチェック、LSP検証）
- `src/mcp/nlp/command_mapper.ts`
  - Intent → Tool マッピング

---

## Process

### process1 LSP Code Action機能の実装

#### sub1 CodeActionProviderクラスの作成
@target: `src/lsp/providers/code_action_provider.ts`（新規）
@ref: `src/lsp/providers/hover_provider.ts`, `src/lsp/providers/definition_provider.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/providers/code_action_provider_test.ts`
- [x] テストケースを作成（この時点で実装がないため失敗する）
  - 信頼度0.8の参照に対してCode Action提案が返されること
  - 信頼度1.0（@付き）の参照に対してはCode Actionが返されないこと
  - Code ActionにはQuick Fix種別と編集内容が含まれること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `CodeActionProvider`クラスの作成
  - `getCodeActions(uri, content, range, diagnostics, projectPath): Promise<CodeAction[]>`メソッド
- [x] 信頼度チェックロジックの実装
  - PositionedDetectorを使用してエンティティを検出
  - confidence <= 0.85（alias 0.8を含む）の場合にCode Actionを生成
- [x] TextEditの生成
  - 元のテキストを`@entityId`形式に置換

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 必要に応じてリファクタリング
- [x] 再度テストを実行し、通過を確認
  - **テストが失敗した場合**: 修正 → テスト実行を繰り返す

#### sub2 LSPサーバーへのCode Action統合
@target: `src/lsp/server/server.ts`, `src/lsp/server/capabilities.ts`
@ref: `src/lsp/providers/code_action_provider.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/server/server_code_action_test.ts`
- [x] テストケースを作成
  - `textDocument/codeAction`リクエストに対して正しいレスポンスが返ること
  - capabilitiesに`codeActionProvider: true`が含まれること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `capabilities.ts`に`codeActionProvider: true`を追加
- [x] `server.ts`に`textDocument/codeAction`ハンドラーを追加
  - CodeActionProviderを呼び出し
  - 結果をLSPレスポンス形式に変換

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 統合テストでエンドツーエンド動作確認
- [x] 再度テストを実行し、通過を確認

---

### process2 CLI JSON出力サポートの実装

#### sub1 JsonOutputPresenterの作成
@target: `src/cli/output_presenter.ts`
@ref: 既存の`OutputPresenter`インターフェース

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/json_output_presenter_test.ts`
- [ ] テストケースを作成
  - `showSuccess`がJSON形式で出力されること
  - `showError`がJSON形式でエラー情報を含むこと
  - 出力が有効なJSONとしてパース可能であること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `JsonOutputPresenter`クラスの作成
  - `OutputPresenter`インターフェースを実装
  - 各メソッドがJSON形式で出力

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング

#### sub2 --jsonフラグのCLI統合
@target: `src/cli/types.ts`, `src/cli/arg_parser.ts`
@ref: 既存のCLIオプション定義

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/json_flag_test.ts`
- [ ] テストケースを作成
  - `--json`フラグがパースされること
  - フラグ有効時にJsonOutputPresenterが使用されること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `GlobalOptions`に`json: boolean`を追加
- [ ] ArgParserで`--json`をパース
- [ ] フラグに応じてPresenterを切り替え

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 各コマンドでJSON出力が動作することを確認

---

### process3 IntentAnalyzer拡張

#### sub1 パターン定義の拡張
@target: `src/mcp/nlp/intent_analyzer.ts`
@ref: 既存の3パターン

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/nlp/intent_analyzer_test.ts`
- [x] テストケースを追加
  - 「主人公を追加して」→ `element_create` (confidence > 0.8)
  - 「設定を確認」→ `meta_check` (confidence > 0.8)
  - 「プロジェクトを表示」→ `view_browser` (confidence > 0.8)
  - 「参照を検索」→ `lsp_find_references` (confidence > 0.8)
  - その他15+パターン

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] キャラクター関連パターン追加（5個）
  - 「キャラクター」「登場人物」「主人公」「ヒロイン」「敵」
- [x] 設定関連パターン追加（3個）
  - 「設定」「世界観」「舞台」
- [x] メタデータ関連パターン追加（3個）
  - 「メタデータ」「frontmatter」「章情報」
- [x] LSP/検証関連パターン追加（3個）
  - 「検証」「診断」「整合性」
- [x] ビュー/表示関連パターン追加（3個）
  - 「表示」「ビュー」「可視化」
- [x] プロジェクト管理関連パターン追加（3個）
  - 「プロジェクト」「初期化」「バージョン」

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] パターンの重複・競合がないことを確認
- [x] 信頼度計算のバランス調整

---

### process10 ユニットテスト（追加・統合テスト）

#### sub1 LSP統合テスト
@test: `tests/lsp/integration/code_action_integration_test.ts`
- [ ] エンドツーエンドでCode Actionが動作すること
- [ ] neovim/VSCodeシミュレーションテスト

#### sub2 CLI統合テスト
@test: `tests/cli/integration/json_output_integration_test.ts`
- [ ] 全コマンドでJSON出力が正しく動作すること

#### sub3 MCP統合テスト
@test: `tests/mcp/integration/intent_analyzer_integration_test.ts`
- [ ] 複雑な自然言語入力に対する正しいIntent解析

---

### process50 フォローアップ
※実装後に仕様変更などが発生した場合は、ここにProcessを追加する

---

### process100 リファクタリング

#### sub1 LSPプロバイダーの共通化
- [x] HoverProvider、DefinitionProvider、CodeActionProviderの共通ロジック抽出
  - `lsp_types.ts`: LSP型定義の共通化（Range, Position, Location, Hover, CodeAction等）
  - `provider_utils.ts`: 共通ヘルパー関数（isValidContent, filePathToUri）
  - `entity_resolver.ts`: エンティティ解決ロジックの共通化（EntityResolver）
- [x] エンティティ解決の共通化
  - 各プロバイダーがEntityResolverを使用するようリファクタリング
  - 後方互換性のため型の再エクスポートを維持

#### sub2 OutputPresenterのファクトリパターン導入
- [x] Presenterの生成ロジックを一元化
  - `presenter_factory.ts`: PresenterFactoryクラス作成
  - PresenterType列挙型による種別指定
  - シングルトンファクトリ取得関数

---

### process200 ドキュメンテーション

#### sub1 CLAUDE.md更新
- [ ] 新機能（Code Action、JSON出力、IntentAnalyzer拡張）の記載
- [ ] MCPサーバーの使用方法更新

#### sub2 docs/ディレクトリ更新
- [ ] `docs/lsp.md` - LSP機能の完全ドキュメント
- [ ] `docs/cli.md` - CLIオプションの完全ドキュメント
- [ ] `docs/mcp.md` - MCPサーバーの更新

#### sub3 Issue #9チェックボックス更新
- [ ] 完了タスクのチェックを入れる
- [ ] Phase 5完了状態を反映

---

## 調査結果の根拠

### LSP Code Action（Issue #3）
**調査ファイル**: `src/lsp/server/capabilities.ts`
```typescript
// 現在の実装
export function getServerCapabilities(): ServerCapabilities {
  return {
    textDocumentSync: TextDocumentSyncKind.Full,
    definitionProvider: true,      // ✅ 実装済み
    hoverProvider: true,            // ✅ 実装済み
    // codeActionProvider: true,    // ❌ 未実装
  };
}
```
**結論**: `codeActionProvider`を追加し、対応するハンドラーを実装する必要がある

### CLI JSON出力（Issue #6）
**調査ファイル**: `src/cli/output_presenter.ts`
```typescript
// 現在の実装
export interface OutputPresenter {
  showInfo(message: string): void;
  showSuccess(message: string): void;
  showWarning(message: string): void;
  showError(message: string): void;
}
```
**結論**: JSON出力に対応した新しいPresenterを実装し、`--json`フラグで切り替える

### IntentAnalyzer（Issue #8）
**調査ファイル**: `src/mcp/nlp/intent_analyzer.ts`
**現在のパターン数**: 3個
- キャラクター作成
- メタデータチェック
- LSP検証

**結論**: パターンを20+個に拡張し、より多くのユースケースに対応

---

## 実装完了時のアクション

1. `deno test`で全テストが通過することを確認
2. Issue #9のチェックボックスを更新
3. CHANGELOGを更新
4. v1.0リリース準備

