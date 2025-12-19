# title: TypeScriptリテラル型ホバードキュメント機能

## 概要

- TypeScriptファイル内のリテラル型値（例：`"protagonist"`,
  `"antagonist"`）にカーソルを合わせた際に、対応するドキュメントを表示する機能を実装する
- 既存の`LiteralTypeCompletionProvider`（補完時ドキュメント）と同様のアーキテクチャで、ホバー時にもドキュメントを提供する

### goal

- `src/type/v2/character.ts`等のTypeScriptファイルで`role: "protagonist"`の`"protagonist"`にカーソルを合わせ、`,ck`（hover）を実行すると「主人公」などのドキュメントが表示される

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- TypeScriptファイルでリテラル型値にホバーした際にドキュメントを表示する
- 既存の`ContextAnalyzer`と`LiteralTypeRegistry`を再利用して実装コストを最小化する
- denolsとの共存を維持（両方のホバー情報が表示される）

## 実装仕様

### 機能要件

1. `.ts`/`.tsx`ファイルでリテラル型値（文字列リテラル内）にホバーした際にドキュメントを返す
2. 対応するリテラル型：`CharacterRole`, `RelationType`, `ForeshadowingType`,
   `ForeshadowingStatus`, `SettingType`, `EventCategory`, `EventImportance`,
   `TimelineScope`, `TransitionType`, `PhaseImportance`
3. ドキュメントはMarkdown形式で返す
4. ホバー範囲（range）を正確に返す

### 非機能要件

- パフォーマンス：既存の補完処理と同等の軽量処理であること
- 互換性：既存のHoverProvider（マークダウンファイル向け）との共存

## 生成AIの学習用コンテキスト

### 参照すべき既存実装

- `src/lsp/providers/literal_type_completion_provider.ts`
  - `LiteralTypeCompletionProvider`クラス - 補完時のリテラル型ドキュメント提供
  - `getCompletions`メソッド - コンテキスト解析とドキュメント取得のフロー
- `src/lsp/providers/context_analyzer.ts`
  - `ContextAnalyzer`クラス - フィールドコンテキストの解析
  - `analyze`メソッド - 文字列リテラル検出、フィールド名取得
- `src/lsp/providers/literal_type_registry.ts`
  - `LiteralTypeRegistry`クラス - リテラル型定義とドキュメントのレジストリ
  - `findByFieldContext`メソッド - コンテキストからリテラル型定義を検索
  - `FieldContext`型 - コンテキスト情報の構造
- `src/lsp/server/server.ts`
  - `LspServer.handleHover`メソッド - 現在のホバーハンドラー実装

### テストパターン参照

- `tests/lsp/providers/literal_type_completion_provider_test.ts`
  - テストヘルパー関数`findPositionInString`
  - 各リテラル型のテストケース構成

## Process

### process1 LiteralTypeHoverProvider実装

#### sub1 基本クラス作成とCharacterRoleホバー対応

@target: `src/lsp/providers/literal_type_hover_provider.ts` @ref:
`src/lsp/providers/literal_type_completion_provider.ts`,
`src/lsp/providers/context_analyzer.ts`,
`src/lsp/providers/literal_type_registry.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/providers/literal_type_hover_provider_test.ts`

- [ ] テストファイルを新規作成
- [ ] テストケース1：`.ts`ファイルの`role: "protagonist"`でホバーするとドキュメントが返る
- [ ] テストケース2：非TypeScriptファイル（`.md`）ではnullを返す
- [ ] テストケース3：文字列リテラル外ではnullを返す
- [ ] テストケース4：未知のフィールドではnullを返す

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `LiteralTypeHoverProvider`クラスを作成
  - `ContextAnalyzer`と`LiteralTypeRegistry`をプロパティとして保持
- [ ] `getHover(uri, content, position): Hover | null`メソッドを実装
  - URIの拡張子チェック（`.ts`/`.tsx`のみ対応）
  - `ContextAnalyzer.analyze()`でフィールドコンテキストを取得
  - `inStringLiteral`チェック
  - `LiteralTypeRegistry.findByFieldContext()`でリテラル型定義を取得
  - 文字列リテラルの値を抽出
  - ドキュメントをMarkdown形式で返却
  - ホバー範囲（range）を計算して返却

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
  - `deno test tests/lsp/providers/literal_type_hover_provider_test.ts`
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認
  - **テストが失敗した場合**: 修正 → テスト実行を繰り返す

#### sub2 全リテラル型のホバー対応

@target: `src/lsp/providers/literal_type_hover_provider.ts` @test:
`tests/lsp/providers/literal_type_hover_provider_test.ts`

##### TDD Step 1: Red（失敗するテストを作成）

- [ ] テストケース：`ForeshadowingType`（`type: "prophecy"`）でホバー
- [ ] テストケース：`ForeshadowingStatus`（`status: "planted"`）でホバー
- [ ] テストケース：`SettingType`（`type: "location"`）でホバー
- [ ] テストケース：`EventCategory`（`category: "plot_point"`）でホバー
- [ ] テストケース：`RelationType`（`relationships`内の値）でホバー
- [ ] テストケース：`TransitionType`（`transitionType: "gradual"`）でホバー

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] 上記テストが通過することを確認（sub1の実装で対応済みのはず）
- [ ] 未対応があれば追加実装

##### TDD Step 3: Refactor & Verify

- [ ] 全テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング

### process2 LspServerへの統合

#### sub1 LspServer.handleHover更新

@target: `src/lsp/server/server.ts` @ref:
`src/lsp/providers/literal_type_hover_provider.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/server_integration_test.ts`（既存ファイルに追加）

- [ ] テストケース：TypeScriptファイルでリテラル型値へのホバーリクエストでドキュメントが返る
- [ ] テストケース：マークダウンファイルでは既存のHoverProviderが動作する

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `LspServer`クラスに`literalTypeHoverProvider`プロパティを追加
- [ ] コンストラクタで`LiteralTypeHoverProvider`をインスタンス化
- [ ] `handleHover`メソッドを更新
  - URIが`.ts`/`.tsx`の場合、まず`literalTypeHoverProvider.getHover()`を試行
  - 結果がnullの場合、既存の`hoverProvider.getHover()`にフォールバック
  - マークダウンファイルは既存の動作を維持

##### TDD Step 3: Refactor & Verify

- [ ] 統合テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

### process10 ユニットテスト（追加・統合テスト）

#### sub1 エッジケーステスト

@test: `tests/lsp/providers/literal_type_hover_provider_test.ts`

- [ ] 空文字列リテラル`""`でのホバー → nullを返す
- [ ] 部分的に入力された値（例：`"pro"`）でのホバー → nullを返す（完全一致のみ）
- [ ] ネストされたオブジェクト内のフィールド（例：`delta.traits.add`）でのホバー
- [ ] `.tsx`ファイルでの動作確認
- [ ] `.json`ファイルでの動作確認（対応する場合）

#### sub2 統合テスト

@test: `tests/lsp/server_integration_test.ts`

- [ ] 複数LSP環境でのホバー動作確認（denolsとの共存）
- [ ] 連続ホバーリクエストのパフォーマンス確認

### process50 フォローアップ

{{実装後に仕様変更などが発生した場合は、ここにProcessを追加する}}

### process100 リファクタリング

- [ ] `LiteralTypeCompletionProvider`と`LiteralTypeHoverProvider`の共通処理を抽出（必要に応じて）
- [ ] 型定義の整理（`Hover`型のインポート確認）

### process200 ドキュメンテーション

- [ ] `CLAUDE.md`の「LSP統合」セクションにホバー機能の説明を追加
- [ ] `docs/lsp.md`にリテラル型ホバー機能の説明を追加
- [ ] 変更をコミット
  - コミットメッセージ:
    `feat: TypeScriptリテラル型値のホバードキュメント機能を追加`
