# Process 59: MCP 統合テスト

## Overview

MCP サーバー全体での subplot 機能の E2E テスト。

**Title**: MCP 統合テスト  
**Estimated Story Points**: 6  
**Status**: Not Started

## Objectives

1. MCP サーバー起動確認
2. subplot_create → subplot_view → resource fetch フロー検証
3. manuscript_binding での subplots フィールド操作
4. meta check での整合性確認
5. 全 MCP ツール/リソース/プロンプト登録確認

## Acceptance Criteria

- [ ] MCP サーバー起動時全 subplot ツール登録
- [ ] MCP サーバー起動時全 subplot リソース登録
- [ ] MCP サーバー起動時全 subplot プロンプト登録
- [ ] subplot_create → subplot_view ラウンドトリップ成功
- [ ] manuscript_binding subplots → meta check 整合性確認

## Implementation

### New File: tests/mcp/integration/subplot_integration_test.ts

**Pseudocode**:

```
describe("Subplot MCP Integration", () => {
  let server: McpServer;
  
  beforeAll(async () => {
    server = new McpServer();
    await server.start();
  });
  
  afterAll(async () => {
    await server.stop();
  });
  
  test("MCP server registers all subplot tools", () => {
    const tools = server.listTools();
    const subplotTools = tools.filter(t => t.name.includes("subplot") || t.name.includes("beat") || t.name.includes("intersection"));
    
    assert(subplotTools.some(t => t.name === "subplot_create"));
    assert(subplotTools.some(t => t.name === "subplot_view"));
    assert(subplotTools.some(t => t.name === "beat_create"));
    assert(subplotTools.some(t => t.name === "intersection_create"));
  });
  
  test("MCP server registers subplot resources", () => {
    const resources = server.listResources();
    const subplotResources = resources.filter(r => 
      r.uri.includes("subplot"));
    
    assert(subplotResources.some(r => 
      r.uri === "storyteller://subplots"));
  });
  
  test("MCP server registers subplot prompts", () => {
    const prompts = server.listPrompts();
    
    assert(prompts.some(p => p.name === "subplot_brainstorm"));
    assert(prompts.some(p => p.name === "subplot_intersection_suggest"));
    assert(prompts.some(p => p.name === "subplot_completion_review"));
  });
  
  test("subplot_create → subplot_view round trip", async () => {
    // Step 1: Create via MCP tool
    const createResult = await server.callTool("subplot_create", {
      name: "Test Subplot",
      type: "main",
      summary: "Test summary"
    });
    
    assert(createResult.success);
    const subplotId = extractSubplotId(createResult.filePath);
    
    // Step 2: Retrieve via MCP tool
    const viewResult = await server.callTool("subplot_view", {
      action: "detail",
      subplotId
    });
    
    assert(viewResult.success);
    assertEquals(viewResult.data.name, "Test Subplot");
    assertEquals(viewResult.data.type, "main");
  });
  
  test("beat_create on existing subplot", async () => {
    const subResult = await server.callTool("subplot_create", {
      name: "Plot",
      summary: "Plot"
    });
    const subplotId = extractSubplotId(subResult.filePath);
    
    const beatResult = await server.callTool("beat_create", {
      subplotId,
      title: "Opening Scene",
      summary: "Scene summary",
      chapter: "chapter_01"
    });
    
    assert(beatResult.success);
  });
  
  test("resource fetch via storyteller://subplots", async () => {
    // Create test subplots via tool
    await server.callTool("subplot_create", {
      name: "Test 1",
      summary: "T1"
    });
    await server.callTool("subplot_create", {
      name: "Test 2",
      summary: "T2"
    });
    
    // Fetch via resource
    const result = await server.readResource("storyteller://subplots");
    const subplots = JSON.parse(result.text);
    
    assert(subplots.length >= 2);
  });
});
```

## Testing

All integration tests included in implementation file.

## Dependencies

- Requires: 50, 51, 52, 53, 54, 55, 56, 57, 58
- Requires: 10-19 (CLI commands, commands framework)
- Blocks: 100, 101 (Future phases)

## Notes

- E2E テストは MCP サーバー実起動
- すべてのツール/リソース/プロンプト登録確認
- ラウンドトリップ検証で実装完全性確認

## Checklist

- [ ] Red tests pass
- [ ] tests/mcp/integration/subplot_integration_test.ts 実装完了
- [ ] すべての subplot MCP 機能が登録されていることを確認
- [ ] ツール、リソース、プロンプトの E2E フロー検証完了
- [ ] manuscript_binding 統合確認
- [ ] meta check 統合確認
