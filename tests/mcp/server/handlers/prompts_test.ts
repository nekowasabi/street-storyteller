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

// ===== story_director 統合テスト =====

Deno.test("createDefaultPromptRegistry: story_directorプロンプトが登録されている", () => {
  const registry = createDefaultPromptRegistry();
  const prompts = registry.toMcpPrompts();
  const names = prompts.map((p) => p.name);
  assertEquals(names.includes("story_director"), true);
});

Deno.test("handlePromptsGet: story_directorプロンプトのメッセージを取得できる", () => {
  const registry = createDefaultPromptRegistry();

  const result = handlePromptsGet(registry, {
    name: "story_director",
    arguments: {
      question: "キャラクター構成を評価してください",
      focus: "character",
    },
  });

  assertExists(result.messages);
  assertEquals(result.messages.length >= 2, true);

  // systemメッセージにディレクター役割が含まれる
  const systemMsg = result.messages.find((m) => m.role === "system");
  assertExists(systemMsg);

  // userメッセージに質問内容が含まれる
  const userMsg = result.messages.find((m) => m.role === "user");
  assertExists(userMsg);
  assertEquals(userMsg.content.includes("キャラクター構成"), true);
  assertEquals(userMsg.content.includes("character"), true);
});

Deno.test("handlePromptsList: story_directorプロンプトが一覧に含まれる", () => {
  const registry = createDefaultPromptRegistry();
  const result = handlePromptsList(registry);

  const storyDirector = result.prompts.find((p) => p.name === "story_director");
  assertExists(storyDirector);
  assertExists(storyDirector.description);
  assertExists(storyDirector.arguments);

  // 必須引数と任意引数が定義されている
  const questionArg = storyDirector.arguments!.find((a) =>
    a.name === "question"
  );
  const focusArg = storyDirector.arguments!.find((a) => a.name === "focus");
  assertExists(questionArg);
  assertExists(focusArg);
  assertEquals(questionArg.required, true);
  assertEquals(focusArg.required, false);
});
