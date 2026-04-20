/**
 * 補完プロバイダー
 * @トリガーでキャラクター・設定・伏線の補完候補を提供
 * "トリガーでリテラル型の値を補完
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_completion
 */

import type { DetectableEntity } from "@storyteller/lsp/detection/positioned_detector.ts";
import { getKindLabel } from "@storyteller/lsp/utils/entity_kind.ts";
import { LiteralTypeCompletionProvider } from "@storyteller/lsp/providers/literal_type_completion_provider.ts";

/**
 * LSP CompletionItemKind
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#completionItemKind
 */
export const CompletionItemKind = {
  Text: 1,
  Method: 2,
  Function: 3,
  Constructor: 4,
  Field: 5,
  Variable: 6,
  Class: 7,
  Interface: 8,
  Module: 9,
  Property: 10,
  Unit: 11,
  Value: 12,
  Enum: 13,
  Keyword: 14,
  Snippet: 15,
  Color: 16,
  File: 17,
  Reference: 18,
  Folder: 19,
  EnumMember: 20,
  Constant: 21,
  Struct: 22,
  Event: 23,
  Operator: 24,
  TypeParameter: 25,
} as const;

export type CompletionItemKind =
  (typeof CompletionItemKind)[keyof typeof CompletionItemKind];

/**
 * 補完アイテム
 */
export type CompletionItem = {
  /** 表示ラベル */
  readonly label: string;
  /** 補完の種類 */
  readonly kind: CompletionItemKind;
  /** 詳細情報 */
  readonly detail?: string;
  /** ドキュメント（Markdown対応） */
  readonly documentation?: string | { kind: "markdown"; value: string };
  /** 挿入するテキスト */
  readonly insertText?: string;
  /** ソート用テキスト */
  readonly sortText?: string;
  /** フィルター用テキスト */
  readonly filterText?: string;
};

/**
 * 補完リスト
 */
export type CompletionList = {
  /** 不完全フラグ（追加の補完が必要かどうか） */
  readonly isIncomplete: boolean;
  /** 補完アイテム */
  readonly items: readonly CompletionItem[];
};

/**
 * 補完プロバイダークラス
 */
export class CompletionProvider {
  private readonly entities: DetectableEntity[];
  private readonly literalTypeProvider: LiteralTypeCompletionProvider;

  constructor(entities: DetectableEntity[]) {
    this.entities = entities;
    this.literalTypeProvider = new LiteralTypeCompletionProvider();
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
    // カーソル位置の前の文字を取得
    const lines = content.split("\n");
    const currentLine = lines[line] ?? "";
    const beforeCursor = currentLine.slice(0, character);

    // @トリガーの検出（エンティティ補完）
    const atIndex = beforeCursor.lastIndexOf("@");
    if (atIndex !== -1) {
      // @の後の文字列（フィルター用）
      const prefix = beforeCursor.slice(atIndex + 1).toLowerCase();

      // 補完候補を生成
      const items: CompletionItem[] = [];

      for (const entity of this.entities) {
        // プレフィックスでフィルタリング
        const matchesPrefix = entity.id.toLowerCase().includes(prefix) ||
          entity.name.toLowerCase().includes(prefix) ||
          (entity.displayNames ?? []).some((dn) =>
            dn.toLowerCase().includes(prefix)
          );

        if (!matchesPrefix && prefix.length > 0) continue;

        const kind = this.getCompletionItemKind(entity.kind);
        const detail = this.getDetailText(entity);
        const documentation = this.getDocumentation(entity);

        items.push({
          label: entity.name,
          kind,
          detail,
          documentation,
          insertText: entity.id,
          sortText: this.getSortText(entity),
          filterText: `@${entity.id} ${entity.name} ${
            (entity.displayNames ?? []).join(" ")
          }`,
        });
      }

      return {
        isIncomplete: false,
        items,
      };
    }

    // "トリガーの検出（リテラル型補完）
    // LiteralTypeCompletionProviderに委譲
    return this.literalTypeProvider.getCompletions(
      uri,
      content,
      line,
      character,
    );
  }

  /**
   * エンティティ種別からCompletionItemKindを取得
   */
  private getCompletionItemKind(
    entityKind: "character" | "setting" | "foreshadowing",
  ): CompletionItemKind {
    switch (entityKind) {
      case "character":
        return CompletionItemKind.Class; // キャラクター = クラス
      case "setting":
        return CompletionItemKind.Module; // 設定 = モジュール
      case "foreshadowing":
        return CompletionItemKind.Event; // 伏線 = イベント
      default:
        return CompletionItemKind.Text;
    }
  }

  /**
   * 詳細テキストを取得
   */
  private getDetailText(entity: DetectableEntity): string {
    const kindLabel = this.getKindLabel(entity.kind);
    return `[${kindLabel}] ${entity.filePath}`;
  }

  private getKindLabel(kind: "character" | "setting" | "foreshadowing"): string {
    return getKindLabel(kind);
  }

  /**
   * ドキュメントを取得
   */
  private getDocumentation(
    entity: DetectableEntity,
  ): { kind: "markdown"; value: string } {
    const lines: string[] = [];

    lines.push(`**${entity.name}** (${this.getKindLabel(entity.kind)})`);
    lines.push("");
    lines.push(`ID: \`${entity.id}\``);

    if (entity.displayNames && entity.displayNames.length > 0) {
      lines.push(`別名: ${entity.displayNames.join(", ")}`);
    }

    if (entity.status) {
      const statusLabel = this.getStatusLabel(entity.status);
      lines.push(`ステータス: ${statusLabel}`);
    }

    lines.push("");
    lines.push(`ファイル: \`${entity.filePath}\``);

    return {
      kind: "markdown",
      value: lines.join("\n"),
    };
  }

  /**
   * 伏線ステータスラベルを取得
   */
  private getStatusLabel(
    status: "planted" | "partially_resolved" | "resolved" | "abandoned",
  ): string {
    switch (status) {
      case "planted":
        return "🌱 未回収";
      case "partially_resolved":
        return "🌿 部分回収";
      case "resolved":
        return "✅ 回収済み";
      case "abandoned":
        return "❌ 放棄";
      default:
        return status;
    }
  }

  /**
   * ソートテキストを取得（種別順にソート）
   */
  private getSortText(entity: DetectableEntity): string {
    const kindOrder = {
      character: "1",
      setting: "2",
      foreshadowing: "3",
    };
    return `${kindOrder[entity.kind]}_${entity.name}`;
  }
}
