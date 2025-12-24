# title: Relationship型システム（キャラクター間人間関係）

## 概要

- キャラクター間の人間関係をクラスと型で表現し、成長や変化の要因となる依存関係を可視化できるようにする
- perspectives方式により双方向の視点を1つのエンティティで表現
- 詳細な変化履歴の追跡とネットワークグラフ可視化をサポート

### goal

- `storyteller element relationship` で関係性を定義できる
- `storyteller view relationship --graph` でネットワークグラフを表示できる
- `storyteller view browser` でHTML上に関係図を可視化できる
- LSPで原稿内の関係性参照を検出・ハイライトできる
- LSPで補完候補として関係性を提案できる

## 必須のルール

- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール

- 独立エンティティ方式でRelationshipを管理（`src/relationships/*.ts`）
- perspectives方式で双方向の視点を1エンティティに含む
- 詳細履歴で章・理由・強度変化を記録
- Mermaidネットワークグラフでの可視化
- LSP統合による原稿内参照検出

## 実装仕様

### Relationship型構造

```typescript
// カテゴリ（大分類）
export type RelationshipCategory =
  | "family" // 家族・血縁
  | "social" // 社会的つながり
  | "emotional" // 感情的つながり
  | "professional" // 職業的・役割的
  | "mystical"; // 神秘的・運命的

// 詳細タイプ
export type RelationshipDetailType =
  // family
  | "parent"
  | "child"
  | "sibling"
  | "spouse"
  | "adoptive"
  // social
  | "friend"
  | "rival"
  | "ally"
  | "enemy"
  | "acquaintance"
  // emotional
  | "romantic"
  | "unrequited_love"
  | "respect"
  | "hatred"
  | "fear"
  // professional
  | "mentor"
  | "student"
  | "colleague"
  | "subordinate"
  | "superior"
  // mystical
  | "bound"
  | "reincarnation"
  | "destiny";

// 感情の方向性
export type RelationshipSentiment =
  | "positive"
  | "negative"
  | "neutral"
  | "ambivalent";

// 一方の視点
export type Perspective = {
  type: RelationshipDetailType;
  category: RelationshipCategory;
  intensity: number; // 1-10
  sentiment: RelationshipSentiment;
  description?: string | { file: string };
};

// 変化履歴
export type RelationshipChange = {
  chapterId: string;
  eventId?: string;
  affectedParticipant: string;
  fromType?: RelationshipDetailType;
  toType: RelationshipDetailType;
  intensityDelta?: number;
  cause: string;
};

// メインエンティティ
export type Relationship = {
  // === 必須 ===
  id: string;
  participants: [string, string];
  perspectives: Record<string, Perspective>;
  summary: string;

  // === オプション ===
  startChapter?: string;
  isSecret?: boolean;
  history?: RelationshipChange[];
  displayLabel?: string;
  visualPriority?: number;
  details?: RelationshipDetails;
  detectionHints?: RelationshipDetectionHints;
};
```

### 既存型との互換性

- `Character.relationships: Record<string, RelationType>` は維持（簡易表現）
- 新規追加: `Character.detailedRelationships?: string[]`（Relationship ID参照）

## 生成AIの学習用コンテキスト

### 既存の型定義（参考パターン）

- `src/type/v2/timeline.ts`
  - 独立エンティティの設計例（Timeline, TimelineEvent）
  - 必須/オプショナルの分離パターン
  - `string | { file: string }` のハイブリッド詳細管理
- `src/type/v2/foreshadowing.ts`
  - 関連エンティティ参照パターン（relations.characters, relations.settings）
  - 状態管理（status: planted | resolved | ...）
- `src/type/v2/character.ts`
  - 現在のRelationType定義（7種類）
  - relationships: Record<string, RelationType>
- `src/type/v2/character_phase.ts`
  - RelationshipsDelta: 差分追跡の仕組み

### MCP実装パターン

- `src/mcp/resources/uri_parser.ts`
  - URIパース（VALID_TYPESセット）
- `src/mcp/resources/project_resource_provider.ts`
  - listResources(), readResource()の実装例
- `src/mcp/tools/definitions/foreshadowing_create.ts`
  - MCPツール定義の参考

### CLI実装パターン

- `src/cli/modules/element/timeline.ts`
  - elementコマンドの実装例
- `src/cli/modules/view/timeline.ts`
  - viewコマンドとMermaid生成の実装例

### HTML可視化

- `src/application/view/html_generator.ts`
  - カード形式表示
  - Mermaidフローチャート生成
  - 統計情報セクション

### LSP実装パターン

- `src/lsp/detection/positioned_detector.ts`
  - エンティティ検出
- `src/lsp/providers/semantic_tokens_provider.ts`
  - セマンティックトークン

---

## Process

### process1 型定義（基盤）

#### sub1 Relationship型の作成

@target: `src/type/v2/relationship.ts`（新規作成） @ref:
`src/type/v2/timeline.ts`, `src/type/v2/foreshadowing.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/type/relationship_test.ts`

- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - Relationship型が正しく定義されていることを検証
  - 必須フィールド（id, participants, perspectives, summary）の存在確認
  - perspectives方式の双方向表現が機能することを確認

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `RelationshipCategory` 型を定義（family, social, emotional, professional,
      mystical）
- [ ] `RelationshipDetailType` 型を定義（25種類の詳細タイプ）
- [ ] `RelationshipSentiment` 型を定義（positive, negative, neutral,
      ambivalent）
- [ ] `Perspective` 型を定義（type, category, intensity, sentiment,
      description）
- [ ] `RelationshipChange` 型を定義（履歴追跡用）
- [ ] `RelationshipDetails` 型を定義（origin, currentState, future, notes）
- [ ] `RelationshipDetectionHints` 型を定義（LSP用）
- [ ] `Relationship` 型を定義（メインエンティティ）

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process2 アナライザー拡張

#### sub1 ProjectAnalyzerにRelationshipローダー追加

@target: `src/application/view/project_analyzer.ts` @ref:
`src/application/view/project_analyzer.ts`（既存のloadTimelines,
loadForeshadowings）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/relationship_loader_test.ts`

- [ ] テストケースを作成
  - `loadRelationships()`が正しくファイルを読み込むことを検証
  - `RelationshipSummary`インターフェースの構造確認
  - `ProjectAnalysis.relationships`に結果が格納されることを確認

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `RelationshipSummary`インターフェースを定義
- [ ] `ProjectAnalysis`に`relationships`フィールドを追加
- [ ] `loadRelationships()`メソッドを実装
- [ ] `analyzeProject()`内で`loadRelationships()`を呼び出し

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] 既存のテストが壊れていないことを確認

---

### process3 MCPリソース統合

#### sub1 URIパーサー拡張

@target: `src/mcp/resources/uri_parser.ts` @ref:
`src/mcp/resources/uri_parser.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/mcp/uri_parser_relationship_test.ts`

- [ ] `storyteller://relationships`のパース検証
- [ ] `storyteller://relationship/{id}`のパース検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `ParsedUri.type`に`"relationships"`, `"relationship"`を追加
- [ ] `VALID_TYPES`セットに追加

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub2 ProjectResourceProvider拡張

@target: `src/mcp/resources/project_resource_provider.ts` @ref:
`src/mcp/resources/project_resource_provider.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/mcp/relationship_resource_test.ts`

- [ ] `listResources()`がrelationshipsリソースを返すことを検証
- [ ] `readResource()`がrelationshipsを正しく返すことを検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `listResources()`にrelationshipsリソース定義を追加
- [ ] `readResource()`にrelationshipsケースを追加

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

---

### process4 MCPツール実装

#### sub1 relationship_createツール

@target: `src/mcp/tools/definitions/relationship_create.ts`（新規作成） @ref:
`src/mcp/tools/definitions/foreshadowing_create.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/mcp/tools/relationship_create_test.ts`

- [ ] ツールが正しくRelationshipを作成することを検証
- [ ] 必須パラメータのバリデーション検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `relationshipCreateTool`を定義
- [ ] inputSchemaを定義（participants, perspectiveA, perspectiveB, summary）
- [ ] executeメソッドを実装

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub2 relationship_viewツール

@target: `src/mcp/tools/definitions/relationship_view.ts`（新規作成） @ref:
`src/mcp/tools/definitions/foreshadowing_view.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/mcp/tools/relationship_view_test.ts`

- [ ] 一覧表示の検証
- [ ] 個別表示の検証
- [ ] フィルタ機能の検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `relationshipViewTool`を定義
- [ ] 一覧/個別表示ロジック実装
- [ ] キャラクター/カテゴリフィルタ実装

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub3 relationship_graphツール

@target: `src/mcp/tools/definitions/relationship_graph.ts`（新規作成） @ref:
`src/cli/modules/view/timeline.ts`（Mermaid生成パターン）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/mcp/tools/relationship_graph_test.ts`

- [ ] Mermaid形式のグラフ生成検証
- [ ] エッジのスタイル（intensity, sentiment）反映検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `relationshipGraphTool`を定義
- [ ] Mermaidフローチャート生成ロジック実装
- [ ] ノード（キャラクター）とエッジ（関係性）の描画

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

---

### process5 CLIコマンド実装

#### sub1 element relationshipコマンド

@target: `src/cli/modules/element/relationship.ts`（新規作成） @ref:
`src/cli/modules/element/timeline.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/element_relationship_test.ts`

- [ ] コマンドが正しくRelationshipファイルを生成することを検証
- [ ] オプション（--participants, --type-a, --intensity-a等）の検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `ElementRelationshipCommand`クラスを作成
- [ ] コマンドオプションを定義
- [ ] ファイル生成ロジックを実装
- [ ] コマンドレジストリに登録

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub2 view relationshipコマンド

@target: `src/cli/modules/view/relationship.ts`（新規作成） @ref:
`src/cli/modules/view/timeline.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/cli/view_relationship_test.ts`

- [ ] --list表示の検証
- [ ] --id個別表示の検証
- [ ] --graph --format mermaid の検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `ViewRelationshipCommand`クラスを作成
- [ ] 一覧/個別表示ロジック実装
- [ ] Mermaidグラフ出力実装
- [ ] コマンドレジストリに登録

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

---

### process6 HTML可視化

#### sub1 HtmlGeneratorにRelationshipセクション追加

@target: `src/application/view/html_generator.ts` @ref:
`src/application/view/html_generator.ts`（既存のrenderForeshadowings）

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/application/html_relationship_test.ts`

- [ ] `renderRelationships()`がカード形式HTMLを生成することを検証
- [ ] `renderRelationshipGraph()`がMermaidコードを生成することを検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `renderRelationships()`メソッドを追加
  - 統計情報（Total, カテゴリ別）
  - カードグリッド（participants, perspectives, summary）
- [ ] `renderRelationshipGraph()`メソッドを追加
  - ノード生成（キャラクター）
  - エッジ生成（関係性）
  - スタイル適用（intensity→太さ、sentiment→色）
- [ ] `generateHtml()`にrelationshipsセクションを追加

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] `storyteller view browser`で実際にHTML表示を確認

---

### process7 LSP統合

#### sub1 関係性エンティティの検出対応

@target: `src/lsp/detection/positioned_detector.ts` @ref:
`src/lsp/detection/positioned_detector.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/relationship_detection_test.ts`

- [ ] 原稿内のRelationship参照（displayLabel,
      detectionHints）が検出されることを検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] Relationship検出ロジックを追加
- [ ] `detectionHints.commonPatterns`を使用したパターンマッチング

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

#### sub2 セマンティックトークン対応

@target: `src/lsp/providers/semantic_tokens_provider.ts` @ref:
`src/lsp/providers/semantic_tokens_provider.ts`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/lsp/relationship_semantic_tokens_test.ts`

- [ ] relationshipトークンタイプが正しく付与されることを検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `relationship`トークンタイプをlegendに追加
- [ ] Relationship検出時にトークンを付与

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認

---

### process8 サンプルプロジェクト更新

#### sub1 cinderellaサンプルにRelationship追加

@target: `samples/cinderella/src/relationships/`（新規ディレクトリ） @ref:
`samples/cinderella/src/characters/`, `samples/cinderella/src/foreshadowings/`

##### TDD Step 1: Red（失敗するテストを作成）

@test: `tests/samples/cinderella_relationships_test.ts`

- [ ] サンプルファイルが正しい型であることを検証

##### TDD Step 2: Green（テストを通過させる最小限の実装）

- [ ] `cinderella_prince.ts` - ロマンチックな関係
- [ ] `cinderella_stepmother.ts` - 対立関係
- [ ] `cinderella_fairy.ts` - 保護者関係

##### TDD Step 3: Refactor & Verify

- [ ] テストを実行し、通過することを確認
- [ ] `storyteller view browser`でサンプルが正しく表示されることを確認

---

### process10 ユニットテスト（追加・統合テスト）

- [ ] 全フェーズのテストをまとめて実行
- [ ] `deno test` で全テストが通過することを確認
- [ ] カバレッジ確認 `deno test --coverage`

### process50 フォローアップ

{{実装後に仕様変更などが発生した場合は、ここにProcessを追加する}}

### process100 リファクタリング

- [ ] 重複コードの抽出・共通化
- [ ] 命名の一貫性確認
- [ ] 不要なコメント・デッドコードの削除

### process200 ドキュメンテーション

- [ ] `docs/relationship.md` - Relationship機能の詳細ドキュメント作成
- [ ] `docs/mcp.md` - MCPツール・リソースのドキュメント更新
- [ ] `docs/cli.md` - CLIコマンドのドキュメント更新
- [ ] `docs/lsp.md` - LSP機能のドキュメント更新
- [ ] `CLAUDE.md` - 機能概要の追記
