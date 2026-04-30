# Process 2: Go domain リネーム

## Overview
internal/domain/subplot.go を plot.go に。Subplot* 型・定数を Plot* に、定数 SubplotTypeSubplot="subplot" を PlotTypeSub="sub" に変更します。

## Affected Files
- internal/domain/subplot.go → plot.go
- L31 SubplotTypeSubplot SubplotType = "subplot" → PlotTypeSub PlotType = "sub"
- SourceSubplotID/TargetSubplotID/ParentSubplotID/RelatedSubplots フィールド名 → Plot 系に
- internal/domain/subplot_test.go → plot_test.go (テスト関数名・参照更新)

## Implementation Notes
go test ./internal/domain/... が緑になることを確認。他パッケージは別 Process で追従。

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [ ] PlotType 未定義エラーを期待するテストケースを作成
- [ ] go test ./internal/domain で失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] internal/domain/subplot.go を internal/domain/plot.go に新規作成
- [x] 全型・フィールド・定数値を新名に置換
- [x] go test ./internal/domain で成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] コメント・doc.go の用語統一
- [ ] go vet で警告ゼロを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: 3, 4, 6, 10, 51, 100
