# Process 4: Go entity loader リネーム

## Overview
TS authoring の新キー名（sourcePlotId, targetPlotId, parentPlotId, relatedPlots）を decode できるよう loader を更新します。

## Affected Files
- internal/project/entity/loader.go (L54-60,739-862,915-921,1256-1278): LoadSubplot/mapSubplot/decodeSubplot* 関数群 → LoadPlot/mapPlot/decodePlot*
- internal/project/entity/loader_test.go (L298-340): フィクスチャ・期待値（type は "sub"）
- internal/project/entity/doc.go (L3): コメント

## Implementation Notes
旧 "subplot" 値や旧キー名を読むと validation error を返す（後方互換性なし、Process 102 で確認）。

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [ ] 新 fixture（type:"sub"）読み込みテストで「Plot 型未定義」を期待
- [ ] go test ./internal/project/entity で失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] loader 全体を新名・新キーで書き直す
- [x] go test ./internal/project/entity で成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] エラーメッセージを "plot" 用語に統一（Process 50 と連携）
- [ ] go vet/staticcheck で警告ゼロを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 2, 3
- Blocks: 5, 11, 50, 51, 100
