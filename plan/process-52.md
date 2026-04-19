# Process 52: MCP tool beat_create

## Overview

Claude Desktop から既存 subplot に beat を追加する MCP ツール。

**Title**: MCP tool beat_create  
**Estimated Story Points**: 5  
**Status**: Not Started

## Objectives

1. MCP ツール `beat_create` を新規定義
2. ElementBeatCommand と同じバリデーション実装
3. 循環 precondition 検出
4. Red テストで動作確認

## Acceptance Criteria

- [ ] Tool name は `"beat_create"` で登録
- [ ] inputSchema が subplotId (required), title, summary, chapter, structurePosition, characters, settings, preconditionBeatIds, timelineEventId を定義
- [ ] 存在しない subplot 拒否
- [ ] 不正な structurePosition 拒否
- [ ] 循環 precondition 検出
- [ ] beat を subplot に追加して保存

## Implementation

### New File: src/mcp/tools/definitions/beat_create.ts

**Dependencies**: ElementBeatCommand, ElementService

**Pseudocode**:

```
1. Export McpToolDefinition object "beat_create"
   - name: "beat_create"
   - description: "Add a beat to an existing subplot"
   - inputSchema: ObjectSchema with properties:
     * subplotId (string, required)
     * title (string, required)
     * summary (string)
     * chapter (string)
     * structurePosition (enum: "setup" | "inciting_incident" | "rising_action" | "climax" | "resolution", optional)
     * characters (string[], optional)
     * settings (string[], optional)
     * preconditionBeatIds (string[], optional)
     * timelineEventId (string, optional)

2. Implement execute(input, context) async function:
   - Validate subplotId exists
   - Validate structurePosition if provided
   - Check for cycles in preconditionBeatIds
   - Call ElementBeatCommand.execute(...)
   - Return success or error
```

### Modified File: src/mcp/tools/tool_registry.ts

**Changes**:
- Import beat_create definition
- Add to registry: `"beat_create": beatCreateDefinition`

## Testing

### New File: tests/mcp/tools/definitions/beat_create_test.ts

**Red Test Cases**:

```typescript
Deno.test("tool name is beat_create", () => {
  assertEquals(beat_create.name, "beat_create");
});

Deno.test("appends beat to existing subplot", async () => {
  // Setup: Create subplot
  const subplot = await createTestSubplot("sub_1", "Test");
  
  const result = await beat_create.execute({
    subplotId: "sub_1",
    title: "First Beat",
    summary: "Setup",
    chapter: "chapter_01"
  }, context);
  assertEquals(result.success, true);
});

Deno.test("rejects nonexistent subplotId", async () => {
  const result = await beat_create.execute({
    subplotId: "nonexistent",
    title: "Beat",
    summary: "Test"
  }, context);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, "subplot");
});

Deno.test("rejects invalid structurePosition", async () => {
  await createTestSubplot("sub_1", "Test");
  
  const result = await beat_create.execute({
    subplotId: "sub_1",
    title: "Beat",
    structurePosition: "invalid" as any
  }, context);
  assertEquals(result.success, false);
});

Deno.test("detects precondition cycle", async () => {
  await createTestSubplot("sub_1", "Test");
  
  // Create beat A with precondition to B
  const beatA = await createTestBeat("sub_1", "Beat A", ["beat_b"]);
  // Create beat B with precondition back to A
  
  const result = await beat_create.execute({
    subplotId: "sub_1",
    title: "Beat B",
    preconditionBeatIds: [beatA.id]
  }, context);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, "cycle");
});
```

## Dependencies

- Requires: 04 (ElementBeatCommand), 50 (subplot_create)
- Blocks: 59 (Integration test)

## Notes

- structurePosition はナレーション上の位置（setup, climax等）
- preconditionBeatIds は因果関係フィールド
- 循環チェックは深さ優先探索

## Checklist

- [ ] Red tests pass
- [ ] src/mcp/tools/definitions/beat_create.ts 実装完了
- [ ] tool_registry.ts に登録
- [ ] tests/mcp/tools/definitions/beat_create_test.ts 実装完了
