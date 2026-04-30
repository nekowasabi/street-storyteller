# Process 300: 全体検証 OODA

## Overview
全 Process 完了後の最終検証＋リリース準備

## Affected Files
CHANGELOG.md, リリースノート

## Implementation Notes
- Observe: grep -RIn "subplot\|Subplot" 残骸チェック（許可リスト以外でゼロ）
- Orient: samples/cinderella と samples/momotaro で migration をリアル実行 → ビルド → meta check 緑
- Decide: 破壊的変更告知のリリースノート作成方針確定
- Act: CHANGELOG.md 追記、リリースノート執筆、git tag 準備
- Loop: 検出された問題があれば該当 Process に戻す

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] grep -RIn "subplot\|Subplot" で残骸をチェック

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] samples/cinderella と samples/momotaro で migration をリアル実行
- [x] ビルドが成功することを確認
- [x] meta check が緑になることを確認
- [x] CHANGELOG.md を追記
- [x] リリースノートを執筆
- [x] git tag を準備

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] リリースノート品質をチェック
- [x] 最終検証の実施

✅ **Phase Complete**

---

## Dependencies
- Requires: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 50, 51, 52, 100, 101, 102, 200, 201, 202, 203, 204
- Blocks: -
