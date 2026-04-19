# Process 10: 型定義テスト

## Overview
src/type/v2/subplot.ts の全エクスポート型に対する型コンパイル可能性とリテラル値検証テスト。Subplot、PlotBeat、PlotIntersection などの核となる型定義が正確に動作することを確認します。

## Affected Files
- 新規: tests/type/v2/subplot_test.ts (~300行)
- 参考: tests/type/v2/foreshadowing_test.ts:23-312

## Implementation Notes
Subplot フィーチャーの全リテラル型をカバー：
- SubplotType: main / subplot / parallel / background (4種)
- SubplotStatus: active / completed (2種)
- SubplotImportance: major / minor (2種)
- BeatStructurePosition: setup / rising / climax / falling / resolution (5種)
- IntersectionInfluenceDirection: forward / backward / bidirectional (3種)
- IntersectionInfluenceLevel: critical / moderate / subtle (3種)
- SubplotFocusCharacterWeight: primary / secondary (2種)

Subplot メイン型のフィールドが foreshadowing と対応していることを確認。特に、id、name、type、status、summary、beats[]、intersections[]、focusCharacters の構造。

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] 以下のテストケースを tests/type/v2/subplot_test.ts に作成：
  - "SubplotType accepts main/subplot/parallel/background only"
  - "Subplot.beats requires PlotBeat array"
  - "PlotBeat.preconditionBeatIds is optional string array"
  - "PlotIntersection requires source/target subplot+beat IDs"
  - "Subplot.focusCharacters maps characterId to weight"
- [ ] テストを実行して失敗確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] src/type/v2/subplot.ts の型定義が完全であることを確認
- [ ] `deno test tests/type/v2/subplot_test.ts` で全テスト成功

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] テストの命名・構造を改善
- [ ] テストヘルパー関数を抽出（重複するアサーション部分）

✅ **Phase Complete**

---

## Dependencies
- Requires: 01
- Blocks: -
