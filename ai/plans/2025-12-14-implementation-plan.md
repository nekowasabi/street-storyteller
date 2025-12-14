# Issue #9 未実装タスク TDD実装計画

**作成日**: 2024-12-14
**対象Issue**: #9 Street Storyteller v1.0 ロードマップ

## 概要

Issue #9の未実装タスクについて、TDD（テスト駆動開発）に基づく実装計画です。

### 対象タスク

| タスク | 見積もり | 状態 |
|--------|----------|------|
| LSP CLIコマンド | 1日 | 🔵 要実装 |
| ブラウザ表示機能 Phase 2 | 2日 | 🔵 要実装 |
| ブラウザ表示機能 Phase 3 | 1日 | 🔵 要実装 |
| **合計** | **4日** | |

### 決定事項

- HTML生成方式: **スタンドアロンHTML**（CSS埋め込み）
- 実装範囲: **Phase 2 + 3**（サーバー機能含む）
- LSP CLI: **含める**

---

## Process 1: LSP CLIコマンド（1日）

### sub1: `storyteller lsp start --stdio` コマンド

@target: `src/cli/modules/lsp/start.ts`
@ref: `src/lsp/server/server.ts`, `src/lsp/protocol/transport.ts`, `src/cli/base_command.ts`

#### TDD Step 1: Red
@test: `tests/cli/lsp_start_command_test.ts`
- [ ] `LspStartCommand`クラスがBaseCliCommandを継承していること
- [ ] `--stdio`オプションを受け付けること
- [ ] LspServerインスタンスを生成し、stdin/stdoutでトランスポートを初期化すること
- [ ] プロジェクトルートを正しく検出すること

#### TDD Step 2: Green
- [ ] `src/cli/modules/lsp/start.ts` に `LspStartCommand` クラス作成
- [ ] オプション解析: `--stdio`, `--path`, `--help`
- [ ] エンティティロード（ReferenceDetectorパターン）
- [ ] `LspTransport(Deno.stdin.readable, Deno.stdout.writable)` 生成
- [ ] `LspServer.start()` 呼び出し

#### TDD Step 3: Refactor
- [ ] エラーハンドリング
- [ ] 全テスト通過確認

---

### sub2: `storyteller lsp install nvim` コマンド

@target: `src/cli/modules/lsp/install.ts`

#### TDD Step 1: Red
@test: `tests/cli/lsp_install_command_test.ts`
- [ ] `LspInstallCommand`クラスが存在すること
- [ ] `nvim`引数を受け付けること
- [ ] neovim用Lua設定テンプレートを生成すること
- [ ] `--output`オプションで出力先を指定できること

#### TDD Step 2: Green
- [ ] `LspInstallCommand` クラス作成
- [ ] neovim用Luaテンプレート定義
- [ ] ファイル書き込み（`Deno.writeTextFile`）

#### TDD Step 3: Refactor
- [ ] 全テスト通過確認

---

### sub3: LSPコマンドグループ登録

@target: `src/cli/modules/lsp/index.ts`, `src/cli/modules/index.ts`

#### TDD Step 1: Red
@test: `tests/cli/lsp_command_group_test.ts`
- [ ] `lsp`コマンドグループが登録されていること
- [ ] `storyteller lsp start --stdio` が解決されること
- [ ] `storyteller lsp install nvim` が解決されること

#### TDD Step 2: Green
- [ ] `createLspDescriptor()` 関数作成
- [ ] `LspCommand` クラス（グループルート）作成
- [ ] `registerCoreModules` に LSP モジュール登録

#### TDD Step 3: Refactor
- [ ] コマンドヘルプの日本語化
- [ ] 全テスト通過確認

---

## Process 2: ブラウザ表示機能 Phase 2（2日）

### sub1: プロジェクト解析サービス

@target: `src/application/view/project_analyzer.ts`
@ref: `src/application/meta/reference_detector.ts`

#### TDD Step 1: Red
@test: `tests/application/view/project_analyzer_test.ts`
- [ ] `ProjectAnalyzer`クラスが存在すること
- [ ] `analyzeProject(projectPath)` がキャラクター一覧を返すこと
- [ ] `analyzeProject(projectPath)` が設定一覧を返すこと
- [ ] 原稿ファイル一覧を取得できること

#### TDD Step 2: Green
- [ ] `ProjectAnalyzer` クラス作成
- [ ] `ProjectAnalysis` 型定義
```typescript
type ProjectAnalysis = {
  characters: CharacterSummary[];
  settings: SettingSummary[];
  manuscripts: ManuscriptSummary[];
  relationships: RelationshipGraph;
};
```
- [ ] `loadEntities`パターンを再利用

#### TDD Step 3: Refactor
- [ ] 全テスト通過確認

---

### sub2: HTML生成サービス

@target: `src/application/view/html_generator.ts`

#### TDD Step 1: Red
@test: `tests/application/view/html_generator_test.ts`
- [ ] `HtmlGenerator`クラスが存在すること
- [ ] `generate(analysis)` がスタンドアロンHTMLを返すこと
- [ ] CSSが埋め込まれていること
- [ ] キャラクター・設定セクションが含まれること

#### TDD Step 2: Green
- [ ] `HtmlGenerator` クラス作成
- [ ] HTMLテンプレート定義
- [ ] CSS定数（インライン埋め込み用）
- [ ] 各セクションのレンダリング関数

#### TDD Step 3: Refactor
- [ ] スタイル調整
- [ ] 全テスト通過確認

---

### sub3: `storyteller view` CLIコマンド

@target: `src/cli/modules/view.ts`

#### TDD Step 1: Red
@test: `tests/cli/view_command_test.ts`
- [ ] `ViewCommand`クラスが存在すること
- [ ] デフォルトでHTML出力すること
- [ ] `--output`オプションで出力先指定できること
- [ ] `--path`オプションでプロジェクトパス指定できること

#### TDD Step 2: Green
- [ ] `ViewCommand` クラス作成
- [ ] オプション解析: `--output`, `--path`
- [ ] `ProjectAnalyzer` + `HtmlGenerator` の連携
- [ ] HTMLファイル書き込み

#### TDD Step 3: Refactor
- [ ] `registerCoreModules` に登録
- [ ] 全テスト通過確認

---

## Process 3: ブラウザ表示機能 Phase 3（1日）

### sub1: ローカルHTTPサーバー

@target: `src/application/view/local_server.ts`

#### TDD Step 1: Red
@test: `tests/application/view/local_server_test.ts`
- [ ] `LocalViewServer`クラスが存在すること
- [ ] `start(port)` でHTTPサーバー起動できること
- [ ] `/` にアクセスするとHTMLが返ること
- [ ] `stop()` でサーバー停止できること

#### TDD Step 2: Green
- [ ] `LocalViewServer` クラス作成（`Deno.serve`使用）
- [ ] リクエストハンドラー

#### TDD Step 3: Refactor
- [ ] MIMEタイプ処理
- [ ] 全テスト通過確認

---

### sub2: ファイル監視とライブリロード

@target: `src/application/view/file_watcher.ts`
@ref: `src/cli/modules/meta/watch.ts`

#### TDD Step 1: Red
@test: `tests/application/view/file_watcher_test.ts`
- [ ] `FileWatcher`クラスが存在すること
- [ ] 指定ディレクトリの変更を検出できること
- [ ] デバウンス処理が動作すること
- [ ] `stop()` で監視停止できること

#### TDD Step 2: Green
- [ ] `FileWatcher` クラス作成（`Deno.watchFs`使用）
- [ ] デバウンスロジック

#### TDD Step 3: Refactor
- [ ] 全テスト通過確認

---

### sub3: WebSocket通知統合

@target: `src/application/view/websocket_notifier.ts`

#### TDD Step 1: Red
@test: `tests/application/view/websocket_notifier_test.ts`
- [ ] WebSocket接続を受け付けること
- [ ] `notify(message)` で全クライアントにメッセージ送信できること

#### TDD Step 2: Green
- [ ] `WebSocketNotifier` クラス作成
- [ ] HTMLにWebSocketクライアントコード埋め込み

#### TDD Step 3: Refactor
- [ ] 全テスト通過確認

---

### sub4: `storyteller view --serve` コマンド拡張

@target: `src/cli/modules/view.ts`

#### TDD Step 1: Red
@test: `tests/cli/view_command_serve_test.ts`
- [ ] `--serve` オプションでローカルサーバー起動すること
- [ ] `--port` オプションでポート指定できること
- [ ] `--watch` オプションでライブリロード有効化すること

#### TDD Step 2: Green
- [ ] `ViewCommand` にサーバーモード追加
- [ ] `LocalViewServer` + `FileWatcher` + `WebSocketNotifier` 統合
- [ ] シグナルハンドリング（SIGINT）

#### TDD Step 3: Refactor
- [ ] ログ出力（起動URL表示）
- [ ] 全テスト通過確認

---

## Critical Files

### 新規作成ファイル

```
src/cli/modules/lsp/
├── index.ts       # LSPコマンドグループ
├── start.ts       # lsp start --stdio
└── install.ts     # lsp install nvim

src/application/view/
├── project_analyzer.ts    # プロジェクト解析
├── html_generator.ts      # HTML生成
├── local_server.ts        # HTTPサーバー
├── file_watcher.ts        # ファイル監視
└── websocket_notifier.ts  # WebSocket通知

src/cli/modules/view.ts    # viewコマンド
```

### 変更ファイル

- `src/cli/modules/index.ts` - lsp, viewモジュール登録

### 参照ファイル

- `src/cli/base_command.ts` - BaseCliCommand継承パターン
- `src/lsp/server/server.ts` - LspServerクラス
- `src/application/meta/reference_detector.ts` - loadEntitiesパターン
- `src/cli/modules/meta/watch.ts` - ファイル監視パターン

---

## 実装順序

1. **Process 1**: LSP CLIコマンド（sub1 → sub2 → sub3）
2. **Process 2**: ブラウザ表示 Phase 2（sub1 → sub2 → sub3）
3. **Process 3**: ブラウザ表示 Phase 3（sub1 → sub2 → sub3 → sub4）

各Processは独立しているため、並列実装も可能です。

---

## 検証チェックリスト

実装完了後、以下を確認：

- [ ] 全テストがパス（`deno test`）
- [ ] `storyteller lsp start --stdio` が動作
- [ ] `storyteller lsp install nvim` が設定ファイル生成
- [ ] `storyteller view` がHTML出力
- [ ] `storyteller view --serve` がサーバー起動
- [ ] `storyteller view --serve --watch` がライブリロード動作
