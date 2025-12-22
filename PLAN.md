# title: LSPファイル変更監視機能の実装

## 概要

- 外部ファイル（伏線定義等のエンティティファイル）の変更を検知し、原稿ファイルのセマンティックトークン・診断をリアルタイムで更新する機能を実装

### goal

- 伏線設定ファイルを変更した後、Neovimを再起動せずに原稿ファイルのハイライトが自動更新される

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- LSPサーバーが`workspace/didChangeWatchedFiles`通知を処理できるようにする
- ファイル変更時にProjectContextManagerのキャッシュをクリアする
- 開いているドキュメントの診断・セマンティックトークンを再計算する

## 実装仕様

### LSPプロトコル仕様

- `workspace/didChangeWatchedFiles`:
  クライアントがファイル変更を検知した際に送信する通知
- `FileChangeType`: Created(1), Changed(2), Deleted(3)
- サーバーは`ServerCapabilities.workspace.fileOperations`でファイル監視サポートを宣言

### 監視対象ファイルパターン

- `src/characters/**/*.ts` - キャラクター定義
- `src/settings/**/*.ts` - 設定定義
- `src/foreshadowings/**/*.ts` - 伏線定義
- `src/timelines/**/*.ts` - タイムライン定義

## 生成AIの学習用コンテキスト

### LSPサーバー実装

- `src/lsp/server/server.ts`
  - `LspServer`クラス: メインサーバー実装
  - `handleNotification()`: 通知ハンドラー（変更対象）
- `src/lsp/server/capabilities.ts`
  - `ServerCapabilities`型: サーバー機能定義（変更対象）
  - `getServerCapabilities()`: キャパビリティ取得（変更対象）

### プロジェクトコンテキスト管理

- `src/lsp/project/project_context_manager.ts`
  - `ProjectContextManager.clearCache()`: キャッシュクリア（既存、呼び出し追加）
  - `ProjectContextManager.getContext()`: コンテキスト取得（キャッシュ利用）

### 診断・セマンティックトークン

- `src/lsp/diagnostics/diagnostics_publisher.ts`
  - 診断情報の再発行に使用
- `src/lsp/providers/semantic_tokens_provider.ts`
  - セマンティックトークンの再計算

### 既存テスト参照

- `tests/lsp/server/server_test.ts`
  - サーバーテストパターン参照

## Process

### process1 FileChangeType型の定義

@target: `src/lsp/server/capabilities.ts` @ref: LSP仕様
https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#fileChangeType

#### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/server/capabilities_test.ts`

- [x] `FileChangeType`定数が正しい値を持つことを検証
  - Created = 1
  - Changed = 2
  - Deleted = 3

#### TDD Step 2: Green（テストを通過させる最小限の実装）

- [x] `FileChangeType`定数オブジェクトを定義
- [x] 型エクスポートを追加

#### TDD Step 3: Refactor & Verify

- [x] `deno test tests/lsp/server/capabilities_test.ts` を実行
- [x] `deno check src/lsp/server/capabilities.ts` で型チェック

---

### process2 FileEvent型とDidChangeWatchedFilesParams型の定義

@target: `src/lsp/server/capabilities.ts`

#### TDD Step 1: Red

@test: `tests/lsp/server/capabilities_test.ts`

- [x] `FileEvent`型が`uri`と`type`プロパティを持つことを検証
- [x] `DidChangeWatchedFilesParams`型が`changes`配列を持つことを検証

#### TDD Step 2: Green

- [x] `FileEvent`型を定義（uri: string, type: FileChangeType）
- [x] `DidChangeWatchedFilesParams`型を定義（changes: FileEvent[]）

#### TDD Step 3: Refactor & Verify

- [x] `deno test tests/lsp/server/capabilities_test.ts`
- [x] `deno check src/lsp/server/capabilities.ts`

---

### process3 ServerCapabilitiesにworkspaceセクションを追加

@target: `src/lsp/server/capabilities.ts`

#### TDD Step 1: Red

@test: `tests/lsp/server/capabilities_test.ts`

- [x] `getServerCapabilities()`の戻り値に`workspace`プロパティが存在することを検証
- [x] `workspace.didChangeWatchedFiles`がtrueであることを検証

#### TDD Step 2: Green

- [x] `ServerCapabilities`型に`workspace`セクションを追加
- [x] `getServerCapabilities()`で`workspace.didChangeWatchedFiles`を返す

#### TDD Step 3: Refactor & Verify

- [x] `deno test tests/lsp/server/capabilities_test.ts`
- [x] `deno check src/lsp/server/capabilities.ts`

---

### process4 handleDidChangeWatchedFilesメソッドの実装

@target: `src/lsp/server/server.ts` @ref:
`src/lsp/project/project_context_manager.ts`

#### TDD Step 1: Red

@test: `tests/lsp/server/server_file_watching_test.ts`

- [x] `handleDidChangeWatchedFiles`がキャッシュをクリアすることを検証
  - モックProjectContextManagerを使用
  - `clearCache()`が呼ばれることを確認

#### TDD Step 2: Green

- [x] `LspServer`に`handleDidChangeWatchedFiles`メソッドを追加
- [x] メソッド内で`projectContextManager.clearCache()`を呼び出し

#### TDD Step 3: Refactor & Verify

- [x] `deno test tests/lsp/server/server_file_watching_test.ts --filter "handleDidChangeWatchedFiles"`
- [x] `deno check src/lsp/server/server.ts`

---

### process5 handleNotificationにworkspace/didChangeWatchedFilesケースを追加

@target: `src/lsp/server/server.ts`

#### TDD Step 1: Red

@test: `tests/lsp/server/server_file_watching_test.ts`

- [x] `workspace/didChangeWatchedFiles`通知を受信した際に`handleDidChangeWatchedFiles`が呼ばれることを検証

#### TDD Step 2: Green

- [x] `handleNotification`のswitch文に`workspace/didChangeWatchedFiles`ケースを追加
- [x] `handleDidChangeWatchedFiles`を呼び出し

#### TDD Step 3: Refactor & Verify

- [x] `deno test tests/lsp/server/server_file_watching_test.ts`
- [x] `deno check src/lsp/server/server.ts`

---

### process6 ファイル変更時の診断再発行

@target: `src/lsp/server/server.ts`

#### TDD Step 1: Red

@test: `tests/lsp/server/server_file_watching_test.ts`

- [x] ファイル変更後、開いているドキュメントの診断が再計算されることを検証

#### TDD Step 2: Green

- [x] `handleDidChangeWatchedFiles`内で、`documentManager`から開いているドキュメント一覧を取得
- [x] 各ドキュメントに対して`publishDiagnosticsForUri`を呼び出し

#### TDD Step 3: Refactor & Verify

- [x] `deno test tests/lsp/server/server_file_watching_test.ts`
- [x] `deno check src/lsp/server/server.ts`

---

### process10 統合テスト

#### sub1 エンドツーエンドテスト

@test: `tests/lsp/server/file_watching_integration_test.ts`

- [x] 伏線ファイル変更 → キャッシュクリア →
      診断更新の一連の流れをテスト（8シナリオ実装）

---

### process50 フォローアップ

（実装後に仕様変更などが発生した場合は、ここにProcessを追加する）

---

### process100 リファクタリング

- [x] 重複コードの抽出（不要と判断）
- [x] エラーハンドリングの強化（try-catch追加）
- [x] ログ出力の追加（デバッグ用console.debug）

---

### process200 ドキュメンテーション

- [x] `docs/lsp.md`にファイル監視機能のセクションを追加（セクション7「ファイル変更監視」）
- [x] Serena
      Memoryの`neovim_integration_lessons`を更新（v1.6実装完了ステータス）
- [x] CLAUDE.mdの「進行中の機能開発」セクションを更新（LSP機能として既に含まれているため追加不要）

---

## 調査結果サマリー

### 現状の問題点 → 実装完了

| コンポーネント          | 状態        | 詳細                                          |
| ----------------------- | ----------- | --------------------------------------------- |
| `handleNotification`    | ✅ 実装済み | `workspace/didChangeWatchedFiles`ケースを追加 |
| `ProjectContextManager` | ✅ 統合済み | `clearCache()`がファイル変更時に呼び出される  |
| `ServerCapabilities`    | ✅ 宣言済み | `workspace.didChangeWatchedFiles`を宣言       |

### 変更ファイル

- `src/lsp/server/server.ts` -
  `handleDidChangeWatchedFiles`メソッド追加、`handleNotification`拡張
- `src/lsp/server/capabilities.ts` - FileChangeType, FileEvent,
  DidChangeWatchedFilesParams型追加、workspace宣言
- `tests/lsp/server/server_file_watching_test.ts` - 6ユニットテスト（新規）
- `tests/lsp/server/file_watching_integration_test.ts` - 8統合テスト（新規）
- `tests/lsp/server/capabilities_test.ts` - 7テスト追加
- `docs/lsp.md` - ファイル監視セクション追加
- `.serena/memories/neovim_integration_lessons.md` - 実装完了ステータス更新

### 暫定回避策 → 不要になりました

~~`:LspRestart` コマンドでLSPサーバーを再起動するとキャッシュがクリアされる~~ →
エンティティファイル変更時に自動でキャッシュクリア・診断再発行が行われます
