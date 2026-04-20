# Process 4: validate.ts に --dir/--recursive 引数と走査ロジック追加

## Overview
`src/cli/modules/lsp/validate.ts` に `--dir <path>` と `--recursive` の引数を追加し、ディレクトリ配下の .md ファイルを走査して検証する機能を実装する。位置引数（単一ファイル）と `--dir` は排他。listMarkdownFiles（Process 1 で作成）を利用。

## Affected Files
- @modify `src/cli/modules/lsp/validate.ts`
  - LSP_VALIDATE_OPTIONS に `--dir` (type: string) と `--recursive` (type: boolean) を追加
  - handle() 内で `args.dir` が指定されていれば listMarkdownFiles を呼び出し複数ファイル検証ループ
  - 単一ファイル検証ロジック（現状 L71-128）を切り出して再利用
  - 位置引数と --dir の同時指定は err() で拒否（code: "mutually_exclusive_args"）
- @modify import: `import { listMarkdownFiles } from "@storyteller/lsp/utils/markdown_files.ts"`

## Implementation Notes
- 位置引数 / --file が指定されている場合は現行動作を維持
- --dir 指定時は ValidationResult を配列で返却（各ファイルごとに filePath + diagnostics）
- --recursive: false 時は直下のみ走査
- エラーハンドリング: --dir のディレクトリが存在しない場合は err(code: "dir_not_found")
- confidence / entityId のフィールド埋め込みは本 Process で完結させる（DiagnosticOutput に PositionedMatch.confidence と PositionedMatch.entityId をマッピング）

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] Process 10 で詳細テスト作成（本 Process は実装準備）
- [ ] --dir 引数を現状 validate.ts に渡すと未認識エラーになることを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] --dir / --recursive オプション定義追加
- [ ] 単一ファイル検証ロジックを private メソッド validateFile() に切り出し
- [ ] --dir 時: listMarkdownFiles → 各ファイルを validateFile() でループ
- [ ] DiagnosticOutput に confidence / entityId をマッピング（PositionedMatch 経由）
- [ ] Process 10 テストが Green になることを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] validateFile() と validateDir() の責務分離
- [ ] エラーメッセージの一貫性確認
- [ ] deno fmt / deno lint
- [ ] 既存5テスト + 新規テスト全件パス

✅ **Phase Complete**

---

## Dependencies
- Requires: 1, 3
- Blocks: 5, 10
