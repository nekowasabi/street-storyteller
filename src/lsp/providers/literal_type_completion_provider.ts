/**
 * リテラル型補完プロバイダー
 * TypeScript/YAML/JSONファイル内の文字列リテラルでリテラル型の値を補完
 */

import type {
  CompletionItem,
  CompletionList,
} from "@storyteller/lsp/providers/completion_provider.ts";
import { CompletionItemKind } from "@storyteller/lsp/providers/completion_provider.ts";
import { ContextAnalyzer } from "@storyteller/lsp/providers/context_analyzer.ts";
import { LiteralTypeRegistry } from "@storyteller/lsp/providers/literal_type_registry.ts";

// CompletionItemKindをre-export
export { CompletionItemKind };

/**
 * サポートするファイル拡張子
 */
const SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".json", ".yaml", ".yml"];

/**
 * リテラル型補完プロバイダークラス
 */
export class LiteralTypeCompletionProvider {
  private readonly registry: LiteralTypeRegistry;
  private readonly analyzer: ContextAnalyzer;

  constructor() {
    this.registry = new LiteralTypeRegistry();
    this.analyzer = new ContextAnalyzer();
  }

  /**
   * 補完候補を取得
   * @param uri ドキュメントURI
   * @param content ドキュメント内容
   * @param line 行番号（0-based）
   * @param character 文字位置（0-based）
   * @returns 補完リスト
   */
  getCompletions(
    uri: string,
    content: string,
    line: number,
    character: number,
  ): CompletionList {
    // ファイル拡張子チェック
    if (!this.isSupportedFile(uri)) {
      return { isIncomplete: false, items: [] };
    }

    // ファイルタイプを判定
    const fileType = this.getFileType(uri);

    // コンテキスト解析
    const context = this.analyzer.analyze(content, line, character, fileType);

    // 文字列リテラル外なら補完しない
    if (!context.inStringLiteral) {
      return { isIncomplete: false, items: [] };
    }

    // フィールド名がなければ補完しない
    if (!context.fieldName) {
      return { isIncomplete: false, items: [] };
    }

    // マッチするリテラル型定義を検索
    const definition = this.registry.findByFieldContext(context);
    if (!definition) {
      return { isIncomplete: false, items: [] };
    }

    // プレフィックスでフィルタリング
    const prefix = context.prefix.toLowerCase();
    const filteredValues = definition.values.filter((v) =>
      v.toLowerCase().includes(prefix)
    );

    // 補完アイテム生成
    const items: CompletionItem[] = filteredValues.map((value) =>
      this.buildCompletionItem(
        value,
        definition.typeName,
        definition.documentation,
      )
    );

    return {
      isIncomplete: false,
      items,
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
   * ファイルタイプを取得
   */
  private getFileType(uri: string): "ts" | "yaml" | "json" {
    const lowerUri = uri.toLowerCase();
    if (lowerUri.endsWith(".yaml") || lowerUri.endsWith(".yml")) {
      return "yaml";
    }
    if (lowerUri.endsWith(".json")) {
      return "json";
    }
    return "ts";
  }

  /**
   * 補完アイテムを構築
   */
  private buildCompletionItem(
    value: string,
    typeName: string,
    documentation?: Record<string, string>,
  ): CompletionItem {
    const doc = documentation?.[value];

    return {
      label: value,
      kind: CompletionItemKind.EnumMember,
      detail: `[${typeName}]`,
      documentation: doc
        ? { kind: "markdown" as const, value: doc }
        : undefined,
      insertText: value,
      sortText: value,
    };
  }
}
