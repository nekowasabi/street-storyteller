// src/application/view/graph/summary_adapters.ts
/**
 * Summary型からグラフビルダーが使用する型への変換アダプター
 *
 * ProjectAnalysisはSummary型を使用するが、グラフビルダーはv2型を想定している。
 * このモジュールはSummary型から直接グラフデータを構築する関数を提供する。
 */

import type { VisEdge, VisGraphData, VisNode } from "./vis_types.ts";
import type {
  CharacterSummary,
  EventSummary,
  ForeshadowingSummary,
  TimelineSummary,
} from "../project_analyzer.ts";

/** 関係タイプ別のエッジ色 */
const RELATION_COLORS: Record<string, string> = {
  ally: "#27ae60", // 緑
  enemy: "#e74c3c", // 赤
  neutral: "#95a5a6", // グレー
  romantic: "#e91e63", // ピンク
  respect: "#3498db", // 青
  competitive: "#f39c12", // オレンジ
  mentor: "#9b59b6", // 紫
};

/** イベントカテゴリ別の色 */
const CATEGORY_COLORS: Record<string, string> = {
  plot_point: "#3498db", // 青
  character_event: "#27ae60", // 緑
  world_event: "#9b59b6", // 紫
  backstory: "#95a5a6", // グレー
  foreshadow: "#f39c12", // オレンジ
  climax: "#e74c3c", // 赤
  resolution: "#1abc9c", // ターコイズ
};

/** ステータス別の色 */
const STATUS_COLORS: Record<string, string> = {
  planted: "#f39c12", // オレンジ
  partially_resolved: "#f1c40f", // 黄色
  resolved: "#27ae60", // 緑
  abandoned: "#95a5a6", // グレー
};

/** タイプ別の形状 */
const TYPE_SHAPES: Record<string, VisNode["shape"]> = {
  hint: "dot",
  prophecy: "star",
  mystery: "triangle",
  symbol: "ellipse",
  chekhov: "diamond",
  red_herring: "box",
};

/**
 * CharacterSummary配列からグラフデータを構築する
 */
export function buildCharacterGraphFromSummary(
  characters: readonly CharacterSummary[],
): VisGraphData {
  if (characters.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: VisNode[] = characters.map((char) => ({
    id: char.id,
    label: char.name,
    group: char.role,
    title: `${char.name}\n${char.summary || ""}`,
  }));

  const edgeMap = new Map<string, VisEdge>();
  for (const char of characters) {
    if (char.relationships) {
      for (
        const [targetId, relationType] of Object.entries(char.relationships)
      ) {
        const key = [char.id, targetId].sort().join("-");
        if (!edgeMap.has(key)) {
          edgeMap.set(key, {
            from: char.id,
            to: targetId,
            label: relationType,
            color: { color: RELATION_COLORS[relationType] || "#95a5a6" },
            width: 2,
          });
        }
      }
    }
  }

  return {
    nodes,
    edges: [...edgeMap.values()],
    options: {
      nodes: { shape: "dot", font: { size: 14 } },
      edges: { smooth: { type: "curvedCW" } },
      physics: { stabilization: { iterations: 100 } },
      interaction: { hover: true, tooltipDelay: 200 },
    },
  };
}

/**
 * TimelineSummary配列からグラフデータを構築する
 */
export function buildTimelineGraphFromSummary(
  timelines: readonly TimelineSummary[],
): VisGraphData {
  const allEvents: EventSummary[] = timelines.flatMap((t) => t.events);

  if (allEvents.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: VisNode[] = allEvents.map((event) => ({
    id: event.id,
    label: event.title,
    title: `${event.title}\n${event.summary || ""}\nOrder: ${event.order}`,
    group: event.category,
    color: {
      background: CATEGORY_COLORS[event.category] || "#95a5a6",
      border: "#2c3e50",
    },
  }));

  const edges: VisEdge[] = [];
  const eventIds = new Set(allEvents.map((e) => e.id));

  for (const event of allEvents) {
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
 * ForeshadowingSummary配列からグラフデータを構築する
 */
export function buildForeshadowingGraphFromSummary(
  foreshadowings: readonly ForeshadowingSummary[],
): VisGraphData {
  if (foreshadowings.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes: VisNode[] = foreshadowings.map((f) => ({
    id: f.id,
    label: f.name,
    title: `${f.name}\n${f.summary || ""}\nStatus: ${f.status}`,
    shape: TYPE_SHAPES[f.type] || "dot",
    color: {
      background: STATUS_COLORS[f.status] || "#95a5a6",
      border: "#2c3e50",
    },
  }));

  // ForeshadowingSummaryには relatedForeshadowings がないため、エッジは生成しない
  // 必要であれば、将来的にForeshadowingSummaryを拡張する

  return {
    nodes,
    edges: [],
    options: {
      nodes: { font: { size: 12 } },
      edges: { smooth: true },
      physics: { enabled: true },
      interaction: { hover: true },
    },
  };
}
