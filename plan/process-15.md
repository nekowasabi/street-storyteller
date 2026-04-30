# Process 15: サンプル統合テスト

## Overview
samples/cinderella で storyteller meta check / view list --kind plots が成功することを確認。

## Affected Files
- `internal/cli/modules/process04_workflow_test.go` (拡張)

## Implementation Notes
- process04_workflow_test の subplot ケースを plot ケースに置換
- "src/subplots" → "src/plots" 期待値
- meta check の出力に Plot 一覧が出ることを確認

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] 既存 subplot ケースで失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] plot ケースに置換
- [x] meta check の出力期待値を更新
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] テストメッセージの明瞭化
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 5, 7
- Blocks: -
