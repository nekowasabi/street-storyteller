// tests/application/view/graph/character_graph_builder_test.ts
import { assertEquals, assertExists } from "@std/assert";
import { CharacterGraphBuilder } from "@storyteller/application/view/graph/character_graph_builder.ts";
import type { Character } from "@storyteller/types/v2/character.ts";

const mockCharacters: readonly Character[] = [
  {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["勇敢"],
    relationships: { villain: "enemy", mentor: "respect" },
    appearingChapters: ["chapter_01"],
    summary: "主人公",
  },
  {
    id: "villain",
    name: "魔王",
    role: "antagonist",
    traits: ["邪悪"],
    relationships: { hero: "enemy" },
    appearingChapters: ["chapter_01"],
    summary: "敵役",
  },
  {
    id: "mentor",
    name: "師匠",
    role: "supporting",
    traits: ["賢明"],
    relationships: { hero: "mentor" },
    appearingChapters: ["chapter_01"],
    summary: "指導者",
  },
];

Deno.test("CharacterGraphBuilder - グラフ生成", async (t) => {
  const builder = new CharacterGraphBuilder();

  await t.step("ノードが全キャラクター分生成される", () => {
    const result = builder.build(mockCharacters);
    assertEquals(result.nodes.length, 3);
  });

  await t.step("関係性からエッジが生成される", () => {
    const result = builder.build(mockCharacters);
    // hero->villain(enemy), hero->mentor(respect), villain->hero(enemy), mentor->hero(mentor)
    // 双方向の関係は1つのエッジにまとめる
    assertExists(
      result.edges.find((e) =>
        (e.from === "hero" && e.to === "villain") ||
        (e.from === "villain" && e.to === "hero")
      ),
    );
  });

  await t.step("役割別にグループが設定される", () => {
    const result = builder.build(mockCharacters);
    const heroNode = result.nodes.find((n) => n.id === "hero");
    assertEquals(heroNode?.group, "protagonist");
  });

  await t.step("敵対関係は赤色エッジ", () => {
    const result = builder.build(mockCharacters);
    const enemyEdge = result.edges.find((e) => e.label === "enemy");
    assertEquals(enemyEdge?.color?.color, "#e74c3c");
  });

  await t.step("尊敬関係は青色エッジ", () => {
    const result = builder.build(mockCharacters);
    const respectEdge = result.edges.find((e) => e.label === "respect");
    assertEquals(respectEdge?.color?.color, "#3498db");
  });

  await t.step("メンター関係は紫色エッジ", () => {
    // mentor->hero関係はmentor型だが、hero->mentor関係のrespectで先に登録される可能性がある
    // そのため、mentorタイプの関係を持つキャラクターのみでテスト
    const mentorOnly: readonly Character[] = [
      {
        id: "student",
        name: "弟子",
        role: "protagonist",
        traits: [],
        relationships: {},
        appearingChapters: [],
        summary: "",
      },
      {
        id: "master",
        name: "師匠",
        role: "supporting",
        traits: [],
        relationships: { student: "mentor" },
        appearingChapters: [],
        summary: "",
      },
    ];
    const result = builder.build(mentorOnly);
    const mentorEdge = result.edges.find((e) => e.label === "mentor");
    assertEquals(mentorEdge?.color?.color, "#9b59b6");
  });

  await t.step("空配列の場合は空グラフを返す", () => {
    const result = builder.build([]);
    assertEquals(result.nodes.length, 0);
    assertEquals(result.edges.length, 0);
  });

  await t.step("ノードにタイトル（ツールチップ）が設定される", () => {
    const result = builder.build(mockCharacters);
    const heroNode = result.nodes.find((n) => n.id === "hero");
    assertExists(heroNode?.title);
    assertEquals(heroNode?.title?.includes("勇者"), true);
  });

  await t.step("グラフオプションが設定される", () => {
    const result = builder.build(mockCharacters);
    assertExists(result.options);
    assertExists(result.options?.nodes);
    assertExists(result.options?.edges);
    assertExists(result.options?.physics);
    assertExists(result.options?.interaction);
  });
});

Deno.test("CharacterGraphBuilder - エッジの重複排除", async (t) => {
  const builder = new CharacterGraphBuilder();

  await t.step("双方向の関係は1つのエッジにまとめられる", () => {
    const characters: readonly Character[] = [
      {
        id: "a",
        name: "A",
        role: "protagonist",
        traits: [],
        relationships: { b: "ally" },
        appearingChapters: [],
        summary: "",
      },
      {
        id: "b",
        name: "B",
        role: "supporting",
        traits: [],
        relationships: { a: "ally" },
        appearingChapters: [],
        summary: "",
      },
    ];
    const result = builder.build(characters);
    // a->b と b->a は1つのエッジにまとまる
    assertEquals(result.edges.length, 1);
  });
});
