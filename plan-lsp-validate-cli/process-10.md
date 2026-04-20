# Process 10: Test --dir --recursive 複数 .md 走査

## Overview

tests/cli/lsp_validate_command_test.ts に TDD Red テストを追加。複数 .md
を含む一時ディレクトリを作成し、`--dir` + `--recursive`
で走査が機能することを検証する。

## Affected Files

- @modify `tests/cli/lsp_validate_command_test.ts`
  - 新規 Deno.test: "validate runs --dir --recursive on multiple .md files"

## Implementation Notes

- tempDir を作成し、`a.md`, `subdir/b.md`, `subdir/c.md` に Low confidence
  な参照文字列を書き込む
- LspValidateCommand({ loadEntities: スタブ }) で実行
- 期待値: result.ok === true、diagnostics を含む ValidationResult が3ファイル分
- 現状 --dir 未実装なので Red になる

## Red Phase

- [ ] テスト追加 → deno test filter "dir --recursive" で失敗確認 ✅ Phase
      Complete

## Green Phase

- [ ] Process 4 実装完了後に本テストが Green になることを確認 ✅ Phase Complete

## Refactor Phase

- [ ] fixture ヘルパー共通化検討 ✅ Phase Complete

## Dependencies

- Requires: 4
- Blocks: 50
