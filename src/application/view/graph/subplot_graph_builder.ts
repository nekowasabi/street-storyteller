import type { GraphDataBuilder } from "./graph_data_builder.ts";
import type { VisEdge, VisGraphData, VisNode } from "./vis_types.ts";
import type {
  BeatStructurePosition,
  PlotBeat,
  Subplot,
  SubplotType,
} from "@storyteller/types/v2/subplot.ts";

const TYPE_COLORS: Record<SubplotType, string> = {
  main: "#e74c3c",
  subplot: "#3498db",
  parallel: "#27ae60",
  background: "#95a5a6",
};

const POSITION_SHAPES: Record<BeatStructurePosition, VisNode["shape"]> = {
  setup: "ellipse",
  rising: "box",
  climax: "star",
  falling: "box",
  resolution: "diamond",
};

export class SubplotGraphBuilder
  implements GraphDataBuilder<readonly Subplot[]> {
  build(subplots: readonly Subplot[]): VisGraphData {
    if (subplots.length === 0) {
      return { nodes: [], edges: [] };
    }

    const nodes: VisNode[] = [];
    const edges: VisEdge[] = [];
    const beatMap = new Map<string, { beat: PlotBeat; subplotId: string }>();

    for (const subplot of subplots) {
      nodes.push({
        id: subplot.id,
        label: subplot.name,
        title: `${subplot.name}\n${subplot.summary}\nType: ${subplot.type}`,
        shape: "box",
        color: {
          background: TYPE_COLORS[subplot.type],
          border: "#2c3e50",
        },
      });

      for (const beat of subplot.beats ?? []) {
        beatMap.set(beat.id, { beat, subplotId: subplot.id });

        nodes.push({
          id: beat.id,
          label: beat.title,
          title: `${beat.title}\n${
            beat.summary ?? ""
          }\nPosition: ${beat.structurePosition}`,
          shape: POSITION_SHAPES[beat.structurePosition] ?? "dot",
          color: {
            background: TYPE_COLORS[subplot.type],
            border: "#2c3e50",
          },
        });

        edges.push({
          from: subplot.id,
          to: beat.id,
          arrows: "to",
          color: { color: "#ccc" },
          width: 1,
        });
      }
    }

    for (const subplot of subplots) {
      for (const beat of subplot.beats ?? []) {
        for (const preId of beat.preconditionBeatIds ?? []) {
          if (beatMap.has(preId)) {
            edges.push({
              from: preId,
              to: beat.id,
              arrows: "to",
              color: { color: "#34495e" },
              width: 2,
            });
          }
        }
      }

      for (const ix of subplot.intersections ?? []) {
        edges.push({
          from: ix.sourceBeatId,
          to: ix.targetBeatId,
          dashes: true,
          arrows: "to",
          color: { color: "#7f8c8d" },
          width: 1,
          label: ix.summary,
        });
      }
    }

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
}
