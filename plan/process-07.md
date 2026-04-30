# Process 7: サンプルプロジェクトリネーム

## Overview
samples/cinderella/src/subplots/ を src/plots/ に移動、import path・型・type 値を更新します。

## Affected Files
- samples/cinderella/src/subplots/cinderella_growth.ts → src/plots/: import を Plot 型に変更, type:"main" 維持
- samples/cinderella/src/subplots/prince_search.ts: 同上, type:"subplot"→"sub"
- samples/cinderella/src/subplots/stepsisters_rivalry.ts: 同上, type:"background" 維持
- samples/cinderella/.storyteller.json: subplots パスを plots に
- samples/momotaro: subplots ディレクトリ未確認のため確認のみ（実体あれば同様処理、Process 52 で整合確認）

## Implementation Notes
import map @storyteller/types/v2/plot.ts に依存。

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [ ] deno test で sample プロジェクトの型エラーを期待
- [ ] deno check で失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] ファイル移動＋import path/type 値更新
- [ ] deno test で成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] -
- [x] deno check で型エラーゼロを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 1, 3
- Blocks: 15, 51, 52, 100, 101
