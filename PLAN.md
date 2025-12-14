# title: LSP統合による原稿チェック機能の実装（Issue #3）

## 概要
- 原稿（Markdown）内のキャラクター・設定参照をリアルタイムで検出し、LSPを通じてエディタに診断情報・ナビゲーション機能を提供する
- @なしの自然な日本語執筆スタイルでキャラクター参照を検出可能にする

### goal
- neovimでMarkdownファイルを開くと、未定義のキャラクター参照に警告が表示される
- キャラクター名の上で`gd`を押すと、キャラクター定義ファイル（TypeScript）にジャンプできる
- キャラクター名の上で`K`を押すと、キャラクター情報（名前、役割、概要、信頼度）がホバー表示される

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール
- Phase 1-5（MVP）: LSPプロトコル基盤 → テキスト同期 → 検出エンジン → 診断機能 → ナビゲーション
- スクラッチでJSON-RPC 2.0を実装（外部依存なし）
- 日本語対応は基本助詞8種類（は/が/を/に/の/と/で/へ）

## 実装仕様

### 決定事項
| 項目 | 決定 | 理由 |
|-----|------|------|
| LSP実装方針 | スクラッチ実装 | 依存関係なし、学習効果、完全な制御 |
| MVP範囲 | Phase 1-5 | 診断 + 定義ジャンプ + ホバーまで |
| 日本語対応 | 基本助詞のみ | は/が/を/に/の/と/で/へ の8種類 |

### LSPキャパビリティ（MVP）
- `textDocumentSync`: Full (1)
- `diagnosticProvider`: true
- `definitionProvider`: true
- `hoverProvider`: true

## 生成AIの学習用コンテキスト

### 既存の型定義（再利用）
- `src/type/v2/character.ts`
  - Character型: displayNames, aliases, pronouns, detectionHints が定義済み
  - DetectionHints型: commonPatterns, excludePatterns, confidence
- `src/shared/result.ts`
  - Result<T, E>型: エラーハンドリングパターン

### 既存の検出ロジック（拡張対象）
- `src/application/meta/reference_detector.ts`
  - ReferenceDetector: キャラクター・設定の参照検出
  - 信頼度計算ロジック（name: 1.0, displayNames: 0.9, aliases: 0.8）
  - 参照: `tests/application/meta/reference_detector_test.ts`

### 既存のCLI基盤（パターン参照）
- `src/cli/command_registry.ts`
  - CommandRegistry: コマンド登録・解決システム
- `src/cli/base_command.ts`
  - BaseCliCommand: コマンド基底クラス
- `src/cli/modules/meta/generate.ts`
  - 参考実装: コマンドの実装パターン

### テスト基盤
- `tests/asserts.ts`
  - createStubLogger(), createStubPresenter(), createStubConfig()
  - withTestDir() パターン

---

## Process

### process1 JSON-RPCパーサー実装
JSON-RPC 2.0プロトコルのパース機能を実装する

#### sub1 JSON-RPCメッセージ型定義
@target: `src/lsp/protocol/types.ts`
@ref: LSP仕様書（https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/）

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/json_rpc_parser_test.ts`
- [x] テストケースを作成（この時点で実装がないため失敗する）
  - `JsonRpcRequest`, `JsonRpcResponse`, `JsonRpcError` 型が存在すること
  - `parseJsonRpc()` 関数が存在すること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/lsp/protocol/types.ts` に型定義を作成
  - JsonRpcRequest: { jsonrpc: "2.0", id?: number | string, method: string, params?: unknown }
  - JsonRpcResponse: { jsonrpc: "2.0", id: number | string | null, result?: unknown, error?: JsonRpcError }
  - JsonRpcError: { code: number, message: string, data?: unknown }

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 必要に応じてリファクタリング
- [x] 再度テストを実行し、通過を確認

#### sub2 JSON-RPCパーサー関数
@target: `src/lsp/protocol/json_rpc.ts`
@ref: `src/shared/result.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/json_rpc_parser_test.ts`
- [x] テストケースを作成
  - 有効なリクエストをパースできること
  - 無効なJSONでエラーを返すこと（code: -32700）
  - 無効なjsonrpcバージョンでエラーを返すこと（code: -32600）
  - 通知（idなし）を正しく処理すること
  - バッチリクエストを処理できること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `parseJsonRpc(input: string): Result<JsonRpcMessage, JsonRpcError>` 実装
- [x] `parseJsonRpcBatch(input: string): JsonRpcMessage[]` 実装
- [x] JSON.parse例外のキャッチとエラーコード変換

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] エラーコード定数の抽出（JSON_RPC_PARSE_ERROR = -32700 等）
- [x] 再度テストを実行し、通過を確認

---

### process2 LSPトランスポート実装
Content-Lengthベースのメッセージ境界処理を実装する

#### sub1 モックReader/Writer作成
@target: `tests/lsp/helpers.ts`
@ref: `tests/asserts.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/transport_test.ts`
- [x] テストケースを作成
  - `createMockReader()`, `createMockWriter()` が存在すること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `tests/lsp/helpers.ts` にモック関数を実装
  - createMockReader(data: string): Deno.Reader
  - createMockWriter(): { data: string, write(): Promise<number> }

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認

#### sub2 LspTransportクラス
@target: `src/lsp/protocol/transport.ts`
@ref: `src/lsp/protocol/json_rpc.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/transport_test.ts`
- [x] テストケースを作成
  - Content-Lengthヘッダーを正しく読み取れること
  - メッセージ本文を正しくパースすること
  - レスポンス書き込み時にContent-Lengthヘッダーを付与すること
  - 不完全なメッセージでエラーを返すこと

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `LspTransport` クラス実装
  - constructor(reader: Deno.Reader, writer: Deno.Writer)
  - read(): Promise<JsonRpcMessage>
  - write(message: JsonRpcMessage): Promise<void>
- [x] ヘッダーパース（Content-Length: N\r\n\r\n）
- [x] UTF-8エンコーディング処理

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] バッファ管理のリファクタリング
- [x] 再度テストを実行し、通過を確認

---

### process3 LSPサーバー初期化
initialize/initialized ハンドシェイクを実装する

#### sub1 サーバーキャパビリティ定義
@target: `src/lsp/server/capabilities.ts`
@ref: LSP仕様書

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/server_initialization_test.ts`
- [x] テストケースを作成
  - ServerCapabilities型が存在すること
  - getServerCapabilities() が正しい値を返すこと

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] ServerCapabilities型定義
- [x] getServerCapabilities()関数実装
  - textDocumentSync: 1 (Full)
  - definitionProvider: true
  - hoverProvider: true

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認

#### sub2 LspServerクラス基盤
@target: `src/lsp/server/server.ts`
@ref: `src/lsp/protocol/transport.ts`, `src/lsp/server/capabilities.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/server_initialization_test.ts`
- [x] テストケースを作成
  - initializeリクエストに正しいレスポンスを返すこと
  - initializedノーティフィケーションを処理できること
  - 初期化前のリクエストを拒否すること（code: -32002）

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `LspServer` クラス実装
  - constructor(transport: LspTransport, projectRoot: string)
  - start(): Promise<void> - メッセージループ開始
  - handleMessage(message: JsonRpcMessage): Promise<void>
  - handleInitialize(params: InitializeParams): InitializeResult
  - handleInitialized(): void
  - isInitialized(): boolean

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] メッセージルーティングのリファクタリング
- [x] 再度テストを実行し、通過を確認

---

### process4 ドキュメント管理
テキストドキュメントの同期と管理を実装する

#### sub1 DocumentManagerクラス
@target: `src/lsp/document/document_manager.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/document_manager_test.ts`
- [x] テストケースを作成
  - open()でドキュメントを保存できること
  - get()でドキュメントを取得できること
  - close()でドキュメントを削除できること
  - change()で増分更新を適用できること
  - change()で全文更新を適用できること
  - バージョン管理が正しく動作すること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `TextDocument` 型定義
  - uri: string, content: string, version: number, languageId: string
- [x] `DocumentManager` クラス実装
  - open(uri, text, version, languageId): void
  - get(uri): TextDocument | undefined
  - close(uri): void
  - change(uri, changes, version): void
- [x] 増分更新アルゴリズム（Range → 文字列置換）

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] マルチバイト文字の位置計算を検証
- [x] 再度テストを実行し、通過を確認

#### sub2 テキストドキュメント同期ハンドラ
@target: `src/lsp/handlers/text_document_sync.ts`
@ref: `src/lsp/document/document_manager.ts`, `src/lsp/server/server.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/text_document_sync_test.ts`
- [x] テストケースを作成
  - didOpenでドキュメントが開かれること
  - didChangeでドキュメントが更新されること
  - didCloseでドキュメントが閉じられること
  - 変更時に診断がトリガーされること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] handleDidOpen(params): void
- [x] handleDidChange(params): void
- [x] handleDidClose(params): void
- [x] LspServerへの統合

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process5 位置追跡付き検出エンジン
既存ReferenceDetectorを拡張し、位置情報を追跡する

#### sub1 PositionedDetectorクラス
@target: `src/lsp/detection/positioned_detector.ts`
@ref: `src/application/meta/reference_detector.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/positioned_detector_test.ts`
- [x] テストケースを作成
  - 検出結果に位置情報（line, character, length）が含まれること
  - マルチバイト文字の位置が正しく計算されること（バイト位置ではなく文字位置）
  - 複数出現を全て追跡できること
  - 既存のReferenceDetectorと同じ検出精度を維持すること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `Position` 型定義: { line: number, character: number }
- [x] `PositionedMatch` 型定義: { id: string, positions: Position[], confidence: number }
- [x] `PositionedDetector` クラス実装
  - constructor(referenceDetector: ReferenceDetector)
  - detectWithPositions(content: string, projectPath: string): Promise<PositionedDetectionResult>
- [x] 行・列位置の計算ロジック（改行でリセット、UTF-16コードユニット単位）

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 位置計算のエッジケーステスト追加
- [x] 再度テストを実行し、通過を確認

#### sub2 日本語パターンマッチャー
@target: `src/lsp/detection/japanese_pattern_matcher.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/japanese_pattern_matcher_test.ts`
- [x] テストケースを作成
  - 基本助詞（は/が/を/に/の/と/で/へ）付きパターンを生成できること
  - 文脈に基づく信頼度を計算できること（主語位置は高信頼度）
  - 除外パターンを正しく適用できること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `BASIC_PARTICLES` 定数: ["は", "が", "を", "に", "の", "と", "で", "へ"]
- [x] `JapanesePatternMatcher` クラス実装
  - expandWithParticles(word: string): string[]
  - findMatches(content: string, word: string): Match[]
  - calculateConfidence(content: string, word: string, position: number): number
  - addExcludePattern(pattern: string): void

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 信頼度計算ロジックの調整
- [x] 再度テストを実行し、通過を確認

---

### process6 診断機能
未定義参照や低信頼度マッチを警告として報告する

#### sub1 DiagnosticsGeneratorクラス
@target: `src/lsp/diagnostics/diagnostics_generator.ts`
@ref: `src/lsp/detection/positioned_detector.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/diagnostics_generator_test.ts`
- [x] テストケースを作成
  - 未定義のキャラクター参照をWarningとして報告すること
  - 低信頼度マッチをHintとして報告すること
  - 正確な位置情報（range）を含むこと
  - 関連情報（候補の提示）を含むこと

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `Diagnostic` 型定義（LSP準拠）
  - range: Range, message: string, severity: DiagnosticSeverity, source: "storyteller"
- [x] `DiagnosticsGenerator` クラス実装
  - constructor(detector: PositionedDetector)
  - generate(uri: string, content: string, projectPath: string): Promise<Diagnostic[]>
- [x] 未定義参照の検出ロジック
- [x] 信頼度閾値による診断レベル判定

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] メッセージの日本語化
- [x] 再度テストを実行し、通過を確認

#### sub2 DiagnosticsPublisherクラス
@target: `src/lsp/diagnostics/diagnostics_publisher.ts`
@ref: `src/lsp/server/server.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/diagnostics_publisher_test.ts`
- [x] テストケースを作成
  - publishDiagnostics通知を送信できること
  - 空の診断配列で診断をクリアできること
  - デバウンス処理が動作すること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `DiagnosticsPublisher` クラス実装
  - constructor(server: LspServer, options?: { debounceMs: number })
  - publish(uri: string, diagnostics: Diagnostic[]): void
- [x] デバウンス機能の実装

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process7 定義ジャンプ機能
キャラクター・設定の定義ファイルへのジャンプを実装する

#### sub1 DefinitionProviderクラス
@target: `src/lsp/providers/definition_provider.ts`
@ref: `src/lsp/detection/positioned_detector.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/definition_provider_test.ts`
- [x] テストケースを作成
  - キャラクター名からキャラクター定義ファイルのLocationを返すこと
  - 設定名から設定定義ファイルのLocationを返すこと
  - 非エンティティ位置ではnullを返すこと

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `Location` 型定義: { uri: string, range: Range }
- [x] `DefinitionProvider` クラス実装
  - constructor(detector: PositionedDetector)
  - getDefinition(uri: string, content: string, position: Position, projectPath: string): Promise<Location | null>
- [x] 位置からエンティティを特定するロジック
- [x] エンティティからファイルパスを解決するロジック

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process8 ホバー情報機能
キャラクター・設定のホバー情報を表示する

#### sub1 HoverProviderクラス
@target: `src/lsp/providers/hover_provider.ts`
@ref: `src/lsp/detection/positioned_detector.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/hover_provider_test.ts`
- [x] テストケースを作成
  - キャラクター情報（名前、役割、概要）を含むMarkdownを返すこと
  - 信頼度を表示すること
  - 関係性情報を表示すること
  - 非エンティティ位置ではnullを返すこと

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `Hover` 型定義: { contents: MarkupContent, range?: Range }
- [x] `HoverProvider` クラス実装
  - constructor(detector: PositionedDetector)
  - getHover(uri: string, content: string, position: Position, projectPath: string): Promise<Hover | null>
- [x] キャラクター情報のMarkdownフォーマット生成

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] ホバー表示内容の日本語化
- [x] 再度テストを実行し、通過を確認

---

### process9 LSPサーバー統合
各コンポーネントをLspServerに統合する

#### sub1 メッセージハンドラ統合
@target: `src/lsp/server/server.ts`
@ref: 全ての実装ファイル

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/lsp/server_integration_test.ts`
- [x] テストケースを作成
  - textDocument/definition リクエストを処理できること
  - textDocument/hover リクエストを処理できること
  - ドキュメント変更時に診断が発行されること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] handleDefinition(params): Promise<Location | null>
- [x] handleHover(params): Promise<Hover | null>
- [x] テキスト同期 → 診断発行のパイプライン構築

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process10 ユニットテスト（追加・統合テスト）

#### sub1 エッジケーステスト追加
@test: `tests/lsp/*.ts`
- [x] 空のドキュメントの処理
- [x] 非常に長い行の処理
- [x] 特殊文字（絵文字等）を含むドキュメント
- [x] 大量のキャラクター参照を含むドキュメント

#### sub2 統合テスト
@test: `tests/integration/lsp_server_integration_test.ts`
- [x] 完全な編集セッションのシミュレーション
- [x] 複数ドキュメントの同時編集

---

### process50 フォローアップ
実装後に仕様変更などが発生した場合は、ここにProcessを追加する

---

### process100 リファクタリング
- [ ] 共通コードの抽出
- [ ] エラーハンドリングの統一
- [ ] パフォーマンス最適化（キャッシュ導入等）

---

### process200 ドキュメンテーション
- [ ] CLAUDE.md にLSP関連の記述を追加
- [ ] README.md にLSP機能の使い方を追加
- [ ] neovim設定例のドキュメント作成
