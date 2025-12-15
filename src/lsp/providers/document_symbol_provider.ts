/**
 * DocumentSymbolProvider
 * markdownファイル内のシンボル（ヘッダー、エンティティ）を提供
 *
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_documentSymbol
 */

import {
  type PositionedDetector,
  type PositionedMatch,
} from "../detection/positioned_detector.ts";
import {
  type DocumentSymbol,
  type Range,
  SymbolKind,
  type SymbolKindType,
} from "./lsp_types.ts";

/**
 * ヘッダー情報の内部表現
 */
type HeaderInfo = {
  readonly level: number;
  readonly name: string;
  readonly line: number;
  readonly startChar: number;
  readonly endChar: number;
  readonly textStartChar: number;
};

/**
 * DocumentSymbolProvider
 * markdownヘッダーとエンティティをシンボルとして提供
 */
export class DocumentSymbolProvider {
  constructor(private readonly detector: PositionedDetector) {}

  /**
   * ドキュメント内のシンボルを取得
   */
  async getDocumentSymbols(
    content: string,
    _projectPath: string,
  ): Promise<DocumentSymbol[]> {
    // 1. markdownヘッダーを解析
    const headers = this.parseMarkdownHeaders(content);

    // 2. エンティティを検出
    const matches = this.detector.detectWithPositions(content);
    const entitySymbols = this.convertMatchesToSymbols(matches);

    // 3. ヘッダー構造を構築し、エンティティをマージ
    return this.buildSymbolTree(headers, entitySymbols, content);
  }

  /**
   * markdownヘッダーを解析
   */
  private parseMarkdownHeaders(content: string): HeaderInfo[] {
    const headers: HeaderInfo[] = [];
    const lines = content.split("\n");
    const regex = /^(#{1,6})\s+(.+)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(regex);
      if (match) {
        const level = match[1].length;
        const name = match[2].trim();
        const textStartChar = match[1].length + 1; // "# " の後

        headers.push({
          level,
          name,
          line: i,
          startChar: 0,
          endChar: line.length,
          textStartChar,
        });
      }
    }

    return headers;
  }

  /**
   * PositionedMatchをDocumentSymbolに変換
   */
  private convertMatchesToSymbols(matches: PositionedMatch[]): DocumentSymbol[] {
    const symbols: DocumentSymbol[] = [];

    for (const match of matches) {
      // 最初の出現位置のみをシンボルとして使用
      if (match.positions.length === 0) continue;

      const pos = match.positions[0];
      const kind = this.getSymbolKindForEntity(match.kind);

      symbols.push({
        name: match.matchedPattern,
        detail: `${match.kind} (${Math.round(match.confidence * 100)}%)`,
        kind,
        range: {
          start: { line: pos.line, character: pos.character },
          end: { line: pos.line, character: pos.character + pos.length },
        },
        selectionRange: {
          start: { line: pos.line, character: pos.character },
          end: { line: pos.line, character: pos.character + pos.length },
        },
      });
    }

    return symbols;
  }

  /**
   * エンティティ種別に応じたSymbolKindを返す
   */
  private getSymbolKindForEntity(kind: "character" | "setting"): SymbolKindType {
    switch (kind) {
      case "character":
        return SymbolKind.Variable;
      case "setting":
        return SymbolKind.Object;
      default:
        return SymbolKind.Variable;
    }
  }

  /**
   * ヘッダーとエンティティからシンボルツリーを構築
   */
  private buildSymbolTree(
    headers: HeaderInfo[],
    entitySymbols: DocumentSymbol[],
    content: string,
  ): DocumentSymbol[] {
    if (headers.length === 0) {
      // ヘッダーがない場合はエンティティのみ返す
      return entitySymbols;
    }

    const lines = content.split("\n");
    const result: DocumentSymbol[] = [];
    const stack: { symbol: DocumentSymbol; level: number; endLine: number }[] =
      [];

    // 各ヘッダーの終了行を計算
    const headerEndLines = this.calculateHeaderEndLines(headers, lines.length);

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const endLine = headerEndLines[i];

      const symbol: DocumentSymbol = {
        name: header.name,
        kind: SymbolKind.String,
        range: {
          start: { line: header.line, character: header.startChar },
          end: { line: endLine, character: lines[endLine]?.length ?? 0 },
        },
        selectionRange: {
          start: { line: header.line, character: header.textStartChar },
          end: { line: header.line, character: header.endChar },
        },
        children: undefined,
      };

      // スタックから親を見つける
      while (stack.length > 0 && stack[stack.length - 1].level >= header.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // トップレベル
        result.push(symbol);
      } else {
        // 親の子として追加
        const parent = stack[stack.length - 1].symbol;
        if (!parent.children) {
          // children は readonly なので、新しいオブジェクトを作成
          const mutableParent = parent as { children?: DocumentSymbol[] };
          mutableParent.children = [];
        }
        (parent.children as DocumentSymbol[]).push(symbol);
      }

      stack.push({ symbol, level: header.level, endLine });
    }

    return result;
  }

  /**
   * 各ヘッダーの終了行を計算
   */
  private calculateHeaderEndLines(
    headers: HeaderInfo[],
    totalLines: number,
  ): number[] {
    const endLines: number[] = [];

    for (let i = 0; i < headers.length; i++) {
      const current = headers[i];
      let endLine = totalLines - 1;

      // 次のヘッダーまたは同レベル以上のヘッダーを探す
      for (let j = i + 1; j < headers.length; j++) {
        if (headers[j].level <= current.level) {
          endLine = headers[j].line - 1;
          break;
        }
      }

      endLines.push(Math.max(current.line, endLine));
    }

    return endLines;
  }
}
