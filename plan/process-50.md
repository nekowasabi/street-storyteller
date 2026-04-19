# Process 50: MCP tool subplot_create

## Overview

Claude Desktop から subplot を作成可能にする MCP ツール定義。

**Title**: MCP tool subplot_create  
**Estimated Story Points**: 5  
**Status**: Not Started

## Objectives

1. MCP ツール `subplot_create` を新規定義
2. CLI の ElementSubplotCommand と同じバリデーションロジックでアダプター実装
3. tool registry に登録
4. Red テストで動作確認

## Acceptance Criteria

- [ ] Tool name は `"subplot_create"` で登録
- [ ] inputSchema が required フィールド (name, summary) と optional フィールド (type, importance, focusCharacters, parentSubplot) を定義
- [ ] execute メソッドが ElementService へ委譲
- [ ] ElementSubplotCommand と同じバリデーション (name 重複チェック等) を実行
- [ ] 成功時 `{ success: true, message: "...", filePath: "src/subplots/..." }` を返却
- [ ] エラー時 `{ success: false, error: "..." }` を返却

## Implementation

### New File: src/mcp/tools/definitions/subplot_create.ts

**Dependencies**: ElementSubplotCommand, ElementService

**Reference**: src/mcp/tools/definitions/foreshadowing_create.ts (lines 13-227)

**Pseudocode**:

```
1. Export McpToolDefinition object "subplot_create"
   - name: "subplot_create"
   - description: "Create a new subplot for the project"
   - inputSchema: ObjectSchema with properties:
     * name (string, required)
     * type (enum: "main" | "subplot" | "parallel" | "background", optional, default="subplot")
     * summary (string, required)
     * importance (enum: "major" | "minor" | "subtle", optional)
     * focusCharacters (object<string, CharacterRole>, optional)
     * parentSubplot (string, optional)

2. Implement execute(input, context) async function:
   - Validate required fields
   - Call ElementSubplotCommand.execute({ name, type, summary, importance, focusCharacters, parentSubplot })
   - On success: return { success: true, message: "Subplot created", filePath: "..." }
   - On failure: return { success: false, error: errorMessage }
```

### Modified File: src/mcp/tools/tool_registry.ts

**Changes**:
- Import subplot_create definition
- Add to registry: `"subplot_create": subplotCreateDefinition`

## Testing

### New File: tests/mcp/tools/definitions/subplot_create_test.ts

**Red Test Cases**:

```typescript
Deno.test("tool name is subplot_create", () => {
  assertEquals(subplot_create.name, "subplot_create");
});

Deno.test("rejects missing name parameter", async () => {
  const result = await subplot_create.execute({ summary: "test" }, context);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, "name");
});

Deno.test("rejects missing summary parameter", async () => {
  const result = await subplot_create.execute({ name: "test" }, context);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, "summary");
});

Deno.test("creates subplot file via ElementService", async () => {
  const result = await subplot_create.execute({
    name: "Hero's Journey",
    summary: "Main character arc",
    type: "main"
  }, context);
  assertEquals(result.success, true);
  assert(result.filePath.includes("subplots/"));
});

Deno.test("returns success message with file path", async () => {
  const result = await subplot_create.execute({
    name: "Test Subplot",
    summary: "Test"
  }, context);
  assert(result.message.includes("Subplot"));
  assert(result.filePath);
});

Deno.test("rejects duplicate subplot name", async () => {
  // Setup: Create first subplot
  await subplot_create.execute({
    name: "Duplicate Test",
    summary: "First"
  }, context);
  
  // Try to create duplicate
  const result = await subplot_create.execute({
    name: "Duplicate Test",
    summary: "Second"
  }, context);
  assertEquals(result.success, false);
  assertStringIncludes(result.error, "already exists");
});

Deno.test("supports all type variants", async () => {
  for (const type of ["main", "subplot", "parallel", "background"]) {
    const result = await subplot_create.execute({
      name: `Test ${type}`,
      summary: "Test",
      type: type as any
    }, context);
    assertEquals(result.success, true);
  }
});
```

## Dependencies

- Requires: 03 (ElementSubplotCommand)
- Blocks: 54 (MCP resource), 59 (Integration test)

## Notes

- tool name は `"subplot_create"` で固定
- inputSchema は foreshadowing_create.ts パターンに準拠
- execute は ElementSubplotCommand へのシンプルなアダプター
- エラーメッセージは日本語でも英語でも一貫した形式

## Checklist

- [ ] Red tests pass
- [ ] src/mcp/tools/definitions/subplot_create.ts 実装完了
- [ ] tool_registry.ts に登録
- [ ] tests/mcp/tools/definitions/subplot_create_test.ts 実装完了
