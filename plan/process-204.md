# Process 204: migration ガイド執筆

## Overview
docs/migration/plot-rename.md を新規作成。コマンド使用例、対象ファイル、type 値マッピング subplot→sub

## Affected Files
docs/migration/plot-rename.md（新規）

## Implementation Notes
- 想定読者: 既存の storyteller プロジェクトを持つユーザー
- 手順: (1) git commit/stash で作業ツリーをクリーンに (2) storyteller migrate plot-rename --dry-run (3) 差分レビュー (4) --apply 実行 (5) ビルド・テスト確認 (6) 単一の "migration commit" を作成
- トラブルシュート: 不整合状態の解消方法、手動置換が必要なケース
- type 値マッピング表: subplot→sub, main/parallel/background は不変
- フィールド名マッピング表

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] migration コマンドの仕様を確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] docs/migration/plot-rename.md を新規作成
- [x] 想定読者・背景を明記
- [x] 5 ステップの手順を記載
- [x] type 値マッピング表を作成
- [x] フィールド名マッピング表を作成
- [x] トラブルシュート情報を追記

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] 用語・例の磨き
- [x] 完全性をチェック

✅ **Phase Complete**

---

## Dependencies
- Requires: 8
- Blocks: -
