/**
 * PromptRegistryのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  type McpPromptDefinition,
  PromptRegistry,
} from "../../../src/mcp/prompts/prompt_registry.ts";

function createTestPrompt(name: string): McpPromptDefinition {
  return {
    name,
    description: `Test prompt: ${name}`,
    arguments: [{ name: "topic", description: "topic", required: true }],
    getMessages: (args) => [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: `Topic: ${args.topic}` },
    ],
  };
}

Deno.test("PromptRegistry: register()でプロンプト登録できる", () => {
  const registry = new PromptRegistry();
  registry.register(createTestPrompt("p1"));

  const prompt = registry.get("p1");
  assertExists(prompt);
  assertEquals(prompt.name, "p1");
});

Deno.test("PromptRegistry: get()で未登録はundefined", () => {
  const registry = new PromptRegistry();
  assertEquals(registry.get("missing"), undefined);
});

Deno.test("PromptRegistry: listPrompts()で一覧を取得できる", () => {
  const registry = new PromptRegistry();
  registry.register(createTestPrompt("a"));
  registry.register(createTestPrompt("b"));

  const prompts = registry.listPrompts();
  const names = prompts.map((p) => p.name).sort();
  assertEquals(names, ["a", "b"]);
});

Deno.test("PromptRegistry: getMessages()でメッセージ生成できる", () => {
  const registry = new PromptRegistry();
  registry.register(createTestPrompt("p1"));

  const prompt = registry.get("p1");
  assertExists(prompt);
  const messages = prompt.getMessages({ topic: "hero" });
  assertEquals(messages.length, 2);
  assertEquals(messages[1].content.includes("hero"), true);
});
