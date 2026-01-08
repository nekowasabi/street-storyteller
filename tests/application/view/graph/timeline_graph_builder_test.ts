// tests/application/view/graph/timeline_graph_builder_test.ts
import { assertEquals, assertExists } from "@std/assert";
import { TimelineGraphBuilder } from "@storyteller/application/view/graph/timeline_graph_builder.ts";
import type { Timeline } from "@storyteller/types/v2/timeline.ts";

const mockTimeline: Timeline = {
  id: "main",
  name: "メインストーリー",
  scope: "story",
  summary: "物語の主軸",
  events: [
    {
      id: "event_01",
      title: "王国の滅亡",
      category: "plot_point",
      time: { order: 1 },
      summary: "始まりの事件",
      characters: ["hero"],
      settings: ["kingdom"],
      chapters: ["chapter_01"],
      causes: ["event_02"],
    },
    {
      id: "event_02",
      title: "勇者の旅立ち",
      category: "character_event",
      time: { order: 2 },
      summary: "冒険の開始",
      characters: ["hero"],
      settings: ["village"],
      chapters: ["chapter_02"],
      causedBy: ["event_01"],
      causes: ["event_03"],
    },
    {
      id: "event_03",
      title: "魔王との対決",
      category: "climax",
      time: { order: 3 },
      summary: "最終決戦",
      characters: ["hero", "villain"],
      settings: ["castle"],
      chapters: ["chapter_10"],
      causedBy: ["event_02"],
    },
  ],
};

Deno.test("TimelineGraphBuilder - 因果関係グラフ生成", async (t) => {
  const builder = new TimelineGraphBuilder();

  await t.step("イベントがノードに変換される", () => {
    const result = builder.build([mockTimeline]);
    assertEquals(result.nodes.length, 3);
  });

  await t.step("causes関係から矢印エッジが生成される", () => {
    const result = builder.build([mockTimeline]);
    const edge = result.edges.find((e) =>
      e.from === "event_01" && e.to === "event_02"
    );
    assertExists(edge);
    assertEquals(edge?.arrows, "to");
  });

  await t.step("カテゴリ別にノードの色が設定される", () => {
    const result = builder.build([mockTimeline]);
    const climaxNode = result.nodes.find((n) => n.id === "event_03");
    assertExists(climaxNode?.color?.background);
  });

  await t.step("時系列順にノードが並ぶ（オプション設定）", () => {
    const result = builder.build([mockTimeline]);
    assertExists(result.options);
  });

  await t.step("空タイムラインでは空グラフを返す", () => {
    const emptyTimeline: Timeline = {
      id: "empty",
      name: "空タイムライン",
      scope: "story",
      summary: "",
      events: [],
    };
    const result = builder.build([emptyTimeline]);
    assertEquals(result.nodes.length, 0);
    assertEquals(result.edges.length, 0);
  });

  await t.step("複数タイムラインのイベントを結合する", () => {
    const secondTimeline: Timeline = {
      id: "sub",
      name: "サブストーリー",
      scope: "arc",
      summary: "サブプロット",
      events: [
        {
          id: "sub_01",
          title: "サブイベント",
          category: "world_event",
          time: { order: 1 },
          summary: "補足",
          characters: [],
          settings: [],
          chapters: [],
        },
      ],
    };
    const result = builder.build([mockTimeline, secondTimeline]);
    assertEquals(result.nodes.length, 4);
  });

  await t.step("ノードにタイトル（ツールチップ）が設定される", () => {
    const result = builder.build([mockTimeline]);
    const node = result.nodes.find((n) => n.id === "event_01");
    assertExists(node?.title);
    assertEquals(node?.title?.includes("王国の滅亡"), true);
  });

  await t.step("存在しないターゲットへのエッジは生成されない", () => {
    const timelineWithInvalidRef: Timeline = {
      id: "invalid",
      name: "不正参照タイムライン",
      scope: "story",
      summary: "",
      events: [
        {
          id: "e1",
          title: "イベント1",
          category: "plot_point",
          time: { order: 1 },
          summary: "",
          characters: [],
          settings: [],
          chapters: [],
          causes: ["nonexistent"], // 存在しないID
        },
      ],
    };
    const result = builder.build([timelineWithInvalidRef]);
    assertEquals(result.edges.length, 0);
  });
});
