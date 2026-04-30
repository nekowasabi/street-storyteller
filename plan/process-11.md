# Process 11: loader plot 互換テスト

## Overview
TS 表記 type:"sub" を読めること、旧 type:"subplot" を読むと validation error を返すこと、samples/cinderella の実 fixture を含む統合テスト。

## Affected Files
- `internal/project/entity/loader_test.go`

## Implementation Notes
- samples/cinderella/src/plots/*.ts を fixture として活用（Process 7 完了後）
- 旧 fixture は明示的に「拒否される」テストとして残す
- sourcePlotId/targetPlotId/parentPlotId/relatedPlots の TS キー名解決を網羅

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] 旧キー名 sourceSubplotId を含む fixture 読み込みテストケースを作成
- [x] テストを実行して validation error が期待通り返されることを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] loader が新キー名 (sourcePlotId, targetPlotId, parentPlotId, relatedPlots) のみ受理する実装
- [x] samples/cinderella の実 fixture を用いた統合テスト追加
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] エラーメッセージの明瞭化
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 4
- Blocks: 102
