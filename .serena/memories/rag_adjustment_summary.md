# RAG統合計画の調整サマリー - 2025-12-29

## 調整内容

ユーザー要望に基づき、PLAN.mdおよび関連設計を以下のように調整した:

### 1. ワンコマンド化: `storyteller rag`

**変更前**:

- 個別サブコマンド: `storyteller rag export` → `digrag build`（2ステップ）

**変更後**:

- **メインコマンド: `storyteller rag`**（1ステップで完結）
  - ドキュメント生成 → インデックス構築を一括実行
  - オプションで個別実行も可能: `storyteller rag export`,
    `storyteller rag build`

**影響範囲**:

- PLAN.md: End State, CLI仕様セクション
- ドキュメント設計書: メインコマンド仕様追加
- Serena Memory: 更新完了

### 2. 専用フォーマット化（精度重視）

**変更前**:

- digrag互換の`* Title YYYY-MM-DD`形式（ChangelogEntry抽出対応）

**変更後**:

- **storyteller専用のセマンティック検索最適化形式**
  - digrag互換ではなく、検索精度を最大化
  - 関係性・メタデータを明示的に構造化

**影響範囲**:

- PLAN.md: Constraints, 開発のゴール
- ドキュメント設計書: ドキュメントテンプレート仕様
- Serena Memory: 形式の説明更新

## PLAN.md変更箇所

1. **End State** (L21-26)
   - ワンコマンド化を明示
   - サブコマンド併用オプションを追加

2. **Constraints** (L40-42)
   - digrag互換形式を専用形式に変更
   - セマンティック検索最適化を強調

3. **開発のゴール** (L78)
   - 「digrag互換」を「専用の精度重視」に修正

4. **Appendix E: CLIコマンド仕様** (L1979-2002)
   - メインコマンド仕様を追加
   - サブコマンドは補助的位置づけに変更

## 次のステップ

1. **ドキュメントテンプレート仕様**の更新（PLAN_RAG_UNIFIED.md,
   PLAN_RAG_INTEGRATION.md）
   - 新しい専用フォーマット仕様を定義
   - digragとの互換性についての明確化

2. **CLIコマンド実装仕様**の詳細設計
   - メインコマンドのロジック（エクスポート→ビルド自動連携）
   - サブコマンドの位置づけ（互換性・高度な制御用）

3. **テスト戦略**の調整
   - ワンコマンド統合テスト追加
   - 形式バリデーションテスト更新

## 設計マトリクス

| 項目             | 変更前                                | 変更後                              |
| ---------------- | ------------------------------------- | ----------------------------------- |
| メインコマンド   | storyteller rag export/update（個別） | **storyteller rag**（統合）         |
| ドキュメント形式 | digrag互換（ChangelogEntry）          | **storyteller専用（検索精度重視）** |
| ドキュメント格納 | .rag-docs/                            | .rag-docs/（同じ）                  |
| インデックス構築 | digrag build（別途）                  | 統合自動実行                        |
| サブコマンド     | メイン                                | 補助（互換性用）                    |

## Serena Memory更新状況

- ✅ rag_integration_design.md: 更新完了
- ✅ rag_chunking_strategy.md: 参照のみ（変更なし）
- ✅ 新規メモリ: rag_adjustment_summary.md（本ファイル）
