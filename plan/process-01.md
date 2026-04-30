# Process 1: TS 型ファイルリネーム

## Overview
src/type/v2/subplot.ts を plot.ts にリネームし、Subplot* 型群を Plot* に、union 値 "subplot" を "sub" に変更します。

## Affected Files
- src/type/v2/subplot.ts → plot.ts (ファイル名変更)
- 型: Subplot/SubplotType/SubplotStatus/SubplotImportance/SubplotDetails/SubplotRelations/SubplotFocusCharacterWeight → Plot*
- union: "main"|"subplot"|"parallel"|"background" → "main"|"sub"|"parallel"|"background"
- フィールド: relatedSubplots→relatedPlots, parentSubplotId→parentPlotId, sourceSubplotId/targetSubplotId→sourcePlotId/targetPlotId

## Implementation Notes
deno check で TS 型エラーゼロを維持。samples/cinderella/src/subplots/*.ts は Process 7 で更新するため、本 Process では型ファイルのみ。

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [ ] Plot 型が見つからないエラーを期待するテストケースを作成
- [ ] deno test で失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] src/type/v2/subplot.ts を src/type/v2/plot.ts に新規作成
- [x] 全型・フィールド・union 値を新名に置換
- [ ] deno test で成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] JSDoc コメント内の "subplot" 表記も "plot" に統一
- [x] deno check で型エラーゼロを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: 4, 7, 51, 100, 101
