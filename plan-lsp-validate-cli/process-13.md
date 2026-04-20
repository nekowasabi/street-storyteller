# Process 13: Test High/Medium/Low サマリー出力

## Overview

Human-readable 出力と JSON 出力の双方で High/Medium/Low confidence
件数集計が正しく出ることを検証する TDD Red テスト。

## Affected Files

- @modify `tests/cli/lsp_validate_command_test.ts`
  - 新規 Deno.test: "validate emits High/Medium/Low summary in human output"
  - 新規 Deno.test: "validate --json includes summary field"

## Implementation Notes

- fixture: confidence 0.95 (High), 0.8 (Medium), 0.6 (Low) の 3 参照を含む
- Human: messages.info に "High: 1" "Medium: 1" "Low: 1" が出現
- JSON: `parsed.summary === { high: 1, medium: 1, low: 1, total: 3 }`
- 現状は High カテゴリ自体が suppress されているので Red

## Red Phase

- [ ] テスト追加 → Red ✅ Phase Complete

## Green Phase

- [ ] Process 5 実装後に Green ✅ Phase Complete

## Refactor Phase

- [ ] 出力フォーマットの視認性改善確認 ✅ Phase Complete

## Dependencies

- Requires: 5
- Blocks: 50
