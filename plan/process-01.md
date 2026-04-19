# Process 1: Subplot 型定義

## Overview
src/type/v2/subplot.ts を新規作成し、Subplot/PlotBeat/PlotIntersection の3型を定義する。Foreshadowing と同等の構造化型でメタ情報・ライフサイクル・関係性を表現。Timeline (時間軸) とは独立した「物語展開構造」レイヤー。

## Affected Files
- **新規**: src/type/v2/subplot.ts (~200行目安)
- **参考**: src/type/v2/foreshadowing.ts (176行) のJSDocパターンと型構造を踏襲
- **参考**: src/type/v2/timeline.ts:405-414 (causedBy/causes パターン → preconditionBeatIds 設計の参考)

## Implementation Notes
必須エクスポート型:
- `SubplotType = "main" | "subplot" | "parallel" | "background"`
- `SubplotStatus = "active" | "completed"` (※ Grill 決定 #2 で lifecycle 簡素化、merged/dissolved は除外)
- `SubplotImportance = "major" | "minor"`
- `BeatStructurePosition = "setup" | "rising" | "climax" | "falling" | "resolution"`
- `PlotBeat = { id, title, summary, chapter, characters[], settings[], structurePosition, preconditionBeatIds?, timelineEventId? }`
- `IntersectionInfluenceDirection = "forward" | "backward" | "mutual"`
- `IntersectionInfluenceLevel = "high" | "medium" | "low"`
- `PlotIntersection = { id, sourceSubplotId, sourceBeatId, targetSubplotId, targetBeatId, influenceDirection, influenceLevel, summary }`
- `SubplotDetails = { intent?, themes?, readerImpact?, notes? }` 各 string | { file: string }
- `SubplotRelations = { characters[], settings[], relatedSubplots? }`
- `SubplotFocusCharacterWeight = "primary" | "secondary"`
- `Subplot = { id, name, type, summary, beats: PlotBeat[], focusCharacters: { [characterId: string]: SubplotFocusCharacterWeight }, intersections?: PlotIntersection[], status?, importance?, parentSubplotId?, displayNames?, details?, relations? }`

JSDocはFR各型に必須。`/** ... */`形式で foreshadowing.ts のスタイルを踏襲。

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] tests/type/v2/subplot_test.ts は Process 10 で別途作成 (本 Process では型定義のみ)
- [ ] このProcessでは型のコンパイル可能性のみ確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] foreshadowing.ts をテンプレートとしてコピー
- [ ] 上記の必須型を全て定義
- [ ] JSDoc を全エクスポート型に付与
- [ ] `deno check src/type/v2/subplot.ts` でコンパイル成功

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] 不要な import を削除
- [ ] 型名・フィールド名の命名一貫性確認
- [ ] foreshadowing.ts と命名スタイルが揃っていることを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: 02, 03, 04, 05, 06, 07, 08, 09, 10
