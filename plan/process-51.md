# Process 51: 旧名残骸 CI チェック

## Overview
scripts/check-no-subplot.sh を新規作成（任意）または CI YAML で grep チェックを追加。許可リスト（リリースノート・migration ガイド・歴史 .serena/memories）以外で "subplot|Subplot" を禁止。

## Affected Files
- `scripts/check-no-subplot.sh` (新規)
- `.github/workflows/ci.yml` (既存があれば追加)

## Implementation Notes
- 許可リストファイル: docs/migration/plot-rename.md, CHANGELOG.md, .serena/memories/*.md
- 検出時に exit 1
- CI に組込

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] subplot 残骸を持つコミットで検出テストを実行
- [x] スクリプトが exit 1 で失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] scripts/check-no-subplot.sh 実装
- [x] CI に組込
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] 許可リスト設定の整理
- [x] エラーメッセージの明瞭化
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 1, 2, 3, 4, 5, 6, 7
- Blocks: -
