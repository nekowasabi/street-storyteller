/**
 * LLM設定の型定義
 *
 * storyteller.llm.json の形式を定義
 */

/**
 * リトライ設定
 */
export type RetryConfig = {
  /** 最大リトライ回数 */
  readonly maxRetries: number;
  /** 初期遅延（ミリ秒） */
  readonly initialDelay: number;
  /** 最大遅延（ミリ秒） */
  readonly maxDelay: number;
  /** バックオフ戦略 */
  readonly backoff: "linear" | "exponential";
};

/**
 * 安全設定（過剰実行防止）
 */
export type SafetyConfig = {
  /**
   * セッション（コマンド実行）あたりの最大API呼び出し回数
   * 0 の場合は無制限
   * @default 10
   */
  readonly maxCallsPerSession: number;

  /**
   * 時間窓あたりの最大呼び出し回数（レートリミット）
   * 0 の場合は無制限
   * @default 0 (無制限)
   */
  readonly maxCallsPerWindow?: number;

  /**
   * 時間窓の長さ（ミリ秒）
   * @default 60000 (1分)
   */
  readonly windowMs?: number;

  /**
   * 警告を表示する残り呼び出し回数
   * @default 2
   */
  readonly warningThreshold?: number;
};

/**
 * LLM設定
 */
export type LLMConfig = {
  /** プロバイダー名 */
  readonly provider: "openrouter" | "mock";
  /** モデルID */
  readonly model: string;
  /** OpenRouter用プロバイダー優先順位 */
  readonly providerOrder?: readonly string[];
  /** タイムアウト（ミリ秒） */
  readonly timeout?: number;
  /** リトライ設定 */
  readonly retry?: Partial<RetryConfig>;
  /** APIキー（環境変数名またはリテラル） */
  readonly apiKey?: string;
  /** ベースURL（オプション） */
  readonly baseUrl?: string;
  /** 安全設定（過剰実行防止） */
  readonly safety?: Partial<SafetyConfig>;
};

/**
 * デフォルト安全設定
 */
export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  maxCallsPerSession: 10,
  maxCallsPerWindow: 0, // 無制限
  windowMs: 60000,
  warningThreshold: 2,
};

/**
 * デフォルト設定
 */
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: "openrouter",
  model: "anthropic/claude-3-haiku",
  timeout: 30000,
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoff: "exponential",
  },
  safety: DEFAULT_SAFETY_CONFIG,
};

/**
 * 設定をマージしてデフォルト値を適用
 */
export function mergeWithDefaults(
  config: Partial<LLMConfig>,
): LLMConfig {
  return {
    ...DEFAULT_LLM_CONFIG,
    ...config,
    retry: {
      ...DEFAULT_LLM_CONFIG.retry,
      ...config.retry,
    },
    safety: {
      ...DEFAULT_SAFETY_CONFIG,
      ...config.safety,
    },
  };
}

/**
 * 設定を検証
 */
export function validateConfig(
  config: unknown,
): config is LLMConfig {
  if (!config || typeof config !== "object") {
    return false;
  }

  const c = config as Record<string, unknown>;

  // provider は必須
  if (typeof c.provider !== "string") {
    return false;
  }

  // model は必須
  if (typeof c.model !== "string") {
    return false;
  }

  return true;
}
