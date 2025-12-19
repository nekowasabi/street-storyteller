/**
 * story_director プロンプトのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import type {
  McpPromptDefinition,
  McpPromptMessage,
} from "@storyteller/mcp/prompts/prompt_registry.ts";
import type { McpPromptArgument } from "@storyteller/mcp/protocol/types.ts";
import { storyDirectorPrompt } from "@storyteller/mcp/prompts/definitions/story_director.ts";

// ===== McpPromptDefinition型準拠テスト =====

Deno.test("story_director: McpPromptDefinition型に準拠している", () => {
  // 型チェック: コンパイル時に型エラーが出ないことを確認
  const prompt: McpPromptDefinition = storyDirectorPrompt;
  assertExists(prompt);
  assertExists(prompt.name);
  assertExists(prompt.description);
  assertExists(prompt.getMessages);
});

Deno.test("story_director: name が 'story_director' である", () => {
  assertEquals(storyDirectorPrompt.name, "story_director");
});

Deno.test("story_director: description が適切に設定されている", () => {
  assertExists(storyDirectorPrompt.description);
  assertEquals(storyDirectorPrompt.description.length > 0, true);
});

// ===== arguments テスト =====

Deno.test("story_director: question引数(必須)が定義されている", () => {
  assertExists(storyDirectorPrompt.arguments);
  const args = storyDirectorPrompt.arguments as readonly McpPromptArgument[];
  const questionArg = args.find(
    (arg: McpPromptArgument) => arg.name === "question",
  );
  assertExists(questionArg);
  assertEquals(questionArg.required, true);
});

Deno.test("story_director: focus引数(任意)が定義されている", () => {
  assertExists(storyDirectorPrompt.arguments);
  const args = storyDirectorPrompt.arguments as readonly McpPromptArgument[];
  const focusArg = args.find(
    (arg: McpPromptArgument) => arg.name === "focus",
  );
  assertExists(focusArg);
  assertEquals(focusArg.required, false);
});

// ===== getMessages テスト =====

Deno.test("story_director: question引数を受け取りメッセージを生成する", () => {
  const messages = storyDirectorPrompt.getMessages({
    question: "主人公の性格についてアドバイスをください",
  });

  // 少なくとも2つのメッセージ（system, user）が必要
  assertEquals(messages.length >= 2, true);

  // systemメッセージが存在する
  const systemMsg = messages.find(
    (m: McpPromptMessage) => m.role === "system",
  );
  assertExists(systemMsg);

  // userメッセージに質問内容が含まれる
  const userMsg = messages.find((m: McpPromptMessage) => m.role === "user");
  assertExists(userMsg);
  assertEquals(userMsg.content.includes("主人公の性格"), true);
});

Deno.test("story_director: focus引数を含めてメッセージを生成する", () => {
  const messages = storyDirectorPrompt.getMessages({
    question: "キャラクター設計をレビューしてください",
    focus: "character",
  });

  // focusがメッセージに反映される
  assertEquals(
    messages.some((m: McpPromptMessage) => m.content.includes("character")),
    true,
  );
});

Deno.test("story_director: focus引数なしでもメッセージを生成できる", () => {
  const messages = storyDirectorPrompt.getMessages({
    question: "プロット全体の構成はどうですか？",
  });

  assertExists(messages);
  assertEquals(messages.length >= 2, true);
});

Deno.test("story_director: focus=allの場合プロジェクト全体を対象とする", () => {
  const messages = storyDirectorPrompt.getMessages({
    question: "全体評価をお願いします",
    focus: "all",
  });

  const userMsg = messages.find((m: McpPromptMessage) => m.role === "user");
  assertExists(userMsg);
  // 全体を対象としていることが分かる
  assertEquals(
    userMsg.content.includes("all") || userMsg.content.includes("全体"),
    true,
  );
});

// ===== システムプロンプト内容テスト =====

Deno.test("story_director: systemプロンプトにディレクター役割が含まれる", () => {
  const messages = storyDirectorPrompt.getMessages({
    question: "テスト",
  });

  const systemMsg = messages.find(
    (m: McpPromptMessage) => m.role === "system",
  );
  assertExists(systemMsg);

  // ディレクターとしての役割を示すキーワードが含まれる
  const content = systemMsg.content.toLowerCase();
  assertEquals(
    content.includes("director") ||
      content.includes("ディレクター") ||
      content.includes("監督"),
    true,
  );
});

Deno.test("story_director: systemプロンプトにSaCコンセプトへの言及がある", () => {
  const messages = storyDirectorPrompt.getMessages({
    question: "テスト",
  });

  const systemMsg = messages.find(
    (m: McpPromptMessage) => m.role === "system",
  );
  assertExists(systemMsg);

  // SaCまたはStoryWriting as Codeへの言及
  const content = systemMsg.content;
  assertEquals(
    content.includes("SaC") ||
      content.includes("StoryWriting as Code") ||
      content.includes("コードで定義"),
    true,
  );
});

// ===== focus値の網羅テスト =====

Deno.test("story_director: focus=characterでキャラクター領域にフォーカス", () => {
  const messages = storyDirectorPrompt.getMessages({
    question: "キャラクターについて",
    focus: "character",
  });
  assertEquals(
    messages.some((m: McpPromptMessage) => m.content.includes("character")),
    true,
  );
});

Deno.test("story_director: focus=settingで設定領域にフォーカス", () => {
  const messages = storyDirectorPrompt.getMessages({
    question: "世界観について",
    focus: "setting",
  });
  assertEquals(
    messages.some((m: McpPromptMessage) => m.content.includes("setting")),
    true,
  );
});

Deno.test("story_director: focus=plotでプロット領域にフォーカス", () => {
  const messages = storyDirectorPrompt.getMessages({
    question: "プロットについて",
    focus: "plot",
  });
  assertEquals(
    messages.some((m: McpPromptMessage) => m.content.includes("plot")),
    true,
  );
});

Deno.test("story_director: focus=styleで文体領域にフォーカス", () => {
  const messages = storyDirectorPrompt.getMessages({
    question: "文体について",
    focus: "style",
  });
  assertEquals(
    messages.some((m: McpPromptMessage) => m.content.includes("style")),
    true,
  );
});
