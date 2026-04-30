# Process 200: CLAUDE.md §8 改訂

## Overview
「Subplot機能」セクション全体を「Plot機能」へ書き換え

## Affected Files
CLAUDE.md (L56, L62-63, L635-705)

## Implementation Notes
- §8 タイトル: 「Subplot（サブプロット）機能」→「Plot（プロット）機能」
- 型例: Subplot → Plot, "subplot" → "sub"
- CLI 例: storyteller element subplot → storyteller element plot
- MCP Tools/Resources/Prompts 一覧: subplot_create → plot_create 等
- Timeline との比較表の Subplot 列を Plot に
- L56 と L62-63 の冒頭サマリ表記更新

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] grep で "subplot" "Subplot" を検出して現在の箇所を記録
- [x] 対象セクションを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] L56 と L62-63 の冒頭サマリを更新
- [x] L635-705 のセクション全体を新名で書き換え
- [x] 型例、CLI例を全て更新
- [x] MCP Tools/Resources/Prompts 一覧を更新
- [x] Timeline との比較表を更新
- [x] grep で "subplot" "Subplot" が許可リストのみになることを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] 用語の一貫性をチェック
- [x] ドキュメント品質を確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 1, 2, 3, 4, 5, 6, 7, 8, 9
- Blocks: -
