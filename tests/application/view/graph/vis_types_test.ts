// tests/application/view/graph/vis_types_test.ts
import { assertEquals, assertExists } from "@std/assert";
import {
  VIS_CDN_LINKS,
  type VisEdge,
  type VisGraphData,
  type VisNode,
  type VisOptions,
} from "@storyteller/application/view/graph/vis_types.ts";

Deno.test("vis_types - CDN links", async (t) => {
  await t.step("VIS_CDN_LINKSが定義されている", () => {
    assertExists(VIS_CDN_LINKS);
    assertExists(VIS_CDN_LINKS.network);
    assertExists(VIS_CDN_LINKS.css);
  });

  await t.step("CDNリンクがhttpsで始まる", () => {
    assertEquals(VIS_CDN_LINKS.network.startsWith("https://"), true);
    assertEquals(VIS_CDN_LINKS.css.startsWith("https://"), true);
  });
});

Deno.test("vis_types - Node型", async (t) => {
  await t.step("VisNode型が正しく構成できる", () => {
    const node: VisNode = {
      id: "hero",
      label: "勇者",
      group: "protagonist",
    };
    assertEquals(node.id, "hero");
    assertEquals(node.label, "勇者");
    assertEquals(node.group, "protagonist");
  });

  await t.step("VisNode型にオプショナルプロパティを設定できる", () => {
    const node: VisNode = {
      id: "villain",
      label: "魔王",
      title: "敵役のキャラクター",
      color: {
        background: "#e74c3c",
        border: "#c0392b",
      },
      shape: "diamond",
    };
    assertEquals(node.title, "敵役のキャラクター");
    assertEquals(node.color?.background, "#e74c3c");
    assertEquals(node.shape, "diamond");
  });
});

Deno.test("vis_types - Edge型", async (t) => {
  await t.step("VisEdge型が正しく構成できる", () => {
    const edge: VisEdge = {
      from: "hero",
      to: "villain",
      label: "enemy",
    };
    assertEquals(edge.from, "hero");
    assertEquals(edge.to, "villain");
    assertEquals(edge.label, "enemy");
  });

  await t.step("VisEdge型にオプショナルプロパティを設定できる", () => {
    const edge: VisEdge = {
      from: "hero",
      to: "mentor",
      arrows: "to",
      dashes: true,
      color: {
        color: "#3498db",
        highlight: "#2980b9",
      },
      width: 3,
    };
    assertEquals(edge.arrows, "to");
    assertEquals(edge.dashes, true);
    assertEquals(edge.width, 3);
  });
});

Deno.test("vis_types - Options型", async (t) => {
  await t.step("VisOptions型が正しく構成できる", () => {
    const options: VisOptions = {
      nodes: {
        shape: "dot",
        font: { size: 14 },
      },
      edges: {
        smooth: true,
      },
      physics: {
        enabled: true,
        stabilization: { iterations: 100 },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
      },
    };
    assertEquals(options.nodes?.shape, "dot");
    assertEquals(options.physics?.enabled, true);
    assertEquals(options.interaction?.hover, true);
  });
});

Deno.test("vis_types - GraphData型", async (t) => {
  await t.step("VisGraphData型が正しく構成できる", () => {
    const graphData: VisGraphData = {
      nodes: [
        { id: "hero", label: "勇者" },
        { id: "villain", label: "魔王" },
      ],
      edges: [
        { from: "hero", to: "villain", label: "enemy" },
      ],
    };
    assertEquals(graphData.nodes.length, 2);
    assertEquals(graphData.edges.length, 1);
  });

  await t.step("VisGraphData型にオプションを設定できる", () => {
    const graphData: VisGraphData = {
      nodes: [],
      edges: [],
      options: {
        physics: { enabled: false },
      },
    };
    assertEquals(graphData.options?.physics?.enabled, false);
  });
});
