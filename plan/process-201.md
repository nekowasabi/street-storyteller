# Process 201: README.md 改訂

## Overview
README.md のコマンド表・Tool 一覧・URI 例・ディレクトリ構造図を新名に

## Affected Files
README.md (L23, L122, L147-148, L200-201, L217, L247, L295)

## Implementation Notes
- storyteller element subplot → plot
- storyteller://subplots → plots
- サンプル出力の subplot 言及を plot に

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] grep で "subplot" "Subplot" を検出して対象行を記録
- [x] 対象セクションを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] L23 のコマンド表を更新
- [x] L122 の Tool 一覧を更新
- [x] L147-148 の URI 例を更新
- [x] L200-201 のサンプル出力を更新
- [x] L217, L247, L295 の参照を更新
- [x] grep で "subplot" "Subplot" が許可リストのみになることを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] ドキュメント品質をチェック
- [x] フォーマットを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 1-9
- Blocks: -
