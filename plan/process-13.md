# Process 13: MCP tools E2E 名寄せ

## Overview
plot_create/plot_view/beat_create/intersection_create/element_create の引数スキーマ・出力テキスト・JSON keys が新名であることを E2E 確認。

## Affected Files
- `internal/mcp/tools/*_test.go`

## Implementation Notes
- tools/list で plot_create/plot_view が露出することを確認
- subplot_create/subplot_view が露出しないことも確認（旧名遮断）
- source_plot/target_plot/plot_id JSON key が正しく解決されること

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] plot_create スキーマ取得テストケースを作成
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] plot_create/plot_view スキーマ検証実装
- [x] subplot_create/subplot_view が tools/list から除外されることを確認
- [x] JSON key の新名解決（source_plot, target_plot, plot_id）実装
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] テストメッセージの明瞭化
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 6
- Blocks: -
