/**
 * storytellerエンティティ診断ソース
 * 既存のDiagnosticsGeneratorをDiagnosticSourceインターフェースにラップ
 *
 * @module storyteller_diagnostic_source
 */

import type { Diagnostic } from "./diagnostics_generator.ts";
import type { DiagnosticSource } from "./diagnostic_source.ts";
import type { DiagnosticsGenerator } from "./diagnostics_generator.ts";

/**
 * storytellerエンティティ診断ソース
 *
 * 既存のDiagnosticsGeneratorをDiagnosticSourceにラップし、
 * DiagnosticAggregatorで他の診断ソース（textlint等）と統合可能にする。
 *
 * @example
 * ```typescript
 * const detector = new PositionedDetector([...]);
 * const generator = new DiagnosticsGenerator(detector);
 * const source = new StorytellerDiagnosticSource(generator);
 *
 * const diagnostics = await source.generate(uri, content, projectRoot);
 * ```
 */
export class StorytellerDiagnosticSource implements DiagnosticSource {
  /**
   * ソース識別子
   * 診断メッセージのsourceフィールドに"storyteller"が設定される
   */
  readonly name = "storyteller";

  /**
   * @param generator 既存の診断生成器
   */
  constructor(private readonly generator: DiagnosticsGenerator) {}

  /**
   * storyteller診断は常に利用可能
   * 外部ツールに依存しない内蔵機能のため、常にtrueを返す
   *
   * @returns 常にtrue
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * 診断を生成
   * DiagnosticsGeneratorに委譲して診断を生成する
   *
   * @param uri ドキュメントURI
   * @param content ドキュメントの内容
   * @param projectRoot プロジェクトのルートパス
   * @returns 診断の配列
   */
  async generate(
    uri: string,
    content: string,
    projectRoot: string,
  ): Promise<Diagnostic[]> {
    return this.generator.generate(uri, content, projectRoot);
  }
}
