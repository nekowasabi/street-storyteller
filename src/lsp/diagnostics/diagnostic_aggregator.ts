// src/lsp/diagnostics/diagnostic_aggregator.ts
import type { Diagnostic } from "./diagnostics_generator.ts";
import type { DiagnosticSource } from "./diagnostic_source.ts";

/**
 * 複数の診断ソースを統合するアグリゲーター
 *
 * DiagnosticAggregatorは複数のDiagnosticSourceを管理し、
 * 各ソースから並列に診断を取得してマージする。
 *
 * @example
 * ```typescript
 * const aggregator = new DiagnosticAggregator([
 *   storytellerSource,
 *   textlintSource,
 * ]);
 *
 * const diagnostics = await aggregator.generate(uri, content, projectRoot);
 * // storytellerとtextlintの診断が統合される
 * ```
 */
export class DiagnosticAggregator {
  private sources: DiagnosticSource[] = [];

  /**
   * @param sources 初期診断ソース配列
   */
  constructor(sources: DiagnosticSource[] = []) {
    this.sources = [...sources];
  }

  /**
   * ソースを追加
   * @param source 追加する診断ソース
   */
  addSource(source: DiagnosticSource): void {
    this.sources.push(source);
  }

  /**
   * ソースを削除
   * @param name 削除するソースの識別子
   */
  removeSource(name: string): void {
    this.sources = this.sources.filter((s) => s.name !== name);
  }

  /**
   * すべてのソースから診断を並列取得してマージ
   *
   * 各ソースの利用可能性を確認した後、利用可能なソースから並列に診断を取得。
   * 一つのソースが失敗しても、他のソースの診断は返される。
   *
   * @param uri ドキュメントURI
   * @param content ドキュメントの内容
   * @param projectRoot プロジェクトのルートパス
   * @returns マージされた診断の配列
   */
  async generate(
    uri: string,
    content: string,
    projectRoot: string,
  ): Promise<Diagnostic[]> {
    // 利用可能なソースをフィルタ
    const availabilityChecks = await Promise.all(
      this.sources.map(async (source) => ({
        source,
        available: await source.isAvailable().catch(() => false),
      })),
    );

    const availableSources = availabilityChecks
      .filter(({ available }) => available)
      .map(({ source }) => source);

    // 並列実行（Promise.allSettledで部分失敗に対応）
    const results = await Promise.allSettled(
      availableSources.map(async (source) => {
        const diagnostics = await source.generate(uri, content, projectRoot);
        // sourceフィールドを設定
        return diagnostics.map((d) => ({
          ...d,
          source: source.name,
        }));
      }),
    );

    // 成功した結果のみマージ
    const merged: Diagnostic[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "fulfilled") {
        merged.push(...result.value);
      } else {
        // 診断生成失敗をログ出力（デバッグ時のみ）
        const sourceName = availableSources[i]?.name ?? "unknown";
        if (Deno.env.get("STORYTELLER_DEBUG")) {
          console.error(
            `[DiagnosticAggregator] Failed to generate diagnostics from source "${sourceName}": ${result.reason}`,
          );
        }
      }
    }

    return merged;
  }

  /**
   * すべてのソースをキャンセル
   * 進行中の診断生成を中断する
   */
  cancelAll(): void {
    for (const source of this.sources) {
      source.cancel?.();
    }
  }

  /**
   * すべてのソースを破棄
   * リソースをクリーンアップしてソースリストを空にする
   */
  dispose(): void {
    for (const source of this.sources) {
      source.dispose?.();
    }
    this.sources = [];
  }
}
