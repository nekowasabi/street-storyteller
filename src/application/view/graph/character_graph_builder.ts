// src/application/view/graph/character_graph_builder.ts
import type { GraphDataBuilder } from "./graph_data_builder.ts";
import type { VisEdge, VisGraphData, VisNode } from "./vis_types.ts";
import type {
  Character,
  RelationType,
} from "@storyteller/types/v2/character.ts";

/** 関係タイプ別のエッジ色 */
const RELATION_COLORS: Record<RelationType, string> = {
  ally: "#27ae60", // 緑
  enemy: "#e74c3c", // 赤
  neutral: "#95a5a6", // グレー
  romantic: "#e91e63", // ピンク
  respect: "#3498db", // 青
  competitive: "#f39c12", // オレンジ
  mentor: "#9b59b6", // 紫
};

/**
 * キャラクター関係グラフビルダー
 *
 * キャラクター間の関係性をvis.jsグラフデータに変換する
 */
export class CharacterGraphBuilder
  implements GraphDataBuilder<readonly Character[]> {
  /**
   * キャラクター配列からグラフデータを構築する
   * @param characters キャラクター配列
   * @returns vis.js互換のグラフデータ
   */
  build(characters: readonly Character[]): VisGraphData {
    if (characters.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes = this.buildNodes(characters);
    const edges = this.buildEdges(characters);

    return {
      nodes,
      edges,
      options: {
        nodes: { shape: "dot", font: { size: 14 } },
        edges: { smooth: { type: "curvedCW" } },
        physics: { stabilization: { iterations: 100 } },
        interaction: { hover: true, tooltipDelay: 200 },
      },
    };
  }

  /**
   * キャラクターからノードを構築する
   */
  private buildNodes(characters: readonly Character[]): readonly VisNode[] {
    return characters.map((char) => ({
      id: char.id,
      label: char.name,
      group: char.role,
      title: `${char.name}\n${char.summary}`,
    }));
  }

  /**
   * キャラクター間の関係からエッジを構築する
   * 双方向の関係は1つのエッジにまとめる
   */
  private buildEdges(characters: readonly Character[]): readonly VisEdge[] {
    const edgeMap = new Map<string, VisEdge>();

    for (const char of characters) {
      for (
        const [targetId, relationType] of Object.entries(char.relationships)
      ) {
        // 双方向エッジを1つにまとめる（辞書順でキーを作成）
        const key = [char.id, targetId].sort().join("-");

        if (!edgeMap.has(key)) {
          edgeMap.set(key, {
            from: char.id,
            to: targetId,
            label: relationType,
            color: {
              color: RELATION_COLORS[relationType as RelationType] || "#95a5a6",
            },
            width: 2,
          });
        }
      }
    }

    return [...edgeMap.values()];
  }
}
