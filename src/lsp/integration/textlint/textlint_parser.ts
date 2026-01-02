// src/lsp/integration/textlint/textlint_parser.ts

/**
 * textlintメッセージ
 *
 * textlintが出力する個別の問題を表します。
 * LSP診断に変換される前の中間形式です。
 */
export interface TextlintMessage {
  /** ルールID（例: "prh", "ja-spacing/ja-space-between-half-and-full-width"） */
  ruleId: string;

  /** 重要度: 0=info, 1=warning, 2=error */
  severity: number;

  /** メッセージ本文 */
  message: string;

  /** 行番号（1始まり） */
  line: number;

  /** 列番号（1始まり） */
  column: number;

  /** 文字インデックス（0始まり）オプショナル */
  index?: number;

  /** 修正情報（--fixで使用）オプショナル */
  fix?: {
    range: [number, number];
    text: string;
  };
}

/**
 * textlint結果
 *
 * ファイル単位のtextlint実行結果を表します。
 */
export interface TextlintResult {
  /** ファイルパス */
  filePath: string;

  /** 検出された問題の配列 */
  messages: TextlintMessage[];
}

/**
 * textlint JSON出力をパース
 *
 * `textlint --format json` の出力をパースし、TextlintResultに変換します。
 * 不正なJSONや空出力の場合は空の結果を返します。
 *
 * @param output textlintのJSON出力文字列
 * @param filePath ファイルパス（結果に設定される）
 * @returns パース結果
 *
 * @example
 * ```typescript
 * const output = '[{"filePath":"/test.md","messages":[...]}]';
 * const result = parseTextlintOutput(output, "/test.md");
 * console.log(`Found ${result.messages.length} issues`);
 * ```
 */
export function parseTextlintOutput(
  output: string,
  filePath: string,
): TextlintResult {
  if (!output || output.trim() === "") {
    return { filePath, messages: [] };
  }

  try {
    const parsed = JSON.parse(output);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { filePath, messages: [] };
    }

    // textlintは配列形式で返す
    const fileResult = parsed[0];
    if (!fileResult || !Array.isArray(fileResult.messages)) {
      return { filePath, messages: [] };
    }

    const messages: TextlintMessage[] = fileResult.messages.map((msg: {
      ruleId?: string;
      severity?: number;
      message?: string;
      line?: number;
      column?: number;
      index?: number;
      fix?: { range: [number, number]; text: string };
    }) => ({
      ruleId: msg.ruleId ?? "unknown",
      severity: msg.severity ?? 1,
      message: msg.message ?? "",
      line: msg.line ?? 1,
      column: msg.column ?? 1,
      index: msg.index,
      fix: msg.fix,
    }));

    return { filePath, messages };
  } catch (error) {
    // JSON解析エラー
    if (Deno.env.get("STORYTELLER_DEBUG")) {
      console.error(
        `[TextlintParser] Failed to parse textlint output: ${error}\nOutput: ${output.substring(0, 200)}`
      );
    }
    return { filePath, messages: [] };
  }
}
