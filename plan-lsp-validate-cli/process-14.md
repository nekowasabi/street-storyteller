# Process 14: 既存5テスト回帰確認（後方互換性）

## Overview

Process 1-6 の実装変更が、tests/cli/lsp_validate_command_test.ts の既存 5
テスト（基本構造 / ヘルプ / エラー / 検証実行 / JSON
出力）を破壊していないことを確認する回帰テスト。

## Affected Files

- `tests/cli/lsp_validate_command_test.ts` の既存 5 テスト（変更しない）
- 併せて `tests/lsp/diagnostics/diagnostics_generator_test.ts`
  の既存テストも未破壊を確認

## Implementation Notes

- 既存テストの期待値は `diagnostics: unknown[]` 扱いなので型拡張に影響されない
- DiagnosticsGenerator.generate() の現行動作は detectAll()
  リファクタ後も不変である必要がある
- 既存テストの filter "validate" と "diagnostics_generator" で `deno test`
  を実行

## Red Phase

- [ ] 既存テストはもともと Green なので Red は対象外（回帰確認フェーズ） ✅
      Phase Complete

## Green Phase

- [ ] Process 1-6 完了後、既存5テストが引き続き全件 Green であることを確認
- [ ] deno test --filter で対象テスト実行 ✅ Phase Complete

## Refactor Phase

- [ ] 破壊があれば Process 1-6 へフィードバック ✅ Phase Complete

## Dependencies

- Requires: 1, 2, 3, 4, 5, 6
- Blocks: 50
