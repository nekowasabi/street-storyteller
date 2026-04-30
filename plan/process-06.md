# Process 6: MCP tools リネーム

## Overview
subplot_create/subplot_view → plot_create/plot_view、beat_create/intersection_create の JSON keys（subplot_id→plot_id, source_subplot→source_plot 等）、resources URI（storyteller://plots）を変更します。

## Affected Files
- internal/mcp/tools/subplot_create.go → plot_create.go: SubplotCreateTool→PlotCreateTool, Tool name "subplot_create"→"plot_create", enum
- internal/mcp/tools/subplot_view.go → plot_view.go: 同様
- internal/mcp/tools/subplot_create_test.go, subplot_view_test.go: リネーム
- internal/mcp/tools/element_create.go (L19,39-40,61): "subplot":true→"plot", enum・description
- internal/mcp/tools/element_create_test.go (L136-145): kind 値
- internal/mcp/tools/intersection_create.go (L12-95): source_subplot/target_subplot→source_plot/target_plot, SourceSubplot/TargetSubplot→Plot, id format ix_
- internal/mcp/tools/intersection_create_test.go (L23-94): JSON ペイロード
- internal/mcp/tools/beat_create.go (L12-77): subplot_id→plot_id, SubplotID→PlotID
- internal/mcp/tools/beat_create_test.go (L23-90): JSON ペイロード
- internal/mcp/resources/resources.go (L17): storyteller://subplots → plots
- internal/cli/modules/mcp/mcp.go (L79-81): コメント・ツール登録

## Implementation Notes
tool name の互換性なし。Resource URI も非互換（ユーザーは新 URI に切替）。

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [ ] plot_create ツール呼び出しテストを期待
- [ ] go test ./internal/mcp/tools で失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] tool 全部リネーム＋JSON 構造体タグ更新
- [x] go test ./internal/mcp で成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] -
- [ ] go vet で警告ゼロを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 2, 3
- Blocks: 13, 51, 100
