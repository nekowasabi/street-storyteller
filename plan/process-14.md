# Process 14: migrate dry-run/実行テスト

## Overview
migrate plot-rename の dry-run（差分のみ表示）と本番実行（ファイル移動・置換）を fixture プロジェクトで検証。git 未クリーン時は実行を拒否。

## Affected Files
- `internal/cli/modules/migrate/migrate_test.go`

## Implementation Notes
- testdata/migrate/sample-project/ に subplots/ を持つ fixture を用意
- dry-run 出力に「subplots/ → plots/ にリネーム」「N 個のファイルを更新」と表示されること
- --apply 実行後、ファイルシステム変更を確認
- git 未クリーン時は exit code 非ゼロ＋メッセージ「Please commit or stash changes before migration」
- 不整合状態（plots/ と subplots/ 共存）は検出してエラー

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] 各シナリオ（dry-run, 本番実行, git 未クリーン, 不整合状態）のテストケースを失敗状態で作成
- [x] テストを実行して期待通り失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] migrate plot-rename dry-run 実装
- [x] --apply での実行・ファイル移動・置換実装
- [x] git 状態チェック実装
- [x] 不整合状態検出実装
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] fixture 構造の整理
- [x] エラーメッセージの明瞭化
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 8
- Blocks: -
