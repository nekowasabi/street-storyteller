# Process 54: MCP resource storyteller://subplots

## Overview

Claude Desktop から subplot リソースを参照可能に。

**Title**: MCP resource storyteller://subplots  
**Estimated Story Points**: 4  
**Status**: Not Started

## Objectives

1. リソース URI `storyteller://subplots` (一覧) と `storyteller://subplot/{id}` (個別) を実装
2. src/subplots/*.ts をパースして返却
3. `?expand=details` クエリで file 参照解決
4. Red テストで動作確認

## Acceptance Criteria

- [ ] GET storyteller://subplots が全 subplot を返却
- [ ] GET storyteller://subplot/{id} が特定 subplot を返却
- [ ] 存在しない id で 404 エラー
- [ ] ?expand=details で focusCharacters が { id: Character } に解決
- [ ] MIME type は application/json

## Implementation

### Modified File: src/mcp/resources/project_resource_provider.ts

**Changes**:
- Add URI pattern handler for `storyteller://subplots`
- Add URI pattern handler for `storyteller://subplot/{id}`
- Implement getSubplots() method
- Implement getSubplot(id, expandDetails) method
- Load and parse src/subplots/*.ts files
- Resolve file references when expand=details

**Pseudocode**:

```
1. Add to readResource(uri, context):
   - If uri matches "storyteller://subplots":
     * Call getSubplots()
     * Return { mimeType: "application/json", text: JSON.stringify(...) }
   
   - If uri matches "storyteller://subplot/{id}":
     * Extract id from uri
     * Call getSubplot(id, context.query?.expand === "details")
     * If not found: raise error 404
     * Return { mimeType: "application/json", text: JSON.stringify(...) }

2. Implement getSubplots() -> Subplot[]:
   - Scan src/subplots/ directory
   - Import each .ts file
   - Extract default export (Subplot object)
   - Return array

3. Implement getSubplot(id, expandDetails) -> Subplot:
   - Load src/subplots/{id}.ts
   - If expandDetails:
     * For each focusCharacters[role]:
       - Load corresponding character file
       - Replace { id } with full Character object
   - Return Subplot
```

## Testing

### New File: tests/mcp/resources/subplot_resource_test.ts

**Red Test Cases**:

```typescript
Deno.test("lists all subplots at storyteller://subplots", async () => {
  // Setup: Create test subplots
  await createTestSubplot("sub_1", "Subplot 1");
  await createTestSubplot("sub_2", "Subplot 2");
  
  const result = await provider.readResource("storyteller://subplots", context);
  const data = JSON.parse(result.text);
  assert(Array.isArray(data));
  assertEquals(data.length, 2);
});

Deno.test("returns specific subplot at storyteller://subplot/{id}", async () => {
  await createTestSubplot("test_sub", "Test Subplot");
  
  const result = await provider.readResource("storyteller://subplot/test_sub", context);
  const data = JSON.parse(result.text);
  assertEquals(data.id, "test_sub");
  assertEquals(data.name, "Test Subplot");
});

Deno.test("returns 404 for nonexistent id", async () => {
  let errorThrown = false;
  try {
    await provider.readResource("storyteller://subplot/nonexistent", context);
  } catch (e) {
    errorThrown = true;
    assertStringIncludes(e.message, "404");
  }
  assert(errorThrown);
});

Deno.test("expands details with ?expand=details", async () => {
  // Setup: Create subplot with focusCharacters
  const hero = await createTestCharacter("hero", "Hero");
  await createTestSubplot("main_plot", "Main", {
    focusCharacters: { "protagonist": { id: "hero" } }
  });
  
  const result = await provider.readResource(
    "storyteller://subplot/main_plot?expand=details",
    context
  );
  const data = JSON.parse(result.text);
  assert(typeof data.focusCharacters.protagonist === "object");
  assertEquals(data.focusCharacters.protagonist.name, "Hero");
});

Deno.test("returns correct MIME type", async () => {
  await createTestSubplot("test", "Test");
  
  const result = await provider.readResource("storyteller://subplots", context);
  assertEquals(result.mimeType, "application/json");
});
```

## Dependencies

- Requires: 50 (subplot_create), 51 (subplot_view)
- Blocks: 56 (HTML graph builder), 59 (Integration test)

## Notes

- リソース URI は大文字小文字を区別しない
- ?expand=details は character/settings の詳細ロード
- ファイル参照は { id: string } から { ...Character } へ変換

## Checklist

- [ ] Red tests pass
- [ ] src/mcp/resources/project_resource_provider.ts 修正完了
- [ ] storyteller://subplots URI 実装
- [ ] storyteller://subplot/{id} URI 実装
- [ ] tests/mcp/resources/subplot_resource_test.ts 実装完了
