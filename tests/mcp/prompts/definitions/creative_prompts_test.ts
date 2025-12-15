/**
 * 創作支援プロンプトのテスト（creative）
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { characterBrainstormPrompt } from "../../../../src/mcp/prompts/definitions/character_brainstorm.ts";
import { plotSuggestionPrompt } from "../../../../src/mcp/prompts/definitions/plot_suggestion.ts";
import { sceneImprovementPrompt } from "../../../../src/mcp/prompts/definitions/scene_improvement.ts";

Deno.test("character_brainstorm: role引数を受け取りメッセージを生成する", () => {
  assertEquals(characterBrainstormPrompt.name, "character_brainstorm");
  const messages = characterBrainstormPrompt.getMessages({
    role: "protagonist",
  });
  assertExists(messages[0]);
  assertEquals(messages.some((m) => m.content.includes("protagonist")), true);
});

Deno.test("plot_suggestion: genre引数を受け取りメッセージを生成する", () => {
  assertEquals(plotSuggestionPrompt.name, "plot_suggestion");
  const messages = plotSuggestionPrompt.getMessages({ genre: "fantasy" });
  assertEquals(messages.some((m) => m.content.includes("fantasy")), true);
});

Deno.test("scene_improvement: scene引数を受け取りメッセージを生成する", () => {
  assertEquals(sceneImprovementPrompt.name, "scene_improvement");
  const messages = sceneImprovementPrompt.getMessages({ scene: "対決シーン" });
  assertEquals(messages.some((m) => m.content.includes("対決シーン")), true);
});

Deno.test("character_brainstorm: genre引数を含めてメッセージを生成する", () => {
  const messages = characterBrainstormPrompt.getMessages({
    role: "antagonist",
    genre: "SF",
  });
  assertEquals(messages.some((m) => m.content.includes("antagonist")), true);
  assertEquals(messages.some((m) => m.content.includes("SF")), true);
});

Deno.test("character_brainstorm: genre引数がない場合は not specified と表示", () => {
  const messages = characterBrainstormPrompt.getMessages({
    role: "supporting",
  });
  assertEquals(
    messages.some((m) => m.content.includes("not specified")),
    true,
  );
});

Deno.test("character_brainstorm: 空のgenre引数は not specified と表示", () => {
  const messages = characterBrainstormPrompt.getMessages({
    role: "guest",
    genre: "   ",
  });
  assertEquals(
    messages.some((m) => m.content.includes("not specified")),
    true,
  );
});

Deno.test("scene_improvement: goal引数を含めてメッセージを生成する", () => {
  const messages = sceneImprovementPrompt.getMessages({
    scene: "対決シーン",
    goal: "緊張感を高める",
  });
  assertEquals(messages.some((m) => m.content.includes("対決シーン")), true);
  assertEquals(
    messages.some((m) => m.content.includes("緊張感を高める")),
    true,
  );
});

Deno.test("scene_improvement: goal引数がない場合は not specified と表示", () => {
  const messages = sceneImprovementPrompt.getMessages({
    scene: "日常シーン",
  });
  assertEquals(
    messages.some((m) => m.content.includes("not specified")),
    true,
  );
});

Deno.test("scene_improvement: 空のgoal引数は not specified と表示", () => {
  const messages = sceneImprovementPrompt.getMessages({
    scene: "会話シーン",
    goal: "",
  });
  assertEquals(
    messages.some((m) => m.content.includes("not specified")),
    true,
  );
});

Deno.test("plot_suggestion: logline引数を含めてメッセージを生成する", () => {
  const messages = plotSuggestionPrompt.getMessages({
    genre: "mystery",
    logline: "探偵が謎を解く",
  });
  assertEquals(messages.some((m) => m.content.includes("mystery")), true);
  assertEquals(
    messages.some((m) => m.content.includes("探偵が謎を解く")),
    true,
  );
});

Deno.test("plot_suggestion: logline引数がない場合は not specified と表示", () => {
  const messages = plotSuggestionPrompt.getMessages({
    genre: "horror",
  });
  assertEquals(
    messages.some((m) => m.content.includes("not specified")),
    true,
  );
});

Deno.test("plot_suggestion: 空のlogline引数は not specified と表示", () => {
  const messages = plotSuggestionPrompt.getMessages({
    genre: "romance",
    logline: "  ",
  });
  assertEquals(
    messages.some((m) => m.content.includes("not specified")),
    true,
  );
});
