/**
 * CommandMapperのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals } from "@std/assert";
import { CommandMapper } from "@storyteller/mcp/nlp/command_mapper.ts";
import type { Intent } from "@storyteller/mcp/nlp/intent_analyzer.ts";

Deno.test('CommandMapper: element_create インテント → "element_create"', () => {
  const mapper = new CommandMapper();
  const tool = mapper.mapToTool({
    action: "element_create",
    params: {},
    confidence: 0.9,
  });
  assertEquals(tool, "element_create");
});

Deno.test("CommandMapper: 未知のインテント → null", () => {
  const mapper = new CommandMapper();
  const tool = mapper.mapToTool({
    action: "unknown",
    params: {},
    confidence: 0.0,
  });
  assertEquals(tool, null);
});

Deno.test("CommandMapper: パラメータ正規化ができる", () => {
  const mapper = new CommandMapper();
  const intent: Intent = {
    action: "element_create",
    params: { type: "character", name: "hero", with_details: true },
    confidence: 0.9,
  };
  const params = mapper.normalizeParams(intent);
  assertEquals(params.type, "character");
  assertEquals(params.name, "hero");
  // snake_case → camelCase
  assertEquals(params.withDetails, true);
});
