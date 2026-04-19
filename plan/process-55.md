# Process 55: MCP prompts (3種)

## Overview

3つの subplot 関連プロンプトを定義。

**Title**: MCP prompts (3種)  
**Estimated Story Points**: 5  
**Status**: Not Started

## Objectives

1. subplot_brainstorm プロンプト定義
2. subplot_intersection_suggest プロンプト定義
3. subplot_completion_review プロンプト定義
4. PromptRegistry に登録
5. Red テストで動作確認

## Acceptance Criteria

- [ ] subplot_brainstorm が mainPlotSummary, themes?, focusCharacter? をパラメータ受け入れ
- [ ] subplot_intersection_suggest が subplotId1, subplotId2 をパラメータ受け入れ
- [ ] subplot_completion_review が subplotId をパラメータ受け入れ
- [ ] 各プロンプトが getMessages(args) で role:system + role:user を返却
- [ ] PromptRegistry に 3 つすべて登録

## Implementation

### New File: src/mcp/prompts/definitions/subplot_brainstorm.ts

**Reference**: src/mcp/prompts/definitions/character_brainstorm.ts (34行)

**Pseudocode**:

```
export const subplotBrainstormPrompt: McpPromptDefinition = {
  name: "subplot_brainstorm",
  description: "Brainstorm new subplot ideas",
  arguments: [
    { name: "mainPlotSummary", required: true, description: "Main plot summary" },
    { name: "themes", required: false, description: "Story themes (comma-separated)" },
    { name: "focusCharacter", required: false, description: "Character to focus on" }
  ],
  getMessages: (args) => [
    {
      role: "user",
      content: `Given main plot: "${args.mainPlotSummary}"
      ${args.themes ? `Themes: ${args.themes}` : ""}
      ${args.focusCharacter ? `Focus character: ${args.focusCharacter}` : ""}
      
      Suggest 3-5 compelling subplot ideas that complement the main plot.`
    }
  ]
};
```

### New File: src/mcp/prompts/definitions/subplot_intersection_suggest.ts

**Pseudocode**:

```
export const subplotIntersectionSuggestPrompt: McpPromptDefinition = {
  name: "subplot_intersection_suggest",
  description: "Suggest plot intersection points between two subplots",
  arguments: [
    { name: "subplotId1", required: true, description: "First subplot ID" },
    { name: "subplotId2", required: true, description: "Second subplot ID" }
  ],
  getMessages: (args) => {
    // Load subplot1 and subplot2 from context
    const subplot1 = getSubplotContext(args.subplotId1);
    const subplot2 = getSubplotContext(args.subplotId2);
    
    return [
      {
        role: "user",
        content: `Given two subplots:
        
Subplot 1: ${subplot1.name}
Summary: ${subplot1.summary}
Beats: ${subplot1.beats.map(b => b.title).join(", ")}

Subplot 2: ${subplot2.name}
Summary: ${subplot2.summary}
Beats: ${subplot2.beats.map(b => b.title).join(", ")}

Suggest 3-4 specific intersection points where these subplots could naturally converge.
Consider beat alignment, character connections, and narrative impact.`
      }
    ];
  }
};
```

### New File: src/mcp/prompts/definitions/subplot_completion_review.ts

**Pseudocode**:

```
export const subplotCompletionReviewPrompt: McpPromptDefinition = {
  name: "subplot_completion_review",
  description: "Review subplot structural completeness",
  arguments: [
    { name: "subplotId", required: true, description: "Subplot ID to review" }
  ],
  getMessages: (args) => {
    const subplot = getSubplotContext(args.subplotId);
    
    return [
      {
        role: "user",
        content: `Review the following subplot for structural completeness:

Name: ${subplot.name}
Type: ${subplot.type}
Summary: ${subplot.summary}
Current beats: ${subplot.beats.length}
${subplot.beats.map((b, i) => `${i+1}. ${b.title} (${b.structurePosition || "unpositioned"})`).join("\n")}

Analyze:
1. Does it have a clear setup?
2. Is there a climactic moment?
3. Is there resolution?
4. Are there critical missing beats?
5. Any structural weaknesses?

Provide specific recommendations.`
      }
    ];
  }
};
```

### Modified File: src/mcp/prompts/prompt_registry.ts

**Changes**:
- Import 3 new prompt definitions
- Add to registry:
  - `"subplot_brainstorm": subplotBrainstormPrompt`
  - `"subplot_intersection_suggest": subplotIntersectionSuggestPrompt`
  - `"subplot_completion_review": subplotCompletionReviewPrompt`

## Testing

### New File: tests/mcp/prompts/definitions/subplot_prompts_test.ts

**Red Test Cases**:

```typescript
Deno.test("subplot_brainstorm returns user message", () => {
  const messages = subplotBrainstormPrompt.getMessages({
    mainPlotSummary: "A hero's journey"
  });
  assert(messages.length >= 1);
  assertEquals(messages[messages.length - 1].role, "user");
  assertStringIncludes(messages[messages.length - 1].content, "subplot");
});

Deno.test("subplot_brainstorm accepts themes parameter", () => {
  const messages = subplotBrainstormPrompt.getMessages({
    mainPlotSummary: "Main plot",
    themes: "redemption,betrayal"
  });
  assertStringIncludes(messages[messages.length - 1].content, "redemption");
});

Deno.test("subplot_intersection_suggest accepts 2 subplot IDs", () => {
  const messages = subplotIntersectionSuggestPrompt.getMessages({
    subplotId1: "romance",
    subplotId2: "mystery"
  });
  assert(messages.length >= 1);
  assertStringIncludes(messages[messages.length - 1].content, "intersection");
});

Deno.test("subplot_intersection_suggest loads subplot context", () => {
  // Verify it loads subplot data, not just IDs
  const messages = subplotIntersectionSuggestPrompt.getMessages({
    subplotId1: "romance",
    subplotId2: "mystery"
  });
  // Should contain subplot details, not just "romance" and "mystery"
  assertStringIncludes(messages[messages.length - 1].content, "Beats");
});

Deno.test("subplot_completion_review references subplot context", () => {
  const messages = subplotCompletionReviewPrompt.getMessages({
    subplotId: "hero_arc"
  });
  assert(messages.length >= 1);
  assertStringIncludes(messages[messages.length - 1].content, "setup");
  assertStringIncludes(messages[messages.length - 1].content, "climax");
  assertStringIncludes(messages[messages.length - 1].content, "resolution");
});

Deno.test("all prompts registered in registry", () => {
  const registry = PromptRegistry.getInstance();
  assert(registry.get("subplot_brainstorm"));
  assert(registry.get("subplot_intersection_suggest"));
  assert(registry.get("subplot_completion_review"));
});
```

## Dependencies

- Requires: 50 (subplot_create), 51 (subplot_view), 52 (beat_create), 53 (intersection_create)
- Blocks: 59 (Integration test)

## Notes

- getMessages は User Prompt を返す（System Prompt は MCP サーバー側が管理）
- Subplot context は ElementService から動的に読み込み
- プロンプトはユーザーが Claude に入力すると提案される

## Checklist

- [ ] Red tests pass
- [ ] src/mcp/prompts/definitions/subplot_brainstorm.ts 実装完了
- [ ] src/mcp/prompts/definitions/subplot_intersection_suggest.ts 実装完了
- [ ] src/mcp/prompts/definitions/subplot_completion_review.ts 実装完了
- [ ] prompt_registry.ts に 3 つ登録
- [ ] tests/mcp/prompts/definitions/subplot_prompts_test.ts 実装完了
