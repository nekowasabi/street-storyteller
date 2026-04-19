# Process 9: パーサー & ファイル生成器

## Overview
src/subplots/{id}.ts の TypeScript ファイルを Subplot 型インスタンスにパースする関数と、Subplot オブジェクトを TypeScript ファイル文字列に変換する関数を実装。

## Affected Files
- **新規**: src/application/subplot/subplot_file_parser.ts
- **新規**: src/application/subplot/subplot_file_generator.ts
- **参考**: src/application/timeline/timeline_file_parser.ts:71-91 (parseTimelineFromFile)
- **参考**: src/cli/modules/view/foreshadowing.ts:128-142 (parseForeshadowingFromFile)
- **参考**: src/plugins/core/foreshadowing/plugin.ts:186-198 (generateTypeScriptFile)

## Implementation Notes
**parser**:
```typescript
export function parseSubplotFromFile(content: string): Subplot | null {
  try {
    const match = content.match(
      /export\s+const\s+[^\s:]+\s*:\s*Subplot\s*=\s*(\{[\s\S]*?\});?\s*$/,
    );
    if (!match) return null;
    return JSON.parse(match[1]) as Subplot;
  } catch { return null; }
}

export function parseSubplotWithMutableBeats(content: string): { subplot: Subplot; beats: PlotBeat[] } | null {
  // beats を別途取得して mutating 操作を可能に
}
```

**generator**:
```typescript
export function generateSubplotFile(subplot: Subplot): string {
  const subplotJson = JSON.stringify(subplot, null, 2);
  return `import type { Subplot } from "@storyteller/types/v2/subplot.ts";

/**
 * ${subplot.name}
 * ${subplot.summary}
 */
export const ${subplot.id}: Subplot = ${subplotJson};
`;
}
```

---

## Red Phase
- [ ] tests/application/subplot/subplot_file_parser_test.ts (本Process内で同時)
- [ ] tests/application/subplot/subplot_file_generator_test.ts

✅ **Phase Complete**

---

## Green Phase
- [ ] timeline_file_parser をベースに subplot 用パーサー作成
- [ ] foreshadowing plugin の generateTypeScriptFile をベースに generator 作成
- [ ] round-trip テスト (parse → generate → parse) で同値性確認

✅ **Phase Complete**

---

## Refactor Phase
- [ ] 共通パターンを utils に抽出

✅ **Phase Complete**

---

## Dependencies
- Requires: 01
- Blocks: 04, 05, 06, 56
