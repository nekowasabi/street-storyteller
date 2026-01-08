// src/application/view/graph/timeline_graph_builder.ts
import type { GraphDataBuilder } from "./graph_data_builder.ts";
import type { VisEdge, VisGraphData, VisNode } from "./vis_types.ts";
import type {
  EventCategory,
  Timeline,
  TimelineEvent,
} from "@storyteller/types/v2/timeline.ts";

/** イベントカテゴリ別の色 */
const CATEGORY_COLORS: Record<EventCategory, string> = {
  plot_point: "#3498db", // 青
  character_event: "#27ae60", // 緑
  world_event: "#9b59b6", // 紫
  backstory: "#95a5a6", // グレー
  foreshadow: "#f39c12", // オレンジ
  climax: "#e74c3c", // 赤
  resolution: "#1abc9c", // ターコイズ
};

/**
 * タイムライン因果関係グラフビルダー
 *
 * タイムラインのイベント間の因果関係をvis.jsグラフデータに変換する
 */
export class TimelineGraphBuilder
  implements GraphDataBuilder<readonly Timeline[]> {
  /**
   * タイムライン配列からグラフデータを構築する
   * @param timelines タイムライン配列
   * @returns vis.js互換のグラフデータ
   */
  build(timelines: readonly Timeline[]): VisGraphData {
    const allEvents = timelines.flatMap((t) => t.events);

    if (allEvents.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes = this.buildNodes(allEvents);
    const edges = this.buildEdges(allEvents);

    return {
      nodes,
      edges,
      options: {
        nodes: { shape: "box", font: { size: 12 } },
        edges: { smooth: { type: "cubicBezier" } },
        physics: { enabled: true },
        interaction: { hover: true },
      },
    };
  }

  /**
   * イベントからノードを構築する
   */
  private buildNodes(events: readonly TimelineEvent[]): readonly VisNode[] {
    return events.map((event) => ({
      id: event.id,
      label: event.title,
      title: `${event.title}\n${event.summary}\nTime: ${event.time.order}`,
      group: event.category,
      color: {
        background: CATEGORY_COLORS[event.category] || "#95a5a6",
        border: "#2c3e50",
      },
    }));
  }

  /**
   * イベント間の因果関係からエッジを構築する
   * causesプロパティから順方向のエッジを生成
   */
  private buildEdges(events: readonly TimelineEvent[]): readonly VisEdge[] {
    const edges: VisEdge[] = [];
    const eventIds = new Set(events.map((e) => e.id));

    for (const event of events) {
      // causesから順方向エッジを生成
      if (event.causes) {
        for (const targetId of event.causes) {
          if (eventIds.has(targetId)) {
            edges.push({
              from: event.id,
              to: targetId,
              arrows: "to",
              color: { color: "#34495e" },
              width: 2,
            });
          }
        }
      }
    }

    return edges;
  }
}
