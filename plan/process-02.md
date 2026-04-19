# Process 2: Subplot Plugin (plugin + validator)

## Overview
src/plugins/core/subplot/plugin.ts と validator.ts を新規作成。ElementPlugin インターフェースを実装し、subplot エンティティの作成・検証・スキーマエクスポートを担う。

## Affected Files
- **新規**: src/plugins/core/subplot/plugin.ts (~200行目安)
- **新規**: src/plugins/core/subplot/validator.ts (~250行目安)
- **参考**: src/plugins/core/foreshadowing/plugin.ts (199行) を全面コピー
- **参考**: src/plugins/core/foreshadowing/validator.ts (244行) を全面コピー
- **参考**: src/plugins/core/foreshadowing/plugin.ts:186-198 (generateTypeScriptFile)

## Implementation Notes
**plugin.ts**:
- メタデータ: `id: "storyteller.element.subplot"`, `version: "1.0.0"`, `name: "Subplot Element Plugin"`
- `getElementPath(elementId, projectRoot)`: `${projectRoot}/src/subplots/${elementId}.ts`
- `getDetailsDir(elementId, projectRoot)`: `${projectRoot}/src/subplots/${elementId}/details/`
- `generateTypeScriptFile(subplot)`: `import type { Subplot } from "@storyteller/types/v2/subplot.ts";` で生成
- `createElementFile(options)`: foreshadowing と同形式

**validator.ts**:
- `validateSubplot(element)`: 必須フィールド (id, name, type, summary, beats, focusCharacters) チェック
- `validBeatStructurePositions = ["setup", "rising", "climax", "falling", "resolution"]`
- **重要**: preconditionBeatIds の循環検出関数 `detectBeatPreconditionCycles(beats)` を実装。DFS で同一 beat への到達を検出
- type, status, importance の値ドメイン検証

---

## Red Phase
- [ ] ブリーフィング確認
- [ ] tests/plugins/core/subplot/plugin_test.ts は Process 11 で作成
- [ ] このProcessでは型整合性のみ確認

✅ **Phase Complete**

---

## Green Phase
- [ ] foreshadowing/plugin.ts をコピーし subplot 用に修正
- [ ] foreshadowing/validator.ts をコピーし subplot 用に修正
- [ ] preconditionBeatIds 循環検出を新規追加
- [ ] `deno check src/plugins/core/subplot/*.ts` 成功

✅ **Phase Complete**

---

## Refactor Phase
- [ ] 共通バリデーション関数を抽出 (foreshadowing と共有可能なら)
- [ ] エラーメッセージの一貫性確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 01
- Blocks: 03, 04, 05, 06, 07, 11, 50
