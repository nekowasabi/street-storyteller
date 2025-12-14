### process11 LSP CLIコマンド実装
LSPサーバーをCLIから起動できるようにする（Issue #9）

#### sub1 `storyteller lsp start --stdio` コマンド
@target: `src/cli/modules/lsp/start.ts`
@ref: `src/lsp/server/server.ts`, `src/lsp/protocol/transport.ts`, `src/cli/base_command.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/lsp_start_command_test.ts`
- [x] テストケースを作成（この時点で実装がないため失敗する）
  - `LspStartCommand`クラスがBaseCliCommandを継承していること
  - `--stdio`オプションを受け付けること
  - LspServerインスタンスを生成し、stdin/stdoutでトランスポートを初期化すること
  - プロジェクトルートを正しく検出すること（Deno.cwd()または--path指定）

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/cli/modules/lsp/start.ts` に `LspStartCommand` クラス作成
  - name = "start", path = ["lsp", "start"]
- [x] オプション解析: `--stdio`, `--path`, `--help`
- [x] エンティティロード（ReferenceDetectorの`loadEntities`パターンを参考）
- [x] `LspTransport(Deno.stdin.readable, Deno.stdout.writable)` 生成
- [x] `LspServer(transport, projectRoot, { entities }).start()` 呼び出し

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] エラーハンドリング（プロジェクトルートが見つからない場合）
- [x] 再度テストを実行し、通過を確認

#### sub2 `storyteller lsp install nvim` コマンド
@target: `src/cli/modules/lsp/install.ts`
@ref: `src/cli/modules/version.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/lsp_install_command_test.ts`
- [x] テストケースを作成
  - `LspInstallCommand`クラスが存在すること
  - `nvim`引数を受け付けること
  - neovim用Lua設定テンプレートを生成すること
  - `--output`オプションで出力先を指定できること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `LspInstallCommand` クラス作成
  - name = "install", path = ["lsp", "install"]
- [x] neovim用Luaテンプレート定義（nvim-lspconfig形式）
- [x] ファイル書き込み（`Deno.writeTextFile`）
- [x] --dry-runオプション対応

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

#### sub3 LSPコマンドグループ登録
@target: `src/cli/modules/lsp/index.ts`, `src/cli/modules/index.ts`
@ref: `src/cli/modules/meta/index.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/lsp_command_group_test.ts`
- [x] テストケースを作成
  - `lsp`コマンドグループが登録されていること
  - `storyteller lsp` でヘルプが表示されること
  - `storyteller lsp start --stdio` が解決されること
  - `storyteller lsp install nvim` が解決されること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/cli/modules/lsp/index.ts` に `createLspDescriptor()` 関数を作成
- [x] `LspCommand` クラス（グループルート）を作成
- [x] `src/cli/modules/index.ts` に LSP モジュールを登録

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] コマンドヘルプの日本語化
- [x] 再度テストを実行し、通過を確認

---

### process12 ブラウザ表示機能 Phase 2
物語要素をHTMLで可視化する（Issue #10）

#### sub1 プロジェクト解析サービス
@target: `src/application/view/project_analyzer.ts`
@ref: `src/application/meta/reference_detector.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/application/view/project_analyzer_test.ts`
- [x] テストケースを作成
  - `ProjectAnalyzer`クラスが存在すること
  - `analyzeProject(projectPath)` がキャラクター一覧を返すこと
  - `analyzeProject(projectPath)` が設定一覧を返すこと
  - 原稿ファイル一覧を取得できること
  - 各原稿に含まれるエンティティ参照を解析できること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `ProjectAnalysis` 型定義を作成
  - characters: CharacterSummary[], settings: SettingSummary[]
  - manuscripts: ManuscriptSummary[], relationships: RelationshipGraph
- [x] `ProjectAnalyzer` クラス作成
  - analyzeProject(projectPath: string): Promise<Result<ProjectAnalysis, AnalysisError>>
- [x] `loadEntities`パターンを再利用してエンティティをロード
- [x] 原稿ファイルの解析（ReferenceDetector活用）

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

#### sub2 HTML生成サービス
@target: `src/application/view/html_generator.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/application/view/html_generator_test.ts`
- [x] テストケースを作成
  - `HtmlGenerator`クラスが存在すること
  - `generate(analysis)` がスタンドアロンHTMLを返すこと
  - CSSが埋め込まれていること（外部依存なし）
  - キャラクター一覧セクションが含まれること
  - 設定一覧セクションが含まれること
  - 原稿との関連表示が含まれること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `HtmlGenerator` クラス作成
  - generate(analysis: ProjectAnalysis): string
- [x] HTMLテンプレート定義（Deno標準ライブラリのみ使用）
- [x] CSS定数（インライン埋め込み用）
- [x] 各セクションのレンダリング関数
  - renderCharacters(), renderSettings(), renderManuscripts()

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] スタイルの調整（見やすさ向上）
- [x] 再度テストを実行し、通過を確認

#### sub3 `storyteller view` CLIコマンド
@target: `src/cli/modules/view.ts`
@ref: `src/cli/modules/meta/generate.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/view_command_test.ts`
- [x] テストケースを作成
  - `ViewCommand`クラスが存在すること
  - デフォルトで`--output index.html`にHTML出力すること
  - `--output`オプションで出力先を指定できること
  - `--path`オプションでプロジェクトパスを指定できること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `ViewCommand` クラス作成
  - name = "view", path = ["view"]
- [x] オプション解析: `--output`, `--path`
- [x] `ProjectAnalyzer` + `HtmlGenerator` の連携
- [x] HTMLファイル書き込み

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] コマンドを `registerCoreModules` に登録
- [x] 再度テストを実行し、通過を確認

---

### process13 ブラウザ表示機能 Phase 3
ローカルサーバーとライブリロード機能を追加する（Issue #10）

#### sub1 ローカルHTTPサーバー
@target: `src/application/view/local_server.ts`
@ref: Deno標準HTTPサーバー

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/application/view/local_server_test.ts`
- [x] テストケースを作成
  - `LocalViewServer`クラスが存在すること
  - `start(port)` でHTTPサーバーを起動できること
  - `/` にアクセスするとHTMLが返ること
  - `stop()` でサーバーを停止できること
  - WebSocketエンドポイント `/ws` が存在すること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `LocalViewServer` クラス作成（`Deno.serve`使用）
  - setContent(html: string): void
  - start(port: number): Promise<void>
  - stop(): Promise<void>
- [x] リクエストハンドラー実装

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] MIMEタイプ処理の追加
- [x] 再度テストを実行し、通過を確認

#### sub2 ファイル監視とライブリロード
@target: `src/application/view/file_watcher.ts`
@ref: `src/cli/modules/meta/watch.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/application/view/file_watcher_test.ts`
- [x] テストケースを作成
  - `FileWatcher`クラスが存在すること
  - 指定ディレクトリの変更を検出できること
  - 変更時にコールバックを呼び出すこと
  - デバウンス処理が動作すること
  - `stop()` で監視を停止できること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `FileWatcher` クラス作成（`Deno.watchFs`使用）
  - constructor(watchPath, options: { onChange, debounceMs })
  - start(): Promise<void>
  - stop(): void
- [x] デバウンスロジック（meta/watch.tsパターン参照）

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

#### sub3 WebSocket通知統合
@target: `src/application/view/websocket_notifier.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/application/view/websocket_notifier_test.ts`
- [x] テストケースを作成
  - WebSocket接続を受け付けること
  - `notify(message)` で全クライアントにメッセージ送信できること
  - クライアント切断を処理できること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `WebSocketNotifier` クラス作成
  - handleConnection(socket: WebSocket): void
  - notify(message: string): void
- [x] HTMLにWebSocketクライアントコードを埋め込み
  - 接続確立、reloadメッセージ受信時にlocation.reload()

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

#### sub4 `storyteller view --serve` コマンド拡張
@target: `src/cli/modules/view.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/view_command_serve_test.ts`
- [x] テストケースを作成
  - `--serve` オプションでローカルサーバーを起動すること
  - `--port` オプションでポート指定できること（デフォルト: 8080）
  - `--watch` オプションでファイル監視とライブリロードを有効化すること
  - Ctrl+Cでサーバー停止すること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `ViewCommand` にサーバーモードを追加
- [x] `LocalViewServer` + `FileWatcher` + `WebSocketNotifier` の統合
- [x] シグナルハンドリング（SIGINT）

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] ログ出力の追加（起動URL表示）
- [x] 再度テストを実行し、通過を確認

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
