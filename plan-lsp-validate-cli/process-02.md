# Process 2: DiagnosticsGenerator.detectAll() 新設

## Overview

`src/lsp/diagnostics/diagnostics_generator.ts` に、信頼度閾値による suppress
を行わない `detectAll()` メソッドを新設。Process 5 の High/Medium/Low
サマリー集計で使用。既存 `generate()` は一切変更しない（現行の診断動作を維持）。

## Affected Files

- @modify `src/lsp/diagnostics/diagnostics_generator.ts`
  - 現 `generate(uri, content, projectPath)` の前半（PositionedDetector
    呼び出し部分）を `detectAll()` として抽出
  - `generate()` は `detectAll()` の結果に `createDiagnosticsForMatch()`
    のフィルタを適用する形に（結果的に動作は不変）
  - `detectAll()` は signature:
    `async detectAll(uri: string, content: string, projectPath: string): Promise<PositionedMatch[]>`
- @modify `tests/lsp/diagnostics/diagnostics_generator_test.ts`
  - `detectAll()` が suppress 前の高信頼度マッチを含む全件を返すことを検証

## Implementation Notes

- 現行 `generate()` L94 付近で `detector.detectWithPositions()`
  を呼び出し、`createDiagnosticsForMatch()` L117 でフィルタリング
- リファクタ: detectWithPositions() の戻り値をそのまま返す `detectAll()` を
  public メソッドとして抽出
- 既存 `generate()` は `const matches = await this.detectAll(...)`
  を内部で呼ぶ形に最小書き換え
- CONFIDENCE_THRESHOLD (WARNING=0.7, HINT=0.9) は L70-75 のまま変更しない

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] diagnostics_generator_test.ts に `detectAll()` のテスト追加
  - 信頼度 0.95 のマッチが含まれる（現行 generate() では suppress
    されて存在しないもの）
  - 信頼度 0.5 のマッチも含まれる
- [x] deno test で失敗確認（detectAll メソッド未定義）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] ブリーフィング確認
- [x] detectAll() を新設
- [x] generate() を detectAll() 利用形にリファクタ（挙動不変）
- [x] deno test 成功、既存テストも維持

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] JSDoc: detectAll() と generate() の違いを明記
- [x] deno fmt / deno lint
- [x] 既存診断系テスト全件成功

✅ **Phase Complete**

---

## Dependencies

- Requires: -
- Blocks: 5
