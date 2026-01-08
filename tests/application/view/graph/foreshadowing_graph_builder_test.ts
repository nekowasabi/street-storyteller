// tests/application/view/graph/foreshadowing_graph_builder_test.ts
import { assertEquals, assertExists } from "@std/assert";
import { ForeshadowingGraphBuilder } from "@storyteller/application/view/graph/foreshadowing_graph_builder.ts";
import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

const mockForeshadowings: readonly Foreshadowing[] = [
  {
    id: "sword",
    name: "古びた剣",
    type: "chekhov",
    summary: "床板の下の剣",
    planting: { chapter: "chapter_01", description: "発見" },
    status: "resolved",
    resolutions: [{
      chapter: "chapter_10",
      description: "使用",
      completeness: 1.0,
    }],
  },
  {
    id: "prophecy",
    name: "予言",
    type: "prophecy",
    summary: "王国の運命",
    planting: { chapter: "chapter_02", description: "告げられる" },
    status: "planted",
    relations: {
      characters: ["hero"],
      settings: [],
      relatedForeshadowings: ["sword"],
    },
  },
];

Deno.test("ForeshadowingGraphBuilder - フローグラフ生成", async (t) => {
  const builder = new ForeshadowingGraphBuilder();

  await t.step("伏線がノードに変換される", () => {
    const result = builder.build(mockForeshadowings);
    assertEquals(result.nodes.length, 2);
  });

  await t.step("ステータス別にノード色が設定される", () => {
    const result = builder.build(mockForeshadowings);
    const resolvedNode = result.nodes.find((n) => n.id === "sword");
    const plantedNode = result.nodes.find((n) => n.id === "prophecy");
    // resolved=緑, planted=オレンジ
    assertEquals(resolvedNode?.color?.background, "#27ae60");
    assertEquals(plantedNode?.color?.background, "#f39c12");
  });

  await t.step("relatedForeshadowingsからエッジが生成される", () => {
    const result = builder.build(mockForeshadowings);
    const edge = result.edges.find((e) =>
      e.from === "prophecy" && e.to === "sword"
    );
    assertExists(edge);
  });

  await t.step("タイプ別にノード形状が設定される", () => {
    const result = builder.build(mockForeshadowings);
    const chekhovNode = result.nodes.find((n) => n.id === "sword");
    const prophecyNode = result.nodes.find((n) => n.id === "prophecy");
    assertEquals(chekhovNode?.shape, "diamond");
    assertEquals(prophecyNode?.shape, "star");
  });

  await t.step("空配列の場合は空グラフを返す", () => {
    const result = builder.build([]);
    assertEquals(result.nodes.length, 0);
    assertEquals(result.edges.length, 0);
  });

  await t.step("ノードにタイトル（ツールチップ）が設定される", () => {
    const result = builder.build(mockForeshadowings);
    const node = result.nodes.find((n) => n.id === "sword");
    assertExists(node?.title);
    assertEquals(node?.title?.includes("古びた剣"), true);
    assertEquals(node?.title?.includes("resolved"), true);
  });

  await t.step("partially_resolved ステータスは黄色", () => {
    const partialForeshadowing: readonly Foreshadowing[] = [
      {
        id: "partial",
        name: "部分的伏線",
        type: "hint",
        summary: "一部回収",
        planting: { chapter: "chapter_01", description: "" },
        status: "partially_resolved",
      },
    ];
    const result = builder.build(partialForeshadowing);
    const node = result.nodes.find((n) => n.id === "partial");
    assertEquals(node?.color?.background, "#f1c40f");
  });

  await t.step("abandoned ステータスはグレー", () => {
    const abandonedForeshadowing: readonly Foreshadowing[] = [
      {
        id: "abandoned",
        name: "放棄された伏線",
        type: "hint",
        summary: "回収されなかった",
        planting: { chapter: "chapter_01", description: "" },
        status: "abandoned",
      },
    ];
    const result = builder.build(abandonedForeshadowing);
    const node = result.nodes.find((n) => n.id === "abandoned");
    assertEquals(node?.color?.background, "#95a5a6");
  });

  await t.step("存在しない関連伏線へのエッジは生成されない", () => {
    const invalidRefForeshadowing: readonly Foreshadowing[] = [
      {
        id: "invalid",
        name: "不正参照",
        type: "hint",
        summary: "",
        planting: { chapter: "chapter_01", description: "" },
        status: "planted",
        relations: {
          characters: [],
          settings: [],
          relatedForeshadowings: ["nonexistent"],
        },
      },
    ];
    const result = builder.build(invalidRefForeshadowing);
    assertEquals(result.edges.length, 0);
  });
});
