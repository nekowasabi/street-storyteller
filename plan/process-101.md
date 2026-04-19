# Process 101: パフォーマンステスト

**Quality Assurance** | N=101

## Overview

subplot 機能のパフォーマンス計測。100 subplot/1000 beat/100 intersection 規模での validate/view/MCP query 速度を確認。

## Affected

- 新規: `tests/performance/subplot_perf_test.ts`
- 計測対象:
  - validate (参照整合性 + 構造完全性)
  - view subplot --list
  - MCP subplot_view (action=list)
  - HTML graph render (vis-network)

## Implementation Notes

### Performance Scale

- **100 subplot** with ~10 beats each (total: 1,000 beats)
- **100 intersections** (distributed across subplot pairs)
- Performance targets:
  - validate: **1 second** (max)
  - view --list: **500ms** (max)
  - MCP query: **500ms** (max)
  - HTML graph render: establish baseline (ボトルネック確認)

### Measurement Strategy

- Deno `Deno.bench` API を使用 (Deno v2.x 標準)
- Wall-clock time で計測 (CPU 時間ではなく実時間)
- 複数回実行して平均・分散を記録
- メモリ使用量も記録（参考値）

## TDD: Red Phase

```typescript
// tests/performance/subplot_perf_test.ts

Deno.bench("validate: 100 subplots with 1000 beats completes within 1s", async () => {
  // Setup: 100 subplot + 1000 beats のテスト用プロジェクト生成
  // Measure: validate() 実行時間
  // Assert: duration < 1000ms
});

Deno.bench("view subplot --list: 100 subplots completes within 500ms", async () => {
  // Measure: view subplot --list 実行時間
  // Assert: duration < 500ms
});

Deno.bench("MCP subplot_view (action=list): 100 subplots completes within 500ms", async () => {
  // Setup: MCP サーバー起動
  // Measure: subplot_view tool call (action=list) 実行時間
  // Assert: duration < 500ms
});

Deno.bench("preconditionBeatIds cycle detection: linear scaling with beat count", async () => {
  // Setup: 500, 1000, 1500, 2000 beats で実行
  // Measure: 各スケールでの実行時間
  // Assert: 線形増加を確認 (O(n) に収まっているか)
});

Deno.bench("HTML graph render: vis-network initialization time", async () => {
  // Setup: 100 subplot + 100 intersection のグラフを構築
  // Measure: vis-network ノード/エッジ生成時間
  // Assert: baseline 記録 (目標なし、ボトルネック特定用)
});
```

## TDD: Green Phase

### Implementation Checklist

- [ ] `tests/performance/subplot_perf_test.ts` 実装
- [ ] テスト用プロジェクト生成ヘルパー (100 subplot/1000 beat)
- [ ] Deno.bench ラッパー関数 (時間測定、統計出力)
- [ ] メモリプロファイリング (簡易版)
- [ ] 全ベンチマーク実行

### Verification

```bash
deno bench tests/performance/subplot_perf_test.ts
# Expected: all benchmarks complete
# Output: execution time summary
```

### Performance Baseline

計測結果を `docs/performance-baseline.md` に記録：

```markdown
# Subplot Performance Baseline

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| validate (100 subplots) | < 1s | XXXms | ✓ |
| view --list | < 500ms | XXXms | ✓ |
| MCP query | < 500ms | XXXms | ✓ |
| HTML graph render | baseline | XXXms | - |
```

## TDD: Refactor Phase

- ベンチマークコードの最適化 (測定ノイズ削減)
- メモリリーク検出 (Deno --allow-env でプロファイラ統合)
- 複数実行での統計安定性確認
- CI/CD での定期ベンチマーク設定提案

## Requires

- Process 59: Subplot validate/view CLI コマンド実装完了

## Blocks

- Process 300: OODA 振り返り (パフォーマンス結果の振り返り)
