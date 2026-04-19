# Process 57: HTML view browser 統合

## Overview

storyteller view browser コマンドで subplot グラフを表示。

**Title**: HTML view browser 統合  
**Estimated Story Points**: 4  
**Status**: Not Started

## Objectives

1. HTML generator に SubplotGraphBuilder 統合
2. browser HTML に Subplots タブ追加
3. subplot 統計情報表示
4. グラフビジュアライゼーション表示
5. Red テストで動作確認

## Acceptance Criteria

- [ ] HTML に Subplots タブ表示
- [ ] 統計情報: 総数, type 別, status 別, intersection 数
- [ ] subplot カード表示: name, type, focusCharacters, beats 数, intersections 数
- [ ] クリックで個別 subplot グラフ表示
- [ ] view_browser MCP ツール更新

## Implementation

### Modified File: src/application/view/html_generator.ts

**Changes**:
- Import SubplotGraphBuilder
- Add generateSubplotSection() method
- Add generateSubplotCards() method
- Add generateSubplotGraph() method
- Integrate subplot section into main HTML generation

**Pseudocode**:

```
export class HtmlGenerator {
  async generate(...): string {
    // existing code...
    
    let html = this.generateHeader();
    html += this.generateCharactersTab();
    html += this.generateSettingsTab();
    html += this.generateForeshadowingsTab();
    html += this.generateSubplotsTab();  // NEW
    html += this.generateFooter();
    return html;
  }
  
  private generateSubplotsTab(): string {
    const subplots = this.getSubplots();
    
    let html = '<div id="subplots-tab" class="tab-content">';
    html += '<h2>Subplots</h2>';
    
    // Statistics
    html += '<div class="statistics">';
    html += `<div>Total: ${subplots.length}</div>`;
    
    const byType = groupBy(subplots, 'type');
    for (const [type, items] of byType) {
      html += `<div>${type}: ${items.length}</div>`;
    }
    
    const intersectionCount = subplots.reduce((sum, s) => 
      sum + (s.intersections?.length || 0), 0);
    html += `<div>Intersections: ${intersectionCount}</div>`;
    html += '</div>';
    
    // Subplot cards
    html += this.generateSubplotCards(subplots);
    
    // Graph visualization
    html += this.generateSubplotGraph(subplots);
    
    html += '</div>';
    return html;
  }
  
  private generateSubplotCards(subplots: Subplot[]): string {
    let html = '<div class="subplot-cards">';
    for (const subplot of subplots) {
      html += `
        <div class="card subplot-card" data-id="${subplot.id}">
          <h3>${subplot.name}</h3>
          <p><strong>Type:</strong> ${subplot.type}</p>
          <p><strong>Summary:</strong> ${subplot.summary}</p>
          <p><strong>Beats:</strong> ${subplot.beats?.length || 0}</p>
          <p><strong>Intersections:</strong> ${subplot.intersections?.length || 0}</p>
          ${subplot.focusCharacters ? 
            `<p><strong>Focus:</strong> ${Object.keys(subplot.focusCharacters).join(", ")}</p>` 
            : ""}
        </div>
      `;
    }
    html += '</div>';
    return html;
  }
  
  private generateSubplotGraph(subplots: Subplot[]): string {
    const builder = new SubplotGraphBuilder();
    const graphData = builder.build(subplots);
    
    const graphId = "subplot-graph";
    let html = `<div id="${graphId}" style="height: 700px;"></div>`;
    html += `<script>
      var nodes = new vis.DataSet(${JSON.stringify(graphData.nodes)});
      var edges = new vis.DataSet(${JSON.stringify(graphData.edges)});
      var data = { nodes: nodes, edges: edges };
      var options = { physics: { enabled: true } };
      var network = new vis.Network(
        document.getElementById("${graphId}"),
        data,
        options
      );
    </script>`;
    return html;
  }
}
```

### Modified File: src/mcp/tools/definitions/view_browser.ts

**Changes**:
- Ensure subplot section is included in generated HTML
- Update execute method to call updated HtmlGenerator
- No new tab toggle needed (HtmlGenerator handles it)

## Testing

### New File: tests/application/view/html_generator_subplot_test.ts

**Red Test Cases**:

```typescript
Deno.test("renders subplot tab in HTML output", async () => {
  const generator = new HtmlGenerator();
  const html = await generator.generate({
    subplots: [{ id: "main", name: "Main Plot", type: "main" }]
  });
  assertStringIncludes(html, "Subplots");
  assertStringIncludes(html, "subplots-tab");
});

Deno.test("displays subplot statistics", async () => {
  const generator = new HtmlGenerator();
  const html = await generator.generate({
    subplots: [
      { id: "main", name: "Main", type: "main" },
      { id: "sub", name: "Sub", type: "subplot" }
    ]
  });
  assertStringIncludes(html, "Total: 2");
  assertStringIncludes(html, "main: 1");
});

Deno.test("renders subplot graph using SubplotGraphBuilder", async () => {
  const generator = new HtmlGenerator();
  const html = await generator.generate({
    subplots: [{ id: "main", name: "Main", beats: [] }]
  });
  assertStringIncludes(html, "subplot-graph");
  assertStringIncludes(html, "vis.Network");
});

Deno.test("includes subplot cards with details", async () => {
  const generator = new HtmlGenerator();
  const html = await generator.generate({
    subplots: [
      {
        id: "main",
        name: "Main Plot",
        type: "main",
        summary: "Main story arc",
        beats: [{ id: "b1" }],
        intersections: [{ id: "i1" }]
      }
    ]
  });
  assertStringIncludes(html, "Main Plot");
  assertStringIncludes(html, "main story arc");
  assertStringIncludes(html, "Beats: 1");
  assertStringIncludes(html, "Intersections: 1");
});
```

## Dependencies

- Requires: 56 (SubplotGraphBuilder)
- Blocks: 59 (Integration test)

## Notes

- HTML タブはタブ UI で切り替え可能
- グラフは vis-network を使用（cinderella と統一）
- 統計情報は type/status で集計

## Checklist

- [ ] Red tests pass
- [ ] src/application/view/html_generator.ts 修正完了
- [ ] Subplots タブ生成機能実装
- [ ] サブプロット統計情報表示
- [ ] vis-network グラフビジュアライゼーション
- [ ] tests/application/view/html_generator_subplot_test.ts 実装完了
