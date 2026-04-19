# Process 58: RAG テンプレート

## Overview

subplot を RAG ドキュメント化。

**Title**: RAG テンプレート  
**Estimated Story Points**: 4  
**Status**: Not Started

## Objectives

1. generateSubplotDocument 関数実装
2. RAG ドキュメント化: name, summary, beats, intersections, focusCharacters
3. tags: type, status, importance, focusCharacters, themes
4. sourcePath: src/subplots/{id}.ts
5. Red テストで動作確認

## Acceptance Criteria

- [ ] 関数 generateSubplotDocument(subplot): RagDocument
- [ ] RagDocument.id は subplot.id
- [ ] RagDocument.title は subplot.name
- [ ] RagDocument.content は Markdown 形式で beats, intersections を含む
- [ ] tags に type, status, importance, focusCharacters を含む
- [ ] sourcePath は src/subplots/{id}.ts
- [ ] beats は chapter 順でソート

## Implementation

### New File: src/rag/templates/subplot.ts

**Reference**: src/rag/templates/foreshadowing.ts (138行)

**Pseudocode**:

```
export function generateSubplotDocument(subplot: Subplot): RagDocument {
  const tags: string[] = [
    `type:${subplot.type}`,
    `status:${subplot.status || "draft"}`,
    ...(subplot.importance ? [`importance:${subplot.importance}`] : []),
    ...Object.keys(subplot.focusCharacters || {}).map(role => `focus:${role}`)
  ];
  
  // Build content
  let content = `# ${subplot.name}\n\n`;
  content += `**Type:** ${subplot.type}\n\n`;
  content += `**Summary:** ${subplot.summary}\n\n`;
  
  if (subplot.focusCharacters && Object.keys(subplot.focusCharacters).length > 0) {
    content += `## Focus Characters\n\n`;
    for (const [role, char] of Object.entries(subplot.focusCharacters)) {
      if (typeof char === "string") {
        content += `- **${role}:** ${char}\n`;
      } else {
        content += `- **${role}:** ${char.name || char.id}\n`;
      }
    }
    content += "\n";
  }
  
  if (subplot.beats && subplot.beats.length > 0) {
    content += `## Narrative Beats\n\n`;
    
    // Sort by chapter
    const sortedBeats = [...subplot.beats].sort((a, b) => {
      return (a.chapter || "").localeCompare(b.chapter || "");
    });
    
    for (const beat of sortedBeats) {
      content += `### ${beat.title}\n\n`;
      if (beat.chapter) content += `**Chapter:** ${beat.chapter}\n\n`;
      if (beat.summary) content += `${beat.summary}\n\n`;
      if (beat.structurePosition) 
        content += `**Position:** ${beat.structurePosition}\n\n`;
      if (beat.characters && beat.characters.length > 0)
        content += `**Characters:** ${beat.characters.join(", ")}\n\n`;
    }
  }
  
  if (subplot.intersections && subplot.intersections.length > 0) {
    content += `## Plot Intersections\n\n`;
    for (const intersection of subplot.intersections) {
      content += `- **${intersection.targetSubplotId}**: ${intersection.summary}\n`;
      content += `  (Direction: ${intersection.influenceDirection})\n`;
    }
    content += "\n";
  }
  
  return {
    id: subplot.id,
    title: subplot.name,
    content,
    sourcePath: `src/subplots/${subplot.id}.ts`,
    tags,
    metadata: {
      type: "subplot",
      subplotType: subplot.type,
      importance: subplot.importance,
      beatCount: subplot.beats?.length || 0
    }
  };
}
```

## Testing

### New File: tests/rag/templates/subplot_test.ts

**Red Test Cases**:

```typescript
Deno.test("generates document with correct id and title", () => {
  const subplot = { id: "main_plot", name: "Main Plot" };
  const doc = generateSubplotDocument(subplot);
  
  assertEquals(doc.id, "main_plot");
  assertEquals(doc.title, "Main Plot");
  assertStringIncludes(doc.content, "# Main Plot");
});

Deno.test("includes all beats in chapter order", () => {
  const subplot = {
    id: "main",
    name: "Main",
    beats: [
      { id: "b2", title: "Act 2", chapter: "chapter_02" },
      { id: "b1", title: "Act 1", chapter: "chapter_01" }
    ]
  };
  
  const doc = generateSubplotDocument(subplot);
  
  // Should be sorted by chapter
  const b1Index = doc.content.indexOf("Act 1");
  const b2Index = doc.content.indexOf("Act 2");
  assert(b1Index < b2Index);
});

Deno.test("tags include type and status", () => {
  const subplot = {
    id: "sub",
    name: "Sub",
    type: "subplot",
    status: "in_progress"
  };
  
  const doc = generateSubplotDocument(subplot);
  
  assert(doc.tags.includes("type:subplot"));
  assert(doc.tags.includes("status:in_progress"));
});

Deno.test("intersections rendered as Markdown list", () => {
  const subplot = {
    id: "main",
    name: "Main",
    intersections: [
      {
        targetSubplotId: "romance",
        summary: "Hero meets love interest",
        influenceDirection: "forward"
      }
    ]
  };
  
  const doc = generateSubplotDocument(subplot);
  
  assertStringIncludes(doc.content, "Plot Intersections");
  assertStringIncludes(doc.content, "romance");
  assertStringIncludes(doc.content, "Hero meets love interest");
});

Deno.test("includes focus characters", () => {
  const subplot = {
    id: "main",
    name: "Main",
    focusCharacters: {
      "protagonist": "hero",
      "antagonist": "villain"
    }
  };
  
  const doc = generateSubplotDocument(subplot);
  
  assertStringIncludes(doc.content, "Focus Characters");
  assertStringIncludes(doc.content, "protagonist");
  assertStringIncludes(doc.content, "antagonist");
});
```

## Dependencies

- Requires: 09 (Subplot type), 54 (MCP resource), 55 (Prompts)
- Blocks: 59 (Integration test)

## Notes

- RAG ドキュメントは AI が検索可能な形式
- tags は RAG インデックス作成で使用
- metadata は型検索に使用

## Checklist

- [ ] Red tests pass
- [ ] src/rag/templates/subplot.ts 実装完了
- [ ] generateSubplotDocument 関数完了
- [ ] beats を chapter 順にソート
- [ ] tests/rag/templates/subplot_test.ts 実装完了
