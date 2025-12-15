/**
 * プロンプトハンドラーのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { PromptRegistry } from "../../../../src/mcp/prompts/prompt_registry.ts";
import {
  createDefaultPromptRegistry,
  handlePromptsGet,
  handlePromptsList,
} from "../../../../src/mcp/server/handlers/prompts.ts";

Deno.test("handlePromptsList: 登録済みプロンプト一覧を返す", () => {
  const registry = new PromptRegistry();
  registry.register({
    name: "p1",
    description: "Prompt 1",
    getMessages: () => [{ role: "user", content: "hi" }],
  });

  const result = handlePromptsList(registry);
  assertExists(result.prompts);
  assertEquals(result.prompts.length, 1);
  assertEquals(result.prompts[0].name, "p1");
});

Deno.test("handlePromptsGet: 指定プロンプトのmessagesを返す", () => {
  const registry = new PromptRegistry();
  registry.register({
    name: "p1",
    description: "Prompt 1",
    arguments: [{ name: "topic", required: true }],
    getMessages: (args) => [{ role: "user", content: `topic=${args.topic}` }],
  });

  const result = handlePromptsGet(registry, {
    name: "p1",
    arguments: { topic: "hero" },
  });
  assertExists(result.messages);
  assertEquals(result.messages.length, 1);
  assertEquals(result.messages[0].content.includes("hero"), true);
});

Deno.test("handlePromptsGet: 未知のプロンプトでエラーを投げる", () => {
  const registry = new PromptRegistry();
  try {
    handlePromptsGet(registry, { name: "missing", arguments: {} });
    throw new Error("Expected error");
  } catch (error) {
    assertEquals(error instanceof Error, true);
  }
});

Deno.test("createDefaultPromptRegistry: 既定の創作支援プロンプトが登録されている", () => {
  const registry = createDefaultPromptRegistry();
  const prompts = registry.toMcpPrompts();
  const names = prompts.map((p) => p.name);
  assertEquals(names.includes("character_brainstorm"), true);
  assertEquals(names.includes("plot_suggestion"), true);
  assertEquals(names.includes("scene_improvement"), true);
  assertEquals(names.includes("project_setup_wizard"), true);
  assertEquals(names.includes("chapter_review"), true);
  assertEquals(names.includes("consistency_fix"), true);
});
