# Process 3: DiagnosticOutput 型拡張 (confidence/entityId)

## Overview
`src/cli/modules/lsp/validate.ts` 内の `DiagnosticOutput` 型に `confidence?: number` と `entityId?: string` を optional 追加。既存 5 テストは `value.diagnostics: unknown[]` として扱っているため後方互換性を維持。

## Affected Files
- @modify `src/cli/modules/lsp/validate.ts`
  - `DiagnosticOutput` 型定義（現状: line, character, endCharacter, severity, message, source, code?）
  - 追加: `readonly confidence?: number` / `readonly entityId?: string`
  - フィールド埋め込みは Process 4-5 で実装（本 Process は型だけ）
- @modify `tests/cli/lsp_validate_command_test.ts`
  - 既存5テストは変更しない（型変更のみで動作変化なし）

## Implementation Notes
- 型定義は validate.ts の上部にある DiagnosticOutput を直接変更
- PositionedMatch から confidence / entityId を取り出すロジックは Process 4-5 の責務
- Process 4-5 の実装で信頼度判定に使うため、この Process では型の器だけ用意

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] Process 11 で実施するため、本 Process では型定義のみで Red を起こさない
- [ ] （注）TDD サイクル本体は Process 11 に記載、本 Process は型変更の準備

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] DiagnosticOutput に confidence?: number / entityId?: string 追加
- [ ] deno check でコンパイル成功確認
- [ ] 既存テスト全件パス確認（後方互換）

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] JSDoc コメント追加
- [ ] deno fmt
- [ ] 既存5テスト継続成功

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: 4, 5, 6
