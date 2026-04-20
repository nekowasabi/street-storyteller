# Process 12: Test --strict で Low 検出時 exit error

## Overview
`--strict` 指定時、Low confidence 参照があれば err() 返却されることを検証する TDD Red テスト。

## Affected Files
- @modify `tests/cli/lsp_validate_command_test.ts`
  - 新規 Deno.test: "validate --strict returns err when low confidence references exist"
  - 新規 Deno.test: "validate without --strict returns ok even with low confidence"

## Implementation Notes
- Low confidence 参照を含む fixture を用意
- `args: {file, strict: true}` → result.ok === false, result.error.code === "validation_errors"
- `args: {file}` (strict なし) → result.ok === true (Low があっても成功)

## Red Phase
- [ ] テスト追加 → --strict 未実装なので Red
✅ Phase Complete

## Green Phase
- [ ] Process 6 実装後に Green
✅ Phase Complete

## Refactor Phase
- [ ] エラーメッセージ期待値のアサーション洗練
✅ Phase Complete

## Dependencies
- Requires: 6
- Blocks: 50
