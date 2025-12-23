# title: LSPファイル変更監視のパフォーマンス最適化

## 概要

- キャッシュバスター導入後のパフォーマンス低下を軽減し、ファイル変更時のセマンティックトークン更新を高速化する

### goal

- 単一ファイル変更時：変更されたファイルのみを再読み込み（現在は全ファイル再読み込み）
- 連続ファイル変更時（git checkout等）：デバウンスにより1回の処理にまとめる

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること
    - deno test -A
    - deno lint
    - deno fmt --check

## 開発のゴール

- デバウンス機能：連続したファイル変更イベント（200ms以内）を1回の処理にまとめる
- 差分更新機能：変更されたエンティティファイルのみを再読み込みし、Detectorを部分更新する

## 実装仕様

### 現状の問題（調査結果）

**`handleDidChangeWatchedFiles` の現在の動作**
(`src/lsp/server/server.ts`:680-772):

```typescript
// 問題1: 毎回全キャッシュをクリア
this.projectContextManager.clearCache();

// 問題2: getContext() → loadEntities() で全ファイルを再import
const context = await this.projectContextManager.getContext(this.projectRoot);
```

**`loadEntities` の現在の動作** (`src/cli/modules/lsp/start.ts`:149-263):

- 3つのディレクトリ（characters, settings, foreshadowings）を全て走査
- 各ファイルをキャッシュバスター付きでimport（`?v=${Date.now()}`）
- N個のファイルがあれば、1ファイル変更でもN回のimportが発生

**パフォーマンス影響**:

| シナリオ                       | 現状               | 処理回数 |
| ------------------------------ | ------------------ | -------- |
| 1ファイル編集・保存            | 全ファイル再import | N回      |
| Ctrl+S連打（5回）              | 5回 × 全ファイル   | 5N回     |
| git checkout（30ファイル変更） | 30回 × 全ファイル  | 30N回    |

### 最適化アプローチ

**Phase 1: デバウンス**

- ファイル変更イベントを200ms間バッファリング
- タイマー期間内の変更は1回にまとめて処理

**Phase 2: 差分更新**

- 変更されたファイルのURIからエンティティ種別を判定
- 単一ファイルのみを再importして該当エンティティを更新
- Detectorは部分更新（`updateSingleEntity`）

## 生成AIの学習用コンテキスト

### LSPサーバー実装

- `src/lsp/server/server.ts`
  - `handleDidChangeWatchedFiles` メソッド（680-772行目）
  - `LspServer` クラスのプロパティ定義部分

### エンティティローダー

- `src/cli/modules/lsp/start.ts`
  - `loadEntities` 関数（149-263行目）
  - `parseEntity`, `parseForeshadowingEntity` 関数

### 検出器

- `src/lsp/detection/positioned_detector.ts`
  - `updateEntities` メソッド（72-76行目）
  - `PositionedDetector` クラスのプロパティ

### プロジェクトコンテキスト

- `src/lsp/project/project_context_manager.ts`
  - `clearCache`, `getContext` メソッド

### 既存テスト

- `tests/lsp/server/server_file_watching_test.ts`
  - ファイル変更監視の既存テストパターン

## Process

### process1 デバウンス機能の実装

#### sub1 LspServerにデバウンス用プロパティを追加

@target: `src/lsp/server/server.ts` @ref: `src/lsp/server/capabilities.ts`
(FileEvent型)

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/server/server_file_watching_test.ts`

- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - 「LspServer - handleDidChangeWatchedFiles debounces rapid file changes」
  - 50ms間隔で3回のファイル変更イベントを送信
  - processFileChangesが1回だけ呼ばれることを検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `LspServer` クラスにプロパティを追加
  - `private fileChangeDebounceTimer: number | null = null`
  - `private pendingFileChanges: FileEvent[] = []`
  - `private readonly DEBOUNCE_DELAY = 200` (ms)
- [ ] `handleDidChangeWatchedFiles` をデバウンス対応に変更
  - 変更イベントを `pendingFileChanges` に追加
  - 既存タイマーがあればクリア
  - 新しいタイマーをセット（200ms後に `processFileChanges` を呼び出し）
- [ ] `processFileChanges` メソッドを新規作成
  - 現在の `handleDidChangeWatchedFiles` の本体処理を移動
  - バッファをクリア

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
  - `deno test --allow-all tests/lsp/server/server_file_watching_test.ts`
- [ ] 既存のファイル監視テストが引き続き通過することを確認
- [ ] 必要に応じてリファクタリング

### process2 単一エンティティローダーの実装

#### sub1 loadSingleEntity関数の作成

@target: `src/cli/modules/lsp/start.ts` @ref: `loadEntities`
関数（同ファイル内）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/lsp_start_entities_test.ts`

- [ ] テストケースを作成
  - 「LspStart helpers: loadSingleEntity loads only specified file」
  - 単一ファイルのパスを指定して、そのエンティティのみが返されることを検証
  - 存在しないファイルの場合はnullが返されることを検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `loadSingleEntity` 関数を新規作成
  ```typescript
  export async function loadSingleEntity(
    projectRoot: string,
    relativeFilePath: string, // 例: "src/foreshadowings/真夜中の期限.ts"
  ): Promise<DetectableEntity | null>;
  ```
- [ ] ファイルパスからエンティティ種別を判定
  - `/characters/` → kind: "character"
  - `/settings/` → kind: "setting"
  - `/foreshadowings/` → kind: "foreshadowing"
- [ ] キャッシュバスター付きでimport
- [ ] 適切なparse関数を呼び出してエンティティを返す

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 既存の `loadEntities` テストが通過することを確認
- [ ] 重複コードがあればヘルパー関数に抽出

### process3 Detector部分更新機能の実装

#### sub1 updateSingleEntityメソッドの追加

@target: `src/lsp/detection/positioned_detector.ts` @ref: `updateEntities`
メソッド（同ファイル内）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/detection/positioned_detector_test.ts`

- [ ] テストケースを作成
  - 「PositionedDetector - updateSingleEntity updates only specified entity」
  - 既存エンティティリストに新しいステータスのエンティティを渡す
  - 該当IDのエンティティのみが更新されることを検証
  - 「PositionedDetector - updateSingleEntity adds new entity if not exists」
  - 新しいIDのエンティティを渡す
  - エンティティリストに追加されることを検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `updateSingleEntity` メソッドを追加
  ```typescript
  updateSingleEntity(entity: DetectableEntity | null): void {
    if (!entity) return;
    const index = this.entities.findIndex(e => e.id === entity.id);
    if (index >= 0) {
      this.entities[index] = entity;
    } else {
      this.entities.push(entity);
    }
    this.lastResults = [];
    this.lastContent = "";
  }
  ```

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 既存のDetectorテストが通過することを確認

### process4 差分更新処理の統合

#### sub1 processFileChangesを差分更新に対応

@target: `src/lsp/server/server.ts` @ref: `src/cli/modules/lsp/start.ts`
(`loadSingleEntity`)

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/server/server_file_watching_test.ts`

- [ ] テストケースを作成
  - 「LspServer - processFileChanges uses incremental update for entity files」
  - 伏線ファイルの変更イベントを送信
  - `loadSingleEntity` が呼ばれ、`updateSingleEntity` が呼ばれることを検証
  - フルリロード（`loadEntities`）が呼ばれないことを検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `processFileChanges` メソッドを差分更新対応に変更
  ```typescript
  private async processFileChanges(changes: FileEvent[]): Promise<void> {
    // エンティティファイルの変更のみ抽出
    const entityChanges = changes.filter(c => this.isEntityFile(c.uri));

    if (entityChanges.length === 0) return;

    // 差分更新を試行
    try {
      for (const change of entityChanges) {
        const relPath = this.uriToRelativePath(change.uri);
        const entity = await loadSingleEntity(this.projectRoot, relPath);
        this.detector.updateSingleEntity(entity);
      }
    } catch (error) {
      // フォールバック: フルリロード
      console.error("[LSP:DEBUG] Incremental update failed, falling back to full reload");
      await this.fullReload();
    }

    // セマンティックトークンリフレッシュ
    await this.sendSemanticTokensRefresh();
  }
  ```
- [ ] ヘルパーメソッドを追加
  - `isEntityFile(uri: string): boolean`
  - `uriToRelativePath(uri: string): string`

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 既存のファイル監視テストが通過することを確認
- [ ] 手動テスト: Neovimで伏線ファイルを編集して色が変わることを確認

### process10 ユニットテスト（追加・統合テスト）

- [ ] デバウンスタイミングのエッジケーステスト
  - タイマー期間中に異なるファイルの変更が来た場合
  - タイマー期間後に変更が来た場合（別のデバウンスサイクル開始）
- [ ] 差分更新のエラーハンドリングテスト
  - ファイルが削除された場合
  - パースに失敗した場合
- [ ] 統合テスト
  - デバウンス → 差分更新 → セマンティックトークンリフレッシュのフロー

### process50 フォローアップ

（実装後に仕様変更などが発生した場合は、ここにProcessを追加する）

### process100 リファクタリング

- [ ] `handleDidChangeWatchedFiles` 内のデバッグログを適切なログレベルに変更
- [ ] 差分更新とフルリロードの共通処理を抽出
- [ ] マジックナンバー（200ms）を定数化

### process200 ドキュメンテーション

- [ ] `docs/lsp.md` にパフォーマンス最適化について追記
- [ ] Serena Memory `neovim_integration_lessons.md`
      にデバウンス・差分更新の教訓を追加
- [ ] CLAUDE.md のLSP関連セクションを更新（必要に応じて）
