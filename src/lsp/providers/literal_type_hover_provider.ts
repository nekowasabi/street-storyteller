/**
 * リテラル型ホバープロバイダー
 * TypeScriptファイル内の文字列リテラルでリテラル型のドキュメントをホバー表示
 */

import { ContextAnalyzer } from "@storyteller/lsp/providers/context_analyzer.ts";
import { LiteralTypeRegistry } from "@storyteller/lsp/providers/literal_type_registry.ts";
import type {
  Hover,
  Position,
  Range,
} from "@storyteller/lsp/providers/lsp_types.ts";

/**
 * サポートするファイル拡張子
 */
const SUPPORTED_EXTENSIONS = [".ts", ".tsx"];

/**
 * リテラル型ホバープロバイダークラス
 */
export class LiteralTypeHoverProvider {
  private readonly registry: LiteralTypeRegistry;
  private readonly analyzer: ContextAnalyzer;

  constructor() {
    this.registry = new LiteralTypeRegistry();
    this.analyzer = new ContextAnalyzer();
  }

  /**
   * ホバー情報を取得
   * @param uri ドキュメントURI
   * @param content ドキュメント内容
   * @param position カーソル位置
   * @returns ホバー情報、またはnull
   */
  getHover(
    uri: string,
    content: string,
    position: Position,
  ): Hover | null {
    // ファイル拡張子チェック
    if (!this.isSupportedFile(uri)) {
      return null;
    }

    // コンテキスト解析
    const context = this.analyzer.analyze(
      content,
      position.line,
      position.character,
      "ts",
    );

    // 文字列リテラル外なら対象外
    if (!context.inStringLiteral) {
      return null;
    }

    // フィールド名がなければ対象外
    if (!context.fieldName) {
      return null;
    }

    // マッチするリテラル型定義を検索
    const definition = this.registry.findByFieldContext(context);
    if (!definition) {
      return null;
    }

    // 文字列リテラル内の値を抽出
    const literalValue = this.extractLiteralValue(
      content,
      position.line,
      context.stringStart,
      context.stringEnd,
    );

    // 値がリテラル型の値リストに含まれているか確認
    if (!definition.values.includes(literalValue)) {
      return null;
    }

    // ドキュメントを取得
    const doc = definition.documentation?.[literalValue];
    if (!doc) {
      return null;
    }

    // ホバー範囲を計算
    const range = this.calculateRange(
      position.line,
      context.stringStart,
      context.stringEnd,
    );

    // Markdown形式でホバー内容を構築
    const markdownContent = this.buildMarkdownContent(
      literalValue,
      definition.typeName,
      doc,
    );

    return {
      contents: {
        kind: "markdown",
        value: markdownContent,
      },
      range,
    };
  }

  /**
   * サポートされるファイルかチェック
   */
  private isSupportedFile(uri: string): boolean {
    const lowerUri = uri.toLowerCase();
    return SUPPORTED_EXTENSIONS.some((ext) => lowerUri.endsWith(ext));
  }

  /**
   * 文字列リテラル内の値を抽出
   */
  private extractLiteralValue(
    content: string,
    line: number,
    stringStart: number,
    stringEnd: number,
  ): string {
    const lines = content.split("\n");
    const targetLine = lines[line] ?? "";

    // stringEnd が -1 の場合（未閉じの文字列）
    const end = stringEnd === -1 ? targetLine.length : stringEnd;

    // 引用符の内側を取得
    return targetLine.slice(stringStart + 1, end);
  }

  /**
   * ホバー範囲を計算
   */
  private calculateRange(
    line: number,
    stringStart: number,
    stringEnd: number,
  ): Range {
    return {
      start: {
        line,
        character: stringStart,
      },
      end: {
        line,
        character: stringEnd === -1 ? stringStart : stringEnd + 1,
      },
    };
  }

  /**
   * Markdown形式のホバー内容を構築
   */
  private buildMarkdownContent(
    value: string,
    typeName: string,
    documentation: string,
  ): string {
    return `**\`${value}\`** \`[${typeName}]\`\n\n${documentation}`;
  }
}
