/**
 * Subplot File Parser
 * サブプロットファイルの読み込み・パースユーティリティ
 */

import type { PlotBeat, Subplot } from "@storyteller/types/v2/subplot.ts";

/**
 * JavaScriptオブジェクトリテラルからコメントを除去する
 * @param jsCode JavaScriptオブジェクトリテラル
 * @returns コメントを除去した文字列
 */
function removeComments(jsCode: string): string {
  // 文字列リテラル内のスラッシュを保護するため、まず文字列を一時的に置換
  const stringPlaceholders: string[] = [];
  let protectedCode = jsCode.replace(
    /(["'`])(?:(?!\1|\\).|\\.)*\1/g,
    (match) => {
      stringPlaceholders.push(match);
      return `__STRING_${stringPlaceholders.length - 1}__`;
    },
  );

  // 単一行コメントを除去
  protectedCode = protectedCode.replace(/\/\/.*$/gm, "");

  // 複数行コメントを除去
  protectedCode = protectedCode.replace(/\/\*[\s\S]*?\*\//g, "");

  // 文字列を復元
  protectedCode = protectedCode.replace(
    /__STRING_(\d+)__/g,
    (_, index) => stringPlaceholders[parseInt(index, 10)],
  );

  return protectedCode;
}

/**
 * JavaScriptオブジェクトリテラルをJSONに変換する
 * - 未引用のキーを引用符付きキーに変換
 * - トレーリングカンマを除去
 * @param jsCode JavaScriptオブジェクトリテラル
 * @returns JSON形式の文字列
 */
function convertJsObjectToJson(jsCode: string): string {
  // コメントを除去
  let code = removeComments(jsCode);

  // 未引用のキーを引用符付きキーに変換
  // パターン: { key: や , key: を "key": に変換
  code = code.replace(
    /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g,
    '$1"$2"$3',
  );

  // トレーリングカンマを除去
  code = code.replace(/,(\s*[}\]])/g, "$1");

  return code;
}

/**
 * サブプロットファイルの内容からSubplotオブジェクトを解析する
 * @param content ファイル内容
 * @returns Subplotオブジェクト、パース失敗時はnull
 */
export function parseSubplotFromFile(content: string): Subplot | null {
  try {
    // Why: [^\s:]+ で日本語変数名にも対応。foreshadowingパーサーと同じパターン
    const match = content.match(
      /export\s+const\s+[^\s:]+\s*:\s*Subplot\s*=\s*(\{[\s\S]*?\});?\s*$/,
    );
    if (!match) {
      return null;
    }

    // まずそのままJSONパースを試みる（後方互換性のため）
    try {
      return JSON.parse(match[1]) as Subplot;
    } catch {
      // JSONパース失敗時はコメント除去・変換してパースを試みる
      const jsonStr = convertJsObjectToJson(match[1]);
      return JSON.parse(jsonStr) as Subplot;
    }
  } catch {
    return null;
  }
}

/**
 * サブプロットファイルの内容から可変なSubplotオブジェクトを解析する
 * beats配列の追加・削除操作に使用する
 * @param content ファイル内容
 * @returns subplot: Subplotオブジェクト（パース失敗時はnull）、beats: ビート配列
 */
export function parseSubplotWithMutableBeats(
  content: string,
): { subplot: Subplot | null; beats: PlotBeat[] } {
  const subplot = parseSubplotFromFile(content);
  if (!subplot) {
    return { subplot: null, beats: [] };
  }

  return {
    subplot: {
      ...subplot,
      beats: [...subplot.beats],
    },
    beats: [...subplot.beats],
  };
}
