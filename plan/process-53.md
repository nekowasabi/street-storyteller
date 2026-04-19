# Process 53: MCP tool intersection_create

## Overview

Claude Desktop から PlotIntersection を作成する MCP ツール。

**Title**: MCP tool intersection_create  
**Estimated Story Points**: 4  
**Status**: Not Started

## Objectives

1. MCP ツール `intersection_create` を新規定義
2. ElementIntersectionCommand と同じバリデーション実装
3. 両側の subplot/beat 存在確認
4. Red テストで動作確認

## Acceptance Criteria

- [ ] Tool name は `"intersection_create"` で登録
- [ ] inputSchema が sourceSubplotId, sourceBeatId, targetSubplotId, targetBeatId, summary, influenceDirection, influenceLevel を定義
- [ ] 両側 subplot 存在確認
- [ ] 両側 beat 存在確認
- [ ] influenceDirection デフォルト "forward"
- [ ] intersection を両 subplot に記録

## Implementation

### New File: src/mcp/tools/definitions/intersection_create.ts

**Dependencies**: ElementIntersectionCommand, ElementService

**Pseudocode**:

```
1. Export McpToolDefinition object "intersection_create"
   - name: "intersection_create"
   - description: "Create a plot intersection between two subplots"
   - inputSchema: ObjectSchema with properties:
     * sourceSubplotId (string, required)
     * sourceBeatId (string, required)
     * targetSubplotId (string, required)
     * targetBeatId (string, required)
     * summary (string, required)
     * influenceDirection (enum: "forward" | "backward" | "bidirectional", optional, default="forward")
     * influenceLevel (enum: "strong" | "moderate" | "subtle", optional)

2. Implement execute(input, context) async function:
   - Validate both subplots exist
   - Validate both beats exist in respective subplots
   - Call ElementIntersectionCommand.execute(...)
   - Return success or error
```

### Modified File: src/mcp/tools/tool_registry.ts

**Changes**:
- Import intersection_create definition
- Add to registry: `"intersection_create": intersectionCreateDefinition`

## Testing

### New File: tests/mcp/tools/definitions/intersection_create_test.ts

**Red Test Cases**:

```typescript
Deno.test("tool name is intersection_create", () => {
  assertEquals(intersection_create.name, "intersection_create");
});

Deno.test("creates intersection between two subplots", async () => {
  // Setup: Create two subplots with beats
  const sub1 = await createTestSubplot("sub_1", "Subplot 1");
  const beat1 = await createTestBeat("sub_1", "Beat 1");
  const sub2 = await createTestSubplot("sub_2", "Subplot 2");
  const beat2 = await createTestBeat("sub_2", "Beat 2");
  
  const result = await intersection_create.execute({
    sourceSubplotId: "sub_1",
    sourceBeatId: beat1.id,
    targetSubplotId: "sub_2",
    targetBeatId: beat2.id,
    summary: "Hero meets ally"
  }, context);
  assertEquals(result.success, true);
});

Deno.test("validates target beat exists in target subplot", async () => {
  const sub1 = await createTestSubplot("sub_1", "Subplot 1");
  const beat1 = await createTestBeat("sub_1", "Beat 1");
  const sub2 = await createTestSubplot("sub_2", "Subplot 2");
  
  const result = await intersection_create.execute({
    sourceSubplotId: "sub_1",
    sourceBeatId: beat1.id,
    targetSubplotId: "sub_2",
    targetBeatId: "nonexistent_beat",
    summary: "Test"
  }, context);
  assertEquals(result.success, false);
});

Deno.test("defaults influenceDirection to forward", async () => {
  const sub1 = await createTestSubplot("sub_1", "Subplot 1");
  const beat1 = await createTestBeat("sub_1", "Beat 1");
  const sub2 = await createTestSubplot("sub_2", "Subplot 2");
  const beat2 = await createTestBeat("sub_2", "Beat 2");
  
  const result = await intersection_create.execute({
    sourceSubplotId: "sub_1",
    sourceBeatId: beat1.id,
    targetSubplotId: "sub_2",
    targetBeatId: beat2.id,
    summary: "Test"
    // no influenceDirection provided
  }, context);
  assertEquals(result.success, true);
  // Verify default direction
  const intersection = result.data;
  assertEquals(intersection.influenceDirection, "forward");
});
```

## Dependencies

- Requires: 05 (ElementIntersectionCommand), 52 (beat_create)
- Blocks: 59 (Integration test)

## Notes

- intersection は beat レベルで定義
- influenceDirection は "forward", "backward", "bidirectional"
- influenceLevel は強度レベル

## Checklist

- [ ] Red tests pass
- [ ] src/mcp/tools/definitions/intersection_create.ts 実装完了
- [ ] tool_registry.ts に登録
- [ ] tests/mcp/tools/definitions/intersection_create_test.ts 実装完了
