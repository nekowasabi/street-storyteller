// src/application/view/graph/foreshadowing_graph_builder.ts
import type { GraphDataBuilder } from "./graph_data_builder.ts";
import type { VisEdge, VisGraphData, VisNode } from "./vis_types.ts";
import type {
  Foreshadowing,
  ForeshadowingStatus,
  ForeshadowingType,
} from "@storyteller/types/v2/foreshadowing.ts";

/** ステータス別の色 */
const STATUS_COLORS: Record<ForeshadowingStatus, string> = {
  planted: "#f39c12", // オレンジ
  partially_resolved: "#f1c40f", // 黄色
  resolved: "#27ae60", // 緑
  abandoned: "#95a5a6", // グレー
};

/** タイプ別の形状 */
const TYPE_SHAPES: Record<ForeshadowingType, VisNode["shape"]> = {
  hint: "dot",
  prophecy: "star",
  mystery: "triangle",
  symbol: "ellipse",
  chekhov: "diamond",
  red_herring: "box",
};

/**
 * 伏線フローグラフビルダー
 *
 * 伏線間の関連性をvis.jsグラフデータに変換する
 */
export class ForeshadowingGraphBuilder
  implements GraphDataBuilder<readonly Foreshadowing[]> {
  /**
   * 伏線配列からグラフデータを構築する
   * @param foreshadowings 伏線配列
   * @returns vis.js互換のグラフデータ
   */
  build(foreshadowings: readonly Foreshadowing[]): VisGraphData {
    if (foreshadowings.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes = this.buildNodes(foreshadowings);
    const edges = this.buildEdges(foreshadowings);

    return {
      nodes,
      edges,
      options: {
        nodes: { font: { size: 12 } },
        edges: { smooth: true },
        physics: { enabled: true },
        interaction: { hover: true },
      },
    };
  }

  /**
   * 伏線からノードを構築する
   */
  private buildNodes(
    foreshadowings: readonly Foreshadowing[],
  ): readonly VisNode[] {
    return foreshadowings.map((f) => ({
      id: f.id,
      label: f.name,
      title: `${f.name}\n${f.summary}\nStatus: ${f.status}`,
      shape: TYPE_SHAPES[f.type] || "dot",
      color: {
        background: STATUS_COLORS[f.status],
        border: "#2c3e50",
      },
    }));
  }

  /**
   * 伏線間の関連からエッジを構築する
   * relatedForeshadowingsプロパティからエッジを生成
   */
  private buildEdges(
    foreshadowings: readonly Foreshadowing[],
  ): readonly VisEdge[] {
    const edges: VisEdge[] = [];
    const fIds = new Set(foreshadowings.map((f) => f.id));

    for (const f of foreshadowings) {
      const related = f.relations?.relatedForeshadowings || [];
      for (const targetId of related) {
        if (fIds.has(targetId)) {
          edges.push({
            from: f.id,
            to: targetId,
            dashes: true,
            color: { color: "#7f8c8d" },
            width: 1,
          });
        }
      }
    }

    return edges;
  }
}
