/**
 * LLM Config テスト
 */
import { assert, assertEquals } from "@std/assert";
import {
  createMockConfig,
  DEFAULT_LLM_CONFIG,
  mergeWithDefaults,
  validateConfig,
} from "@storyteller/llm/index.ts";

Deno.test("LLM Config - デフォルト設定", async (t) => {
  await t.step("デフォルト設定が正しい", () => {
    assertEquals(DEFAULT_LLM_CONFIG.provider, "openrouter");
    assertEquals(DEFAULT_LLM_CONFIG.model, "anthropic/claude-3-haiku");
    assertEquals(DEFAULT_LLM_CONFIG.timeout, 30000);
    assertEquals(DEFAULT_LLM_CONFIG.retry?.maxRetries, 3);
  });
});

Deno.test("LLM Config - マージ", async (t) => {
  await t.step("部分的な設定をデフォルトとマージ", () => {
    const partial = {
      provider: "openrouter" as const,
      model: "custom-model",
    };

    const merged = mergeWithDefaults(partial);

    assertEquals(merged.model, "custom-model");
    assertEquals(merged.timeout, DEFAULT_LLM_CONFIG.timeout);
    assertEquals(
      merged.retry?.maxRetries,
      DEFAULT_LLM_CONFIG.retry?.maxRetries,
    );
  });

  await t.step("リトライ設定を部分的にオーバーライド", () => {
    const partial = {
      provider: "openrouter" as const,
      model: "custom-model",
      retry: {
        maxRetries: 5,
      },
    };

    const merged = mergeWithDefaults(partial);

    assertEquals(merged.retry?.maxRetries, 5);
    assertEquals(
      merged.retry?.initialDelay,
      DEFAULT_LLM_CONFIG.retry?.initialDelay,
    );
  });
});

Deno.test("LLM Config - 検証", async (t) => {
  await t.step("有効な設定を受け入れる", () => {
    const config = {
      provider: "openrouter",
      model: "test-model",
    };

    assert(validateConfig(config), "有効な設定は受け入れられるべき");
  });

  await t.step("providerがない設定を拒否", () => {
    const config = {
      model: "test-model",
    };

    assert(!validateConfig(config), "providerがない設定は拒否されるべき");
  });

  await t.step("modelがない設定を拒否", () => {
    const config = {
      provider: "openrouter",
    };

    assert(!validateConfig(config), "modelがない設定は拒否されるべき");
  });

  await t.step("nullを拒否", () => {
    assert(!validateConfig(null), "nullは拒否されるべき");
  });

  await t.step("undefinedを拒否", () => {
    assert(!validateConfig(undefined), "undefinedは拒否されるべき");
  });
});

Deno.test("LLM Config - モック設定", async (t) => {
  await t.step("モック設定を作成できる", () => {
    const config = createMockConfig();

    assertEquals(config.provider, "mock");
    assertEquals(config.model, "mock-model");
  });
});
