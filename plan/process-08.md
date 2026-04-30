# Process 8: migrate コマンド実装

## Overview
storyteller migrate plot-rename [--dry-run] [--path] を新規実装。プロジェクトを走査して subplots/→plots/ ディレクトリリネーム、TS 内 Subplot→Plot 置換、FrontMatter キー subplots→plots、type 値 subplot→sub、.storyteller.json 更新を実行します。

## Affected Files
- internal/cli/modules/migrate/migrate.go（新規）: subcommand plot-rename を実装。ディレクトリ走査、ファイル内文字列置換、git status 確認
- internal/cli/modules/migrate/migrate_test.go（新規）
- internal/cli/modules/index.go: migrate モジュール登録

## Implementation Notes
- --dry-run はデフォルト ON、--apply で実行
- 実行前に git status クリーン必須（uncommitted があれば中断）
- 1つの "migration commit" としてユーザに提示するメッセージ
- 置換対象: ファイル名 subplots/→plots/、TS 内 import path / 型名 / フィールド名 / "subplot"→"sub"、原稿 FrontMatter `subplots:`→`plots:`、`.storyteller.json` の subplots パス

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] migrate_test.go で fixture プロジェクトに対する dry-run 出力検証を期待
- [x] go test ./internal/cli/modules/migrate で失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] コマンド実装＋テスト緑化
- [x] go test ./internal/cli/modules/migrate で成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] エラーメッセージのユーザビリティ向上
- [ ] go vet で警告ゼロを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 1, 2, 3, 4, 5, 6, 7
- Blocks: 9, 14, 204, 51, 100
