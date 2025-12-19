/**
 * LLM Call Limiter
 *
 * API呼び出し回数を制限し、過剰な実行を防止する
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type { Result } from "@storyteller/shared/result.ts";

/**
 * 呼び出し制限エラー
 */
export type CallLimitError = {
  readonly code: "call_limit_exceeded";
  readonly message: string;
  readonly currentCount: number;
  readonly maxCalls: number;
};

/**
 * 呼び出し制限の設定
 */
export type CallLimitConfig = {
  /**
   * 最大呼び出し回数
   * 0 または undefined の場合は無制限
   */
  readonly maxCalls: number;

  /**
   * 時間窓（ミリ秒）
   * 指定した場合、この時間内での呼び出し回数を制限
   * 未指定の場合はセッション全体で制限
   */
  readonly timeWindowMs?: number;

  /**
   * 警告閾値
   * 残り呼び出し回数がこの値以下になったら警告
   */
  readonly warningThreshold?: number;

  /**
   * 警告時のコールバック
   */
  readonly onWarning?: (remainingCalls: number) => void;
};

/**
 * 呼び出し制限管理クラス
 */
export class CallLimiter {
  private readonly config: CallLimitConfig;
  private callCount = 0;
  private windowStartTime: number = Date.now();
  private warningTriggered = false;

  constructor(config: CallLimitConfig) {
    this.config = config;
  }

  /**
   * API呼び出しを試行
   * 制限内であれば成功、超過していればエラーを返す
   */
  tryCall(): Result<void, CallLimitError> {
    // 無制限モード
    if (!this.config.maxCalls || this.config.maxCalls <= 0) {
      this.callCount++;
      return ok(undefined);
    }

    // 時間窓のチェック
    if (this.config.timeWindowMs) {
      const now = Date.now();
      const elapsed = now - this.windowStartTime;

      if (elapsed >= this.config.timeWindowMs) {
        // 新しい時間窓を開始
        this.windowStartTime = now;
        this.callCount = 0;
        this.warningTriggered = false;
      }
    }

    // 上限チェック
    if (this.callCount >= this.config.maxCalls) {
      return err({
        code: "call_limit_exceeded",
        message:
          `API call limit exceeded: ${this.callCount}/${this.config.maxCalls} calls`,
        currentCount: this.callCount,
        maxCalls: this.config.maxCalls,
      });
    }

    // 呼び出しカウント
    this.callCount++;

    // 警告チェック
    this.checkWarning();

    return ok(undefined);
  }

  /**
   * 現在の呼び出し回数を取得
   */
  getCurrentCount(): number {
    return this.callCount;
  }

  /**
   * 残り呼び出し回数を取得
   */
  getRemainingCalls(): number {
    if (!this.config.maxCalls || this.config.maxCalls <= 0) {
      return Infinity;
    }
    return Math.max(0, this.config.maxCalls - this.callCount);
  }

  /**
   * 上限に達しているかチェック
   */
  isLimitReached(): boolean {
    if (!this.config.maxCalls || this.config.maxCalls <= 0) {
      return false;
    }
    return this.callCount >= this.config.maxCalls;
  }

  /**
   * カウンターをリセット
   */
  reset(): void {
    this.callCount = 0;
    this.windowStartTime = Date.now();
    this.warningTriggered = false;
  }

  /**
   * 警告をチェックして必要なら発火
   */
  private checkWarning(): void {
    if (
      !this.warningTriggered &&
      this.config.warningThreshold &&
      this.config.onWarning
    ) {
      const remaining = this.getRemainingCalls();
      if (remaining <= this.config.warningThreshold) {
        this.warningTriggered = true;
        this.config.onWarning(remaining);
      }
    }
  }
}

/**
 * デフォルトの呼び出し制限設定
 */
export const DEFAULT_CALL_LIMIT_CONFIG: CallLimitConfig = {
  maxCalls: 10, // デフォルトは10回まで
  warningThreshold: 2, // 残り2回で警告
};
