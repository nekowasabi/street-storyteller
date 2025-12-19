/**
 * LLM モジュール
 *
 * LLMプロバイダーと設定を公開
 */

// 型定義
export type {
  LLMCallOptions,
  LLMError,
  LLMMessage,
  LLMProvider,
  LLMResponse,
  MessageRole,
  StreamingLLMProvider,
} from "@storyteller/llm/providers/provider.ts";

export { isStreamingProvider } from "@storyteller/llm/providers/provider.ts";

// 設定
export type {
  LLMConfig,
  RetryConfig,
  SafetyConfig,
} from "@storyteller/llm/config/llm_config.ts";
export {
  DEFAULT_LLM_CONFIG,
  DEFAULT_SAFETY_CONFIG,
  mergeWithDefaults,
  validateConfig,
} from "@storyteller/llm/config/llm_config.ts";

export type { ConfigLoaderError } from "@storyteller/llm/config/loader.ts";
export {
  createMockConfig,
  loadLLMConfig,
} from "@storyteller/llm/config/loader.ts";

// プロバイダー
export { OpenRouterProvider } from "@storyteller/llm/providers/openrouter.ts";
export {
  MockLLMProvider,
  type MockLLMProviderOptions,
} from "@storyteller/llm/providers/mock.ts";

// ファクトリー
export type {
  ProviderFactoryError,
  SafeProviderCallbacks,
} from "@storyteller/llm/providers/factory.ts";
export {
  createProvider,
  createSafeProvider,
} from "@storyteller/llm/providers/factory.ts";

// 安全機能
export type {
  CallLimitConfig,
  CallLimitError,
} from "@storyteller/llm/safety/call_limiter.ts";
export {
  CallLimiter,
  DEFAULT_CALL_LIMIT_CONFIG,
} from "@storyteller/llm/safety/call_limiter.ts";

export type { SafeLLMProviderOptions } from "@storyteller/llm/safety/safe_provider.ts";
export {
  SafeLLMProvider,
  wrapWithSafety,
} from "@storyteller/llm/safety/safe_provider.ts";
