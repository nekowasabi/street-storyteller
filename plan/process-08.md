# Process 8: manuscript_binding 拡張

## Overview
manuscript_binding ツールの entityType に "subplots" を追加し、原稿 FrontMatter で subplots: [a, b] を宣言可能に。

## Affected Files
- **修正**: src/mcp/tools/definitions/manuscript_binding.ts:29-36 (VALID_ENTITY_TYPES)
- **修正**: 同ファイル内の inputSchema enum 値
- **修正**: 同ファイル内の FrontMatter 操作ロジック (subplots フィールド対応)
- **参考**: src/mcp/tools/definitions/manuscript_binding.ts (200+行)

## Implementation Notes
**Line 29-36 修正**:
```typescript
const VALID_ENTITY_TYPES: BindableEntityType[] = [
  "characters",
  "settings",
  "foreshadowings",
  "subplots",       // ← 新規追加
  "timeline_events",
  "phases",
  "timelines",
];
```

**型定義**:
- BindableEntityType に "subplots" を追加 (型エイリアスがある場合)

**inputSchema 修正**:
- properties.entityType.enum に "subplots" 追加

**FrontMatter 操作**:
- 既存の generic 操作で対応可能なら追加実装不要
- subplot ID の存在検証は --validate=true 時に src/subplots/{id}.ts を確認

---

## Red Phase
- [ ] tests は Process 19

✅ **Phase Complete**

---

## Green Phase
- [ ] VALID_ENTITY_TYPES に "subplots" 追加
- [ ] inputSchema 更新
- [ ] EntityValidator 拡張 (subplots 用の存在検証)

✅ **Phase Complete**

---

## Refactor Phase
- [ ] バリデーター共通化

✅ **Phase Complete**

---

## Dependencies
- Requires: 01
- Blocks: 19
