# Process 5: validate.ts に High/Medium/Low サマリー集計を追加

## Overview

validate.ts の Human-readable 出力（`displayHumanReadable` L191 付近）と JSON
サマリーに、High(≥0.9)/Medium(0.7-0.9)/Low(<0.7) confidence
の件数集計を追加する。DiagnosticsGenerator.detectAll() （Process 2）を使用し
suppress 前の全マッチを集計対象とする。

## Affected Files

- @modify `src/cli/modules/lsp/validate.ts`
  - detectAll() を直接呼び出すバリアント or generate() + detectAll()
    併用ロジック追加
  - サマリー集計: `{ high: number, medium: number, low: number }`
  - displayHumanReadable() に "Summary: High: X, Medium: Y, Low: Z" 表示
  - JSON 出力に `summary: { high, medium, low, total }` フィールド追加
- 既存 CONFIDENCE_THRESHOLD: src/lsp/diagnostics/diagnostics_generator.ts:70-75
  を参照

## Implementation Notes

- High 集計: detectAll() の結果から confidence >= 0.9 をカウント（現行
  generate() では suppress されるもの）
- Medium: 0.7 <= confidence < 0.9
- Low: confidence < 0.7
- --dir モード時は全ファイルの集計を表示 + ファイルごとも表示（サブサマリー）
- Issue #12 出力例との整合性確認

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] Process 13 で詳細テスト、本 Process は準備段階

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] ブリーフィング確認
- [x] collectAllMatches(uri, content, projectPath) ヘルパー関数追加（detectAll
      呼び出し）
- [x] summarizeByConfidence(matches) 関数追加
- [x] displayHumanReadable に Summary セクション追加
- [x] JSON 出力に summary フィールド追加
- [x] Process 13 テスト Green

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] 定数化: HIGH_THRESHOLD=0.9, MEDIUM_THRESHOLD=0.7 （既存
      CONFIDENCE_THRESHOLD 再利用検討）
- [x] 出力フォーマットの deno fmt
- [x] テスト継続成功

✅ **Phase Complete**

---

## Dependencies

- Requires: 2, 3, 4
- Blocks: 6, 13
