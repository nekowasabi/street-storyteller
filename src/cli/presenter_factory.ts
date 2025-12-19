/**
 * OutputPresenterファクトリ
 * Presenterの生成ロジックを一元化するファクトリパターン実装
 */

import type { OutputPresenter } from "@storyteller/cli/types.ts";
import {
  createConsolePresenter,
  createJsonOutputPresenter,
} from "@storyteller/cli/output_presenter.ts";

/**
 * Presenter種別
 */
export const PresenterType = {
  CONSOLE: "console",
  JSON: "json",
} as const;

export type PresenterTypeValue =
  typeof PresenterType[keyof typeof PresenterType];

/**
 * Presenter生成オプション
 */
export interface PresenterOptions {
  readonly json?: boolean;
}

/**
 * OutputPresenterファクトリクラス
 * Presenterの生成ロジックを一元管理
 */
export class PresenterFactory {
  /**
   * オプションに基づいてPresenterを生成
   * @param options 生成オプション
   * @returns OutputPresenter実装
   */
  createPresenter(options: PresenterOptions): OutputPresenter {
    if (options.json === true) {
      return createJsonOutputPresenter();
    }
    return createConsolePresenter();
  }

  /**
   * 種別を指定してPresenterを生成
   * @param type Presenter種別
   * @returns OutputPresenter実装
   */
  createPresenterByType(type: PresenterTypeValue): OutputPresenter {
    switch (type) {
      case PresenterType.JSON:
        return createJsonOutputPresenter();
      case PresenterType.CONSOLE:
      default:
        return createConsolePresenter();
    }
  }
}

// シングルトンインスタンス
let defaultFactory: PresenterFactory | null = null;

/**
 * デフォルトのPresenterFactoryを取得（シングルトン）
 * @returns PresenterFactoryインスタンス
 */
export function getDefaultPresenterFactory(): PresenterFactory {
  if (!defaultFactory) {
    defaultFactory = new PresenterFactory();
  }
  return defaultFactory;
}
