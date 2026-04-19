# Process 56: HTML graph builder

## Overview

subplot を vis-network グラフで描画する builder。

**Title**: HTML graph builder  
**Estimated Story Points**: 5  
**Status**: Not Started

## Objectives

1. SubplotGraphBuilder 実装（GraphDataBuilder インターフェース）
2. ノード: subplot + beat
3. エッジ: preconditionBeatIds (実線) + PlotIntersection (点線)
4. 色分け: type 別（main=赤, subplot=青, parallel=緑, background=グレー）
5. 形状: structurePosition 別（setup=楕円, climax=星, resolution=菱形等）
6. Red テストで動作確認

## Acceptance Criteria

- [ ] クラス名は SubplotGraphBuilder
- [ ] GraphDataBuilder<readonly Subplot[]> インターフェース実装
- [ ] ノード: 各 Subplot + 各 PlotBeat
- [ ] エッジ: preconditionBeatIds（実線、矢印）
- [ ] エッジ: PlotIntersection（点線、方向付き矢印）
- [ ] Color: type 別マッピング
- [ ] Shape: structurePosition 別マッピング
- [ ] 統計情報: ノード数、エッジ数、type 別

## Implementation

### New File: src/application/view/graph/subplot_graph_builder.ts

**Reference**: src/application/view/graph/foreshadowing_graph_builder.ts (105行)

**Pseudocode**:

```
export class SubplotGraphBuilder implements GraphDataBuilder<readonly Subplot[]> {
  build(subplots: readonly Subplot[]): GraphData {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // 1. Create nodes for subplots and beats
    for (const subplot of subplots) {
      nodes.push({
        id: subplot.id,
        label: subplot.name,
        title: subplot.summary,
        color: this.getTypeColor(subplot.type),
        shape: "box",
        font: { size: 14, bold: true }
      });
      
      // Add beat nodes
      for (const beat of subplot.beats || []) {
        nodes.push({
          id: beat.id,
          label: beat.title,
          title: beat.summary,
          color: this.getPositionColor(beat.structurePosition),
          shape: this.getPositionShape(beat.structurePosition),
          font: { size: 12 }
        });
        
        // Edge from subplot to beat
        edges.push({
          from: subplot.id,
          to: beat.id,
          arrows: "to",
          color: { color: "#ccc" }
        });
      }
    }
    
    // 2. Create edges for preconditionBeatIds
    const beatMap = new Map();
    for (const subplot of subplots) {
      for (const beat of subplot.beats || []) {
        beatMap.set(beat.id, subplot.id);
      }
    }
    
    for (const subplot of subplots) {
      for (const beat of subplot.beats || []) {
        for (const preconditionId of beat.preconditionBeatIds || []) {
          edges.push({
            from: preconditionId,
            to: beat.id,
            arrows: "to",
            color: { color: "#333", width: 2 },
            smooth: { type: "continuous" }
          });
        }
      }
    }
    
    // 3. Create edges for PlotIntersections
    for (const subplot of subplots) {
      for (const intersection of subplot.intersections || []) {
        const arrowDir = 
          intersection.influenceDirection === "backward" ? "from" :
          intersection.influenceDirection === "bidirectional" ? "to;from" :
          "to";
        
        edges.push({
          from: intersection.sourceBeatId,
          to: intersection.targetBeatId,
          arrows: arrowDir,
          color: { color: "#ff6b6b" },
          dashes: true,
          title: intersection.summary
        });
      }
    }
    
    return { nodes, edges };
  }
  
  private getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      "main": "#e74c3c",
      "subplot": "#3498db",
      "parallel": "#2ecc71",
      "background": "#95a5a6"
    };
    return colors[type] || "#95a5a6";
  }
  
  private getPositionColor(position?: string): string {
    const colors: Record<string, string> = {
      "setup": "#ecf0f1",
      "inciting_incident": "#f39c12",
      "rising_action": "#e67e22",
      "climax": "#c0392b",
      "resolution": "#27ae60"
    };
    return colors[position || ""] || "#bdc3c7";
  }
  
  private getPositionShape(position?: string): string {
    const shapes: Record<string, string> = {
      "setup": "ellipse",
      "inciting_incident": "diamond",
      "rising_action": "box",
      "climax": "star",
      "resolution": "diamond"
    };
    return shapes[position || ""] || "box";
  }
  
  getStatistics(data: GraphData): GraphStatistics {
    return {
      nodeCount: data.nodes.length,
      edgeCount: data.edges.length,
      beatCount: data.nodes.filter(n => n.id.includes("beat")).length,
      subplotCount: data.nodes.filter(n => !n.id.includes("beat")).length
    };
  }
}
```

## Testing

### New File: tests/application/view/graph/subplot_graph_builder_test.ts

**Red Test Cases**:

```typescript
Deno.test("builds nodes for each subplot and beat", () => {
  const subplots = [
    {
      id: "main_plot",
      name: "Main Plot",
      beats: [
        { id: "beat_1", title: "Setup", structurePosition: "setup" },
        { id: "beat_2", title: "Climax", structurePosition: "climax" }
      ]
    }
  ];
  
  const data = builder.build(subplots);
  assertEquals(data.nodes.length, 3);
});

Deno.test("creates edges for preconditionBeatIds", () => {
  const subplots = [
    {
      id: "main_plot",
      name: "Main",
      beats: [
        { id: "beat_1", title: "Setup", preconditionBeatIds: [] },
        { id: "beat_2", title: "Climax", preconditionBeatIds: ["beat_1"] }
      ]
    }
  ];
  
  const data = builder.build(subplots);
  const preconditionEdges = data.edges.filter(e => 
    e.from === "beat_1" && e.to === "beat_2"
  );
  assertEquals(preconditionEdges.length, 1);
});

Deno.test("creates dotted edges for intersections", () => {
  const subplots = [
    {
      id: "subplot_1",
      beats: [{ id: "beat_1", title: "B1" }],
      intersections: [
        {
          sourceBeatId: "beat_1",
          targetBeatId: "beat_2",
          influenceDirection: "forward",
          summary: "merge"
        }
      ]
    },
    {
      id: "subplot_2",
      beats: [{ id: "beat_2", title: "B2" }]
    }
  ];
  
  const data = builder.build(subplots);
  const intersectionEdges = data.edges.filter(e => e.dashes);
  assertEquals(intersectionEdges.length, 1);
});

Deno.test("applies type-specific colors", () => {
  const subplots = [
    { id: "main", name: "Main", type: "main" },
    { id: "sub", name: "Sub", type: "subplot" }
  ];
  
  const data = builder.build(subplots);
  const mainNode = data.nodes.find(n => n.id === "main");
  const subNode = data.nodes.find(n => n.id === "sub");
  
  assertEquals(mainNode?.color, "#e74c3c");
  assertEquals(subNode?.color, "#3498db");
});

Deno.test("applies structurePosition shapes", () => {
  const subplots = [
    {
      id: "main",
      beats: [
        { id: "beat_setup", structurePosition: "setup" },
        { id: "beat_climax", structurePosition: "climax" }
      ]
    }
  ];
  
  const data = builder.build(subplots);
  const setupNode = data.nodes.find(n => n.id === "beat_setup");
  const climaxNode = data.nodes.find(n => n.id === "beat_climax");
  
  assertEquals(setupNode?.shape, "ellipse");
  assertEquals(climaxNode?.shape, "star");
});
```

## Dependencies

- Requires: 09 (Subplot type), 54 (MCP resource)
- Blocks: 57 (HTML view browser integration), 59 (Integration test)

## Notes

- vis-network グラフライブラリを使用
- ノード は subplot と beat を分離
- エッジは precondition と intersection 両方を描画
- 色と形状はナレーション構造を視覚的に表現

## Checklist

- [ ] Red tests pass
- [ ] src/application/view/graph/subplot_graph_builder.ts 実装完了
- [ ] GraphDataBuilder インターフェース実装
- [ ] getStatistics メソッド実装
- [ ] tests/application/view/graph/subplot_graph_builder_test.ts 実装完了
