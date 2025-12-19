/**
 * コンテキスト解析器
 * カーソル位置のフィールドコンテキストを解析
 */

import type { FieldContext } from "@storyteller/lsp/providers/literal_type_registry.ts";

/**
 * 拡張フィールドコンテキスト（プレフィックス付き）
 */
export type ExtendedFieldContext = FieldContext & {
  /** カーソル位置までのプレフィックス（文字列リテラル内のテキスト） */
  readonly prefix: string;
};

/**
 * サポートする親型のリスト
 */
const SUPPORTED_PARENT_TYPES = [
  "Foreshadowing",
  "Character",
  "Setting",
  "Timeline",
  "TimelineEvent",
  "CharacterPhase",
] as const;

/**
 * コンテキスト解析器クラス
 */
export class ContextAnalyzer {
  /**
   * コンテンツとカーソル位置からフィールドコンテキストを解析
   * @param content ドキュメント内容
   * @param line 行番号（0-based）
   * @param character 文字位置（0-based）
   * @param fileType ファイルタイプ（デフォルト: "ts"）
   * @returns フィールドコンテキスト
   */
  analyze(
    content: string,
    line: number,
    character: number,
    fileType: "ts" | "yaml" | "json" = "ts",
  ): ExtendedFieldContext {
    const lines = content.split("\n");
    const currentLine = lines[line] ?? "";

    // 範囲外チェック
    if (line >= lines.length || character > currentLine.length) {
      return this.createEmptyContext();
    }

    // 文字列リテラルの検出
    const stringInfo = this.detectStringLiteral(currentLine, character);

    // フィールド名の検出
    const fieldName = this.findFieldName(currentLine, fileType);

    // 親型の推定
    const parentType = this.inferParentType(content);

    // オブジェクトパスの検出
    const objectPath = this.buildObjectPath(lines, line);

    // プレフィックスの計算
    const prefix = stringInfo.inString
      ? currentLine.slice(stringInfo.start + 1, character)
      : "";

    return {
      fieldName: fieldName ?? "",
      parentType,
      objectPath,
      inStringLiteral: stringInfo.inString,
      stringStart: stringInfo.start,
      stringEnd: stringInfo.end,
      prefix,
    };
  }

  /**
   * 空のコンテキストを作成
   */
  private createEmptyContext(): ExtendedFieldContext {
    return {
      fieldName: "",
      parentType: null,
      objectPath: [],
      inStringLiteral: false,
      stringStart: -1,
      stringEnd: -1,
      prefix: "",
    };
  }

  /**
   * 文字列リテラルの境界を検出
   * @param line 現在の行
   * @param position カーソル位置
   * @returns 文字列リテラル情報
   */
  private detectStringLiteral(
    line: string,
    position: number,
  ): { inString: boolean; start: number; end: number; quote: string } {
    let inString = false;
    let stringStart = -1;
    let quoteChar = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prevChar = i > 0 ? line[i - 1] : "";

      // エスケープされた引用符はスキップ
      if (prevChar === "\\") continue;

      // 引用符の検出（ダブルまたはシングル）
      if (char === '"' || char === "'") {
        if (!inString) {
          // 文字列開始
          inString = true;
          stringStart = i;
          quoteChar = char;
        } else if (char === quoteChar) {
          // 文字列終了
          // 空文字列の場合: position が stringStart + 1 == i なら内部とみなす
          // 通常の場合: position > stringStart && position <= i
          if (position > stringStart && position <= i) {
            // カーソルがこの文字列リテラル内にある
            return {
              inString: true,
              start: stringStart,
              end: i,
              quote: quoteChar,
            };
          }
          inString = false;
          stringStart = -1;
          quoteChar = "";
        }
      }
    }

    // 未閉じの文字列リテラル内にカーソルがある場合
    if (inString && position > stringStart) {
      return { inString: true, start: stringStart, end: -1, quote: quoteChar };
    }

    return { inString: false, start: -1, end: -1, quote: "" };
  }

  /**
   * フィールド名を検出
   * @param line 現在の行
   * @param fileType ファイルタイプ
   * @returns フィールド名またはnull
   */
  private findFieldName(
    line: string,
    fileType: "ts" | "yaml" | "json",
  ): string | null {
    // TypeScript/JSON形式: fieldName: "value" または "fieldName": "value"
    // YAML形式: fieldName: "value" または - fieldName: "value"

    // JSON形式: "fieldName": "value" (行の任意の位置)
    const jsonMatch = line.match(/"(\w+)"\s*:\s*["']/);
    if (jsonMatch) return jsonMatch[1];

    // TypeScript形式: fieldName: "value" (行の任意の位置)
    // オブジェクトリテラル内でも検出できるようにする
    const tsMatch = line.match(/(\w+)\s*:\s*["']/);
    if (tsMatch) return tsMatch[1];

    // 行頭からのYAML形式: - fieldName: value
    if (fileType === "yaml") {
      const yamlMatch = line.match(/^\s*-?\s*(\w+)\s*:/);
      if (yamlMatch) return yamlMatch[1];
    }

    return null;
  }

  /**
   * 親型を推定
   * @param content ドキュメント全体
   * @returns 推定される親型またはnull
   */
  private inferParentType(content: string): string | null {
    // 変数宣言の型注釈を探す
    // パターン: const/let/var name: TypeName =
    for (const typeName of SUPPORTED_PARENT_TYPES) {
      const pattern = new RegExp(`:\\s*${typeName}\\s*=`);
      if (pattern.test(content)) {
        return typeName;
      }
    }

    // 関数引数やオブジェクトリテラル内の型注釈も探す
    // パターン: : TypeName[] = または : TypeName[] | undefined
    for (const typeName of SUPPORTED_PARENT_TYPES) {
      const arrayPattern = new RegExp(`:\\s*${typeName}\\[\\]`);
      if (arrayPattern.test(content)) {
        return typeName;
      }
    }

    // satisfies キーワードの型注釈
    // パターン: } satisfies TypeName
    for (const typeName of SUPPORTED_PARENT_TYPES) {
      const satisfiesPattern = new RegExp(`satisfies\\s+${typeName}`);
      if (satisfiesPattern.test(content)) {
        return typeName;
      }
    }

    return null;
  }

  /**
   * オブジェクトパスを構築
   * カーソル位置から上方向にネスト構造を解析
   * @param lines 全行
   * @param currentLine カーソルのある行
   * @returns オブジェクトパス
   */
  private buildObjectPath(lines: string[], currentLine: number): string[] {
    const path: string[] = [];
    const currentIndent = this.getIndentLevel(lines[currentLine] ?? "");

    // 上方向に探索
    for (let i = currentLine - 1; i >= 0; i--) {
      const line = lines[i];
      const lineIndent = this.getIndentLevel(line);

      // より浅いインデントの行を探す
      if (lineIndent < currentIndent) {
        // オブジェクトキーを抽出
        // パターン: keyName: { または "keyName": {
        const keyMatch = line.match(/^\s*"?(\w+)"?\s*:\s*\{?\s*$/);
        if (keyMatch) {
          path.unshift(keyMatch[1]);
        }

        // さらに上位を探す必要がある場合
        if (lineIndent > 0) {
          const parentPath = this.buildObjectPath(lines, i);
          return [...parentPath, ...path];
        }
        break;
      }
    }

    return path;
  }

  /**
   * インデントレベルを取得
   * @param line 行
   * @returns スペース数
   */
  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }
}
