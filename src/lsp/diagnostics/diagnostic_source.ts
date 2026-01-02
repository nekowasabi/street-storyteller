/**
 * 診断ソースインターフェース
 * 複数の診断プロバイダー（storyteller、textlint等）を統合するための抽象化
 *
 * @module diagnostic_source
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#diagnostic
 */

import type { Diagnostic } from "./diagnostics_generator.ts";

/**
 * 診断ソースインターフェース
 *
 * 複数の診断プロバイダーを統合するための共通インターフェース。
 * 各診断ソース（storyteller、textlint等）はこのインターフェースを実装し、
 * DiagnosticAggregatorで統合される。
 *
 * @example
 * ```typescript
 * const source: DiagnosticSource = {
 *   name: "mySource",
 *   isAvailable: async () => true,
 *   generate: async (uri, content, projectRoot) => [...diagnostics],
 * };
 * ```
 */
export interface DiagnosticSource {
  /**
   * ソース識別子
   * 診断メッセージのsourceフィールドに使用される
   * @example "storyteller", "textlint"
   */
  readonly name: string;

  /**
   * ソースが利用可能かどうかを確認
   * 外部ツール（textlint等）の存在確認に使用
   * @returns 利用可能な場合はtrue
   */
  isAvailable(): Promise<boolean>;

  /**
   * 診断を生成
   * @param uri ドキュメントURI
   * @param content ドキュメントの内容
   * @param projectRoot プロジェクトのルートパス
   * @returns 診断の配列
   */
  generate(
    uri: string,
    content: string,
    projectRoot: string,
  ): Promise<Diagnostic[]>;

  /**
   * 進行中の操作をキャンセル（オプショナル）
   * 非同期操作中に新しいリクエストが来た場合に使用
   */
  cancel?(): void;

  /**
   * リソースを解放（オプショナル）
   * サーバー終了時にクリーンアップを行う
   */
  dispose?(): void;
}
