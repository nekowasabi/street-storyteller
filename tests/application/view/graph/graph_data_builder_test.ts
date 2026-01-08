// tests/application/view/graph/graph_data_builder_test.ts
import { assertExists } from "@std/assert";
import type { GraphDataBuilder } from "@storyteller/application/view/graph/graph_data_builder.ts";
import type { VisGraphData } from "@storyteller/application/view/graph/vis_types.ts";

Deno.test("GraphDataBuilder - インターフェース定義", async (t) => {
  await t.step("GraphDataBuilder型が存在する", () => {
    // 型チェックのみ - コンパイル通過で成功
    const _builder: GraphDataBuilder<unknown> = {
      build: (_data: unknown): VisGraphData => ({
        nodes: [],
        edges: [],
      }),
    };
    assertExists(_builder);
  });

  await t.step("ジェネリック型パラメータが正しく機能する", () => {
    // 文字列配列を入力とするビルダー
    const stringBuilder: GraphDataBuilder<readonly string[]> = {
      build: (data: readonly string[]): VisGraphData => ({
        nodes: data.map((s) => ({ id: s, label: s })),
        edges: [],
      }),
    };
    const result = stringBuilder.build(["a", "b", "c"]);
    assertExists(result.nodes);
  });

  await t.step("オブジェクト型を入力とするビルダー", () => {
    type Person = { id: string; name: string };
    const personBuilder: GraphDataBuilder<readonly Person[]> = {
      build: (data: readonly Person[]): VisGraphData => ({
        nodes: data.map((p) => ({ id: p.id, label: p.name })),
        edges: [],
      }),
    };
    const result = personBuilder.build([{ id: "1", name: "Alice" }]);
    assertExists(result.nodes);
  });
});
