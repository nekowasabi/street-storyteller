/**
 * LLM Provider テスト
 */
import { assert, assertEquals, assertExists } from "@std/assert";
import {
  createProvider,
  isStreamingProvider,
  type LLMMessage,
  MockLLMProvider,
} from "../../src/llm/index.ts";

Deno.test("MockLLMProvider - 基本動作", async (t) => {
  await t.step("デフォルトレスポンスを返す", async () => {
    const provider = new MockLLMProvider();
    const messages: LLMMessage[] = [
      { role: "user", content: "Hello" },
    ];

    const result = await provider.generate(messages);

    assert(result.ok, "結果は成功すべき");
    if (result.ok) {
      assertEquals(
        result.value.content,
        "This is a mock response.",
        "デフォルトレスポンスが返される",
      );
    }
  });

  await t.step("カスタムレスポンスを返す", async () => {
    const provider = new MockLLMProvider({
      response: "カスタムレスポンス",
    });
    const messages: LLMMessage[] = [
      { role: "user", content: "Hello" },
    ];

    const result = await provider.generate(messages);

    assert(result.ok, "結果は成功すべき");
    if (result.ok) {
      assertEquals(
        result.value.content,
        "カスタムレスポンス",
      );
    }
  });

  await t.step("レスポンス生成関数を使用できる", async () => {
    const provider = new MockLLMProvider({
      responseGenerator: (messages) =>
        `入力: ${messages[0]?.content ?? "なし"}`,
    });
    const messages: LLMMessage[] = [
      { role: "user", content: "テスト入力" },
    ];

    const result = await provider.generate(messages);

    assert(result.ok, "結果は成功すべき");
    if (result.ok) {
      assertEquals(result.value.content, "入力: テスト入力");
    }
  });

  await t.step("エラーをシミュレートできる", async () => {
    const provider = new MockLLMProvider({
      shouldFail: true,
      error: {
        code: "test_error",
        message: "テストエラー",
      },
    });
    const messages: LLMMessage[] = [
      { role: "user", content: "Hello" },
    ];

    const result = await provider.generate(messages);

    assert(!result.ok, "結果はエラーすべき");
    if (!result.ok) {
      assertEquals(result.error.code, "test_error");
      assertEquals(result.error.message, "テストエラー");
    }
  });

  await t.step("呼び出し履歴を記録する", async () => {
    const provider = new MockLLMProvider();
    const messages1: LLMMessage[] = [{ role: "user", content: "First" }];
    const messages2: LLMMessage[] = [{ role: "user", content: "Second" }];

    await provider.generate(messages1);
    await provider.generate(messages2);

    assertEquals(provider.getCallCount(), 2);
    assertEquals(provider.getCallHistory().length, 2);
    assertEquals(provider.getCallHistory()[0].messages[0].content, "First");
    assertEquals(provider.getCallHistory()[1].messages[0].content, "Second");
  });

  await t.step("リセットで履歴がクリアされる", () => {
    const provider = new MockLLMProvider();
    provider.reset();

    assertEquals(provider.getCallCount(), 0);
    assertEquals(provider.getCallHistory().length, 0);
  });
});

Deno.test("MockLLMProvider - ストリーミング", async (t) => {
  await t.step("ストリーミングレスポンスを返す", async () => {
    const provider = new MockLLMProvider({
      response: "Hello World",
    });
    const messages: LLMMessage[] = [
      { role: "user", content: "Test" },
    ];

    const chunks: string[] = [];
    for await (const chunk of provider.generateStream(messages)) {
      chunks.push(chunk);
    }

    assertEquals(chunks.join(""), "Hello World");
  });
});

Deno.test("isStreamingProvider - ストリーミング対応判定", () => {
  const mockProvider = new MockLLMProvider();
  assertEquals(isStreamingProvider(mockProvider), true);
});

Deno.test("createProvider - ファクトリー", async (t) => {
  await t.step("mockプロバイダーを作成できる", () => {
    const result = createProvider({
      provider: "mock",
      model: "mock-model",
    });

    assert(result.ok, "結果は成功すべき");
    if (result.ok) {
      assertEquals(result.value.name, "mock");
    }
  });

  await t.step("未知のプロバイダーでエラーを返す", () => {
    const result = createProvider({
      provider: "unknown" as any,
      model: "unknown-model",
    });

    assert(!result.ok, "結果はエラーすべき");
    if (!result.ok) {
      assertEquals(result.error.code, "unknown_provider");
    }
  });

  await t.step("openrouterプロバイダーはAPIキーが必要", () => {
    const result = createProvider({
      provider: "openrouter",
      model: "gpt-3.5-turbo",
      // apiKeyなし
    });

    assert(!result.ok, "結果はエラーすべき");
    if (!result.ok) {
      assertEquals(result.error.code, "provider_init_failed");
    }
  });
});
