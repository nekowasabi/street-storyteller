# Process 51: MCP tool subplot_view

## Overview

Claude Desktop から subplot 一覧・個別を取得する MCP ツール。

**Title**: MCP tool subplot_view  
**Estimated Story Points**: 3  
**Status**: Not Started

## Objectives

1. MCP ツール `subplot_view` を新規定義
2. action パラメータで list/detail を切り替え
3. リソース取得と同じデータを返却
4. Red テストで動作確認

## Acceptance Criteria

- [ ] Tool name は `"subplot_view"` で登録
- [ ] inputSchema が action (required, enum), subplotId (action=detail時 required), filter (optional) を定義
- [ ] action="list" 時 Subplot[] を返却
- [ ] action="detail" 時 単一 Subplot を返却
- [ ] filter.type でタイプ別フィルタ
- [ ] 存在しない subplotId 時 404 エラー

## Implementation

### New File: src/mcp/tools/definitions/subplot_view.ts

**Dependencies**: ElementService, ViewSubplotCommand

**Reference**: src/mcp/tools/definitions/foreshadowing_view.ts (91行)

**Pseudocode**:

```
1. Export McpToolDefinition object "subplot_view"
   - name: "subplot_view"
   - description: "View subplots (list or detail)"
   - inputSchema: ObjectSchema with properties:
     * action (enum: "list" | "detail", required)
     * subplotId (string, required if action="detail")
     * filter (object optional with type and status fields)

2. Implement execute(input, context) async function:
   - If action="list":
     * Call ViewSubplotCommand.listAll()
     * Apply filter if present
     * Return { success: true, data: Subplot[] }
   - If action="detail":
     * Validate subplotId present
     * Call ViewSubplotCommand.getById(subplotId)
     * If not found: return { success: false, error: "Not found", code: 404 }
     * Return { success: true, data: Subplot }
```

### Modified File: src/mcp/tools/tool_registry.ts

**Changes**:
- Import subplot_view definition
- Add to registry: `"subplot_view": subplotViewDefinition`

## Testing

### New File: tests/mcp/tools/definitions/subplot_view_test.ts

**Red Test Cases**:

```typescript
Deno.test("tool name is subplot_view", () => {
  assertEquals(subplot_view.name, "subplot_view");
});

Deno.test("lists all subplots with action=list", async () => {
  const result = await subplot_view.execute({ action: "list" }, context);
  assertEquals(result.success, true);
  assert(Array.isArray(result.data));
});

Deno.test("returns specific subplot with action=detail", async () => {
  // Setup: Create subplot first
  await createTestSubplot("test_id", "Test Subplot");
  
  const result = await subplot_view.execute({
    action: "detail",
    subplotId: "test_id"
  }, context);
  assertEquals(result.success, true);
  assertEquals(result.data.name, "Test Subplot");
});

Deno.test("filters by type", async () => {
  // Setup: Create subplots of different types
  await createTestSubplot("main_1", "Main 1", "main");
  await createTestSubplot("sub_1", "Sub 1", "subplot");
  
  const result = await subplot_view.execute({
    action: "list",
    filter: { type: "main" }
  }, context);
  assert(result.data.every(s => s.type === "main"));
});

Deno.test("returns 404 for nonexistent subplotId", async () => {
  const result = await subplot_view.execute({
    action: "detail",
    subplotId: "nonexistent"
  }, context);
  assertEquals(result.success, false);
  assertEquals(result.code, 404);
});

Deno.test("rejects missing subplotId for detail action", async () => {
  const result = await subplot_view.execute({
    action: "detail"
  }, context);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, "subplotId");
});
```

## Dependencies

- Requires: 06 (ViewSubplotCommand), 50 (subplot_create for data)
- Blocks: 59 (Integration test)

## Notes

- action パラメータで list/detail 動作を切り替え
- filter は複数フィールド対応可能な設計にしておく
- 404 エラーコード設定

## Checklist

- [ ] Red tests pass
- [ ] src/mcp/tools/definitions/subplot_view.ts 実装完了
- [ ] tool_registry.ts に登録
- [ ] tests/mcp/tools/definitions/subplot_view_test.ts 実装完了
