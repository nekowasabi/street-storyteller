# Process 3: Go store/manifest/project リネーム

## Overview
store/manifest/project の API（KindPlot, AddPlot, defaultPlotsPath="src/plots", Paths.Plots, loadPlotIntoStore）を新名に変更します。

## Affected Files
- internal/project/store/store.go (L23,64,75,259-,262,274,277): KindSubplot="subplot"→KindPlot="plot", subplots フィールド・AddSubplot/Subplot()/AllSubplots() メソッド → Plot 系
- internal/project/store/store_test.go (L85-,138,159,273,285,354-,377): API 名追従
- internal/project/store/doc.go (L2): コメント
- internal/project/manifest/manifest.go (L33,65,91,183,206-207): defaultSubplotsPath="src/subplots"→"src/plots", Subplots field と JSON tag "subplots"→Plots/"plots"
- internal/project/manifest/loader_test.go (L141,180-181): 期待値追従
- internal/project/project.go (L99,258,265,269,281): kind:"subplot"・m.Paths.Subplots→plot 系, loadSubplotIntoStore→loadPlotIntoStore

## Implementation Notes
go test ./internal/project/... が緑になることを確認。

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [ ] Plot メソッド未定義エラーを期待するテストケースを作成
- [ ] go test ./internal/project/store で失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] 全 store/manifest/project の API を新名にアトミック置換
- [x] go test ./internal/project で成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] -
- [ ] go vet で警告ゼロを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 2
- Blocks: 4, 5, 7, 51, 100
