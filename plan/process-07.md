# Process 7: validate 拡張 (subplot 検証統合)

## Overview
storyteller meta check に subplot 検証を統合。参照整合性 + 構造完全性をチェック。subplot ゼロのプロジェクトは完全スキップ (後方互換)。

## Affected Files
- **修正**: src/cli/modules/meta/check.ts (~120行 → +50行)
- **参考**: src/cli/modules/meta/check.ts:33-92 (handle メソッド)
- **参考**: src/plugins/core/subplot/validator.ts (Process 02)

## Implementation Notes
**追加する検証ロジック** (handle 内、既存 markdownPaths ループの後に追加):

```typescript
// subplot 検証 (オプショナル - 配列空ならスキップ)
const subplots = await loadAllSubplots(projectRoot);
if (subplots.length === 0) {
  context.logger.info("No subplots found, validation skipped");
} else {
  for (const subplot of subplots) {
    // 1. 参照整合性: timelineEventId, characterIds, settingIds, preconditionBeatIds
    const refErrors = validateSubplotReferences(subplot, allEvents, allCharacters, allSettings);
    
    // 2. 構造完全性: setup/climax の存在、type!=main で intersections ゼロ → 警告
    const structErrors = validateSubplotStructure(subplot, allIntersections);
    
    // 3. preconditionBeatIds 循環 (Process 02 の detectBeatPreconditionCycles)
    const cycleErrors = detectBeatPreconditionCycles(subplot.beats);
    
    failures.push(...refErrors, ...structErrors, ...cycleErrors);
  }
}
```

**検証関数** (新規ファイルまたは check.ts 内):
- `validateSubplotReferences(subplot, events, characters, settings): ValidationError[]`
- `validateSubplotStructure(subplot, intersections): ValidationError[]`
  - subplot.beats に structurePosition="climax" 不在 → エラー
  - subplot.beats に structurePosition="setup" 不在 → エラー
  - subplot.type!="main" && intersections.filter(s|t === subplot.id).length===0 → 警告

---

## Red Phase
- [ ] tests は Process 16, 17, 18 で網羅

✅ **Phase Complete**

---

## Green Phase
- [ ] check.ts に subplot 検証統合
- [ ] validateSubplotReferences/Structure 実装
- [ ] subplot 配列空時のスキップ動作確認

✅ **Phase Complete**

---

## Refactor Phase
- [ ] 検証関数を src/validation/subplot_validator.ts に抽出を検討

✅ **Phase Complete**

---

## Dependencies
- Requires: 01, 02
- Blocks: 16, 17, 18, 100
