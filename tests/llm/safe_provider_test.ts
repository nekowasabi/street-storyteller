/**
 * Safe LLM Provider テスト
 */
import { assert, assertEquals } from "@std/assert";
import { MockLLMProvider } from "@storyteller/llm/providers/mock.ts";
import {
  SafeLLMProvider,
  wrapWithSafety,
} from "@storyteller/llm/safety/safe_provider.ts";
import type { SafetyConfig } from "@storyteller/llm/config/llm_config.ts";
import type { LLMMessage } from "@storyteller/llm/providers/provider.ts";

const testMessages: LLMMessage[] = [
  { role: "user", content: "Hello" },
];

Deno.test("SafeLLMProvider - 基本動作", async (t) => {
  await t.step("制限内の呼び出しは成功する", async () => {
    const mockProvider = new MockLLMProvider();
    const safety: SafetyConfig = {
      maxCallsPerSession: 5,
      warningThreshold: 2,
    };

    const safeProvider = new SafeLLMProvider(mockProvider, { safety });

    const result = await safeProvider.generate(testMessages);

    assert(result.ok, "呼び出しは成功すべき");
    assertEquals(safeProvider.getCurrentCallCount(), 1);
  });

  await t.step("制限を超えた呼び出しはエラーを返す", async () => {
    const mockProvider = new MockLLMProvider();
    const safety: SafetyConfig = {
      maxCallsPerSession: 3,
      warningThreshold: 1,
    };

    const safeProvider = new SafeLLMProvider(mockProvider, { safety });

    // 3回は成功
    await safeProvider.generate(testMessages);
    await safeProvider.generate(testMessages);
    await safeProvider.generate(testMessages);

    // 4回目はエラー
    const result = await safeProvider.generate(testMessages);

    assert(!result.ok, "制限を超えた呼び出しはエラーを返すべき");
    if (!result.ok) {
      assertEquals(result.error.code, "call_limit_exceeded");
    }
  });

  await t.step("プロバイダー名にsafe()プレフィックスが付く", () => {
    const mockProvider = new MockLLMProvider();
    const safety: SafetyConfig = {
      maxCallsPerSession: 10,
      warningThreshold: 2,
    };

    const safeProvider = new SafeLLMProvider(mockProvider, { safety });

    assertEquals(safeProvider.name, "safe(mock)");
  });
});

Deno.test("SafeLLMProvider - コールバック", async (t) => {
  await t.step("警告コールバックが呼ばれる", async () => {
    const mockProvider = new MockLLMProvider();
    const safety: SafetyConfig = {
      maxCallsPerSession: 5,
      warningThreshold: 2,
    };

    let warningMessage = "";
    let warningRemaining = 0;

    const safeProvider = new SafeLLMProvider(mockProvider, {
      safety,
      onWarning: (remaining, message) => {
        warningRemaining = remaining;
        warningMessage = message;
      },
    });

    // 2回呼び出し（残り3回）- まだ警告なし
    await safeProvider.generate(testMessages);
    await safeProvider.generate(testMessages);

    assertEquals(warningRemaining, 0, "まだ警告は呼ばれていないべき");

    // 3回目（残り2回 = 警告閾値）で警告
    await safeProvider.generate(testMessages);

    assertEquals(warningRemaining, 2);
    assert(
      warningMessage.includes("2"),
      "警告メッセージに残り回数が含まれるべき",
    );
  });

  await t.step("制限到達コールバックが呼ばれる", async () => {
    const mockProvider = new MockLLMProvider();
    const safety: SafetyConfig = {
      maxCallsPerSession: 2,
      warningThreshold: 1,
    };

    let limitReached = false;

    const safeProvider = new SafeLLMProvider(mockProvider, {
      safety,
      onLimitReached: () => {
        limitReached = true;
      },
    });

    // 2回呼び出し
    await safeProvider.generate(testMessages);
    await safeProvider.generate(testMessages);

    // 3回目で制限到達
    await safeProvider.generate(testMessages);

    assert(limitReached, "制限到達コールバックが呼ばれるべき");
  });
});

Deno.test("SafeLLMProvider - ヘルパー関数", async (t) => {
  await t.step("wrapWithSafety でラッパーを作成できる", async () => {
    const mockProvider = new MockLLMProvider();
    const safety: SafetyConfig = {
      maxCallsPerSession: 5,
      warningThreshold: 2,
    };

    const safeProvider = wrapWithSafety(mockProvider, safety);

    const result = await safeProvider.generate(testMessages);

    assert(result.ok, "呼び出しは成功すべき");
    assertEquals(safeProvider.name, "safe(mock)");
  });

  await t.step("内部プロバイダーを取得できる", () => {
    const mockProvider = new MockLLMProvider();
    const safety: SafetyConfig = {
      maxCallsPerSession: 5,
      warningThreshold: 2,
    };

    const safeProvider = wrapWithSafety(mockProvider, safety);

    assertEquals(safeProvider.getInnerProvider(), mockProvider);
  });
});

Deno.test("SafeLLMProvider - リセット", async (t) => {
  await t.step("リセット後は再び呼び出しが可能", async () => {
    const mockProvider = new MockLLMProvider();
    const safety: SafetyConfig = {
      maxCallsPerSession: 2,
      warningThreshold: 1,
    };

    const safeProvider = new SafeLLMProvider(mockProvider, { safety });

    // 2回呼び出し（制限到達）
    await safeProvider.generate(testMessages);
    await safeProvider.generate(testMessages);

    assert(safeProvider.isLimitReached(), "制限に達しているべき");

    // リセット
    safeProvider.resetCallCount();

    assert(!safeProvider.isLimitReached(), "リセット後は制限解除されるべき");
    assertEquals(safeProvider.getCurrentCallCount(), 0);

    // 再び呼び出し可能
    const result = await safeProvider.generate(testMessages);
    assert(result.ok, "リセット後の呼び出しは成功すべき");
  });
});

Deno.test("SafeLLMProvider - isAvailable", async (t) => {
  await t.step("制限到達時はisAvailableがfalseを返す", async () => {
    const mockProvider = new MockLLMProvider();
    const safety: SafetyConfig = {
      maxCallsPerSession: 1,
      warningThreshold: 0,
    };

    const safeProvider = new SafeLLMProvider(mockProvider, { safety });

    assert(await safeProvider.isAvailable(), "初期状態では利用可能");

    // 1回呼び出し
    await safeProvider.generate(testMessages);

    assert(!await safeProvider.isAvailable(), "制限到達後は利用不可");
  });
});
