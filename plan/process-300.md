# Process 300: OODA 振り返りと Phase 2+ 計画

**Project Retrospective** | N=300

## Overview

Phase 1 全体の振り返り。Observe → Orient → Decide → Act サイクルでの教訓抽出と Phase 2+ の計画を立案する。

## Affected

- 新規: `docs/postmortem/subplot-phase1.md`
- 修正: `CLAUDE.md` の「進行中の機能開発」セクション

## Implementation Notes

### OODA サイクル構成

---

## Observe: Phase 1 全体の実装ログ収集

### Checklist

- [ ] 完了した全 34 Process (1-101, 200-202) の実装ログを収集
  - 各 Process の最終コミット SHAを記録
  - 各 Process で変更されたファイル数を集計
  - 各 Process の実装行数（追加・修正）を計測

- [ ] 工数記録の集約
  - 見積もり工数 vs 実績工数を比較
  - 遅延した Process の原因分析
  - 予想外に早く完了した Process の理由確認

- [ ] 品質メトリクス
  - テスト覆率 (target: 85% 以上達成したか)
  - 回帰テスト (Process 100) の合格率
  - パフォーマンステスト (Process 101) の目標達成率

- [ ] バグ・想定外問題の集約
  - Foreshadowing コピー時の発生問題
  - Grill モード 6 決定での解釈相違
  - validate オプショナル動作の想定外使用例
  - HTML graph render ボトルネック
  - MCP tool/resource スキーマ変更による互換性問題

### Output Template

```markdown
## Phase 1 実装ログ

| Process | Files Changed | Lines Added | Estimated Hours | Actual Hours | Status |
|---------|---------------|------------|-----------------|--------------|--------|
| 1-59 | X | +YYYY | 40 | 45 | ✓ |
| 100 | Y | +ZZZZ | 6 | 7 | ✓ |
| ... | | | | | |
| **Total** | | | | | |

## 発生したバグ・課題

| 項目 | Process | 説明 | 対応 |
|------|---------|------|------|
| Foreshadowing循環参照 | 18 | preconditionBeatIds の... | ... |
| ... | | | |
```

---

## Orient: 観察結果のパターン分析

### Checklist

- [ ] **Foreshadowing コピー戦略の有効性評価**
  - Foreshadowing.ts → Subplot.ts への型拡張パターンが、実装効率を何倍にしたか測定
  - コード重複率を計測（再利用されたコード比率）
  - Foreshadowing との相違点（新規実装が必要だった部分）をリスト化

- [ ] **Grill モード 6 決定の現場通用度評価**
  1. "Intersection は beat 単位で参照"
     - 実装中に矛盾が発生したか？
     - ユーザーが複数 beat を同時に参照したいというシナリオが出たか？
  2. "PlotIntersection.type = 'intersection' 固定"
     - 実装後、「merge」「confluence」などの種類分けが必要になったか？
     - 将来の拡張性を損なったか？
  3. その他 4 決定の実装現場での通用度

- [ ] **validate の完全オプショナル動作の利用率**
  - 実装後、「subplot がないプロジェクトでも検証が成功」というコンセプトが活躍したか？
  - ユーザーフィードバック（想定される）での「意外な使い方」を列挙

- [ ] **技術的な学習・改善**
  - Deno LSP との連携での工夫
  - TypeScript 型システムの活用度
  - テスト駆動開発 (TDD) 実践での感想・改善点

### Output Template

```markdown
## 観察結果の分析

### Foreshadowing コピー戦略の有効性

- 再利用率: X%
- 新規実装必要部分:
  - PlotBeat 固有の構造
  - Intersection の複雑さ
  - Graph 可視化ロジック

### Grill モード 6 決定の検証

| 決定 | 現場通用度 | 問題検出 | 振り返り |
|------|-----------|--------|---------|
| Intersection = beat単位 | 高 | なし | 妥当 |
| type='intersection'固定 | 中高 | 将来拡張性の提案 | Phase 2 候補 |
| ... | | | |

### validate オプショナル動作の活用

- 実装シナリオ: 古いプロジェクト(subplot なし) で "No subplots found" 情報表示
- 利用者利便性: 高（新機能の導入敷居が低い）
```

---

## Decide: Phase 2+ で着手すべき項目の優先順位

### Checklist

- [ ] **LSP 統合** (実装予定に含まれていなかった)
  - 原稿執筆中に subplot beat 参照をリアルタイム検出する価値があるか？
  - `storyteller lsp validate` で subplot 参照チェック機能の必要性を判断
  - ユーザー需要次第で Phase 2 に昇格

- [ ] **時系列矛盾検出** (実装予定に含まれていなかった)
  - Timeline のイベント順序と Subplot の beat 順序が矛盾していないか確認する機能
  - validate に時系列チェックを追加する価値を評価
  - Phase 2+ のスコープ判断

- [ ] **PlotIntersection.type 拡張** (Grill決定 #2 の延期項目)
  - `type: "intersection" | "merge" | "confluence"` への拡張
  - 各タイプの意味定義
  - Phase 2 として議案化

- [ ] **Subplot ライフサイクル** (新規提案)
  - status フィールド拡張: `"planning" | "draft" | "active" | "paused" | "archived"`
  - 執筆進度に応じた subplot 管理
  - Phase 2 候補

- [ ] **サブプロットマイグレーション** (Timeline→Subplot 相互変換)
  - 既存 Timeline scope=arc → Subplot への自動変換コマンド
  - Phase 2+ での実装検討

- [ ] **HTML graph 拡張**
  - インタラクティブな beat 編集UI
  - intersection フィルタリング UI
  - Phase 2+ の UX 向上候補

### Priority Matrix

```markdown
## Phase 2+ 優先度マトリクス

| 項目 | 優先度 | 工数 | ユーザー需要 | 技術難度 | Phase決定 |
|------|--------|------|-----------|---------|----------|
| LSP統合 | High | M | 未確認 | M | 2 |
| 時系列矛盾検出 | Medium | M | 未確認 | M | 2+ |
| type拡張 | Medium | S | Grill決定#2 | S | 2 |
| ライフサイクル | Low | M | 未確認 | M | 3+ |
| マイグレーション | Low | L | なし | L | 3+ |
| グラフ拡張 | Low | L | UX向上 | H | 3+ |
```

---

## Act: Phase 2 Issue 起票・CLAUDE.md 更新

### Checklist

- [ ] **docs/postmortem/subplot-phase1.md 作成**
  - Observe セクション全文
  - Orient セクション全文
  - Decide セクション全文
  - 学習教訓・推奨事項

- [ ] **GitHub Issue テンプレート** (Phase 2 候補)
  - "Process 201: LSP Subplot Reference Detection"
  - "Process 202: Timeline-Subplot Conflict Detection"
  - "Process 203: PlotIntersection.type Expansion"
  - 各 Issue: title, description, acceptance criteria, estimate
  - ラベル: `phase-2`, `enhancement`, `research`

- [ ] **CLAUDE.md の「進行中の機能開発」セクション更新**
  - Subplot 完成を「実装済み」に変更
  - 「### 10. Subplot (サブプロット)管理 - 実装済み」セクション追加
  - Phase 2 候補を「進行中」セクションに追記

- [ ] **PLAN.md 更新**
  - Process 100-202 の完了を反映
  - Phase 2 計画を反映

### Issue Templates

```markdown
## Template: Process 201 - LSP Subplot Reference Detection

**Title**: LSP: Real-time subplot beat reference detection in manuscripts

**Description**:
Extend storyteller LSP to detect subplot beat references in manuscript text
(similar to character/setting detection).

**Acceptance Criteria**:
- [ ] Detects beat references in `@beat:{id}` format
- [ ] Provides hover information for beat details
- [ ] Offers code action for low-confidence beat references
- [ ] Performance: < 500ms for 100 beat project

**Estimate**: 8-12 hours (Phase 2)

**Dependencies**: Requires subprocess LSP infrastructure (if not completed in Phase 1)
```

### CLAUDE.md Update Section

```markdown
### 10. Subplot(サブプロット)管理機能 - 実装済み

複数の物語ラインを並列管理し、その交点を通じて物語の深さを表現する機能が実装されました。

#### 主な機能

- **複数物語ライン**: main/subplot/parallel/background の4タイプ
- **Beat構造**: 各subplot は複数のplot beat (setup/rising/climax/falling/resolution) で構成
- **交点（Intersection）**: 複数subplot 間の関連性を表現
- **参照整合性検証**: beat/subplot 参照の妥当性を自動チェック
- **HTML可視化**: vis-network によるグラフ表示

[詳細は docs/subplot.md を参照]
```

## Validation Checklist

- [ ] docs/postmortem/subplot-phase1.md の行数確認（目安300-400行）
- [ ] GitHub Issue テンプレートの整形確認
- [ ] CLAUDE.md の更新が既存セクションと矛盾していないか確認
- [ ] PLAN.md との整合性確認

## Requires

- Process 100: 後方互換性検証完了
- Process 101: パフォーマンステスト完了
- Process 200: CLAUDE.md 更新完了
- Process 201: docs/subplot.md 作成完了
- Process 202: cinderella サンプル追加完了

## Blocks

- Process 301 以降 (Phase 2 スコープ決定後に起票)

---

## Output Files

1. **docs/postmortem/subplot-phase1.md** (~350 行)
   - Phase 1 全体の振り返り
   - Observe/Orient/Decide/Act の詳細記録
   - 学習教訓と推奨事項

2. **GitHub Issues** (Phase 2 候補、起票は不要、テンプレート参照用)
   - LSP 統合
   - 時系列矛盾検出
   - PlotIntersection.type 拡張
   - Subplot ライフサイクル
   - マイグレーション機能

3. **CLAUDE.md の変更**
   - ### 10. Subplot セクション追加
   - 「### 4. 実装フェーズ」更新（Phase 5 完了に更新）
   - アクティブな仕様の Subplot 説明更新

4. **PLAN.md の更新**
   - Process 1-202 完了を反映
   - Phase 2 計画を反映（詳細スコープは後決定）
