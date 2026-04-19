import { assertEquals } from "jsr:@std/assert";
import { validateSubplot } from "@storyteller/plugins/core/subplot/validator.ts";
import { SubplotGraphBuilder } from "@storyteller/application/view/graph/subplot_graph_builder.ts";
import { generateSubplotDocument } from "@storyteller/rag/templates/subplot.ts";
import type { Subplot } from "@storyteller/types/v2/subplot.ts";

function generateTestSubplots(count: number): Subplot[] {
  const subplots: Subplot[] = [];
  for (let i = 0; i < count; i++) {
    const beats = Array.from({ length: 10 }, (_, j) => ({
      id: `sp${i}_beat${j}`,
      title: `Beat ${j} of Subplot ${i}`,
      summary: `Summary for beat ${j}`,
      structurePosition: (["setup", "rising", "climax", "falling", "resolution"] as const)[j % 5],
      characters: [`char_${j % 20}`],
      preconditionBeatIds: j > 0 ? [`sp${i}_beat${j - 1}`] : undefined,
    }));

    subplots.push({
      id: `subplot_${i}`,
      name: `Subplot ${i}`,
      type: (["main", "subplot", "parallel", "background"] as const)[i % 4],
      status: "active",
      summary: `Performance test subplot ${i}`,
      beats,
      intersections: i > 0 ? [{
        id: `ix_${i}`,
        sourceSubplotId: `subplot_${i - 1}`,
        sourceBeatId: `sp${i - 1}_beat5`,
        targetSubplotId: `subplot_${i}`,
        targetBeatId: `sp${i}_beat0`,
        summary: `Intersection ${i}`,
        influenceDirection: "forward",
      }] : undefined,
    });
  }
  return subplots;
}

Deno.test("performance: validate 100 subplots completes within 1 second", () => {
  const subplots = generateTestSubplots(100);
  const start = performance.now();
  for (const sp of subplots) {
    validateSubplot(sp);
  }
  const elapsed = performance.now() - start;
  console.log(`validate 100 subplots: ${elapsed.toFixed(1)}ms`);
  assertEquals(elapsed < 1000, true, `Validation took ${elapsed}ms, expected < 1000ms`);
});

Deno.test("performance: graph builder handles 100 subplots", () => {
  const subplots = generateTestSubplots(100);
  const builder = new SubplotGraphBuilder();
  const start = performance.now();
  const data = builder.build(subplots);
  const elapsed = performance.now() - start;
  console.log(`graph builder 100 subplots: ${elapsed.toFixed(1)}ms, nodes: ${data.nodes.length}, edges: ${data.edges.length}`);
  assertEquals(elapsed < 500, true, `Graph build took ${elapsed}ms`);
  assertEquals(data.nodes.length > 0, true);
});

Deno.test("performance: RAG document generation for 100 subplots", () => {
  const subplots = generateTestSubplots(100);
  const start = performance.now();
  for (const sp of subplots) {
    generateSubplotDocument(sp);
  }
  const elapsed = performance.now() - start;
  console.log(`RAG gen 100 subplots: ${elapsed.toFixed(1)}ms`);
  assertEquals(elapsed < 500, true, `RAG generation took ${elapsed}ms`);
});
