/**
 * Timeline File Parser
 * タイムラインファイルの読み込み・パース・書き込みユーティリティ
 */

import type {
  Timeline,
  TimelineEvent,
} from "@storyteller/types/v2/timeline.ts";

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
 * タイムラインファイルの内容からTimelineオブジェクトを解析する
 * @param content ファイル内容
 * @returns Timelineオブジェクト、パース失敗時はnull
 */
export function parseTimelineFromFile(content: string): Timeline | null {
  try {
    const match = content.match(
      /export\s+const\s+\w+\s*:\s*Timeline\s*=\s*(\{[\s\S]*?\});?\s*$/,
    );
    if (!match) {
      return null;
    }

    // まずそのままJSONパースを試みる（後方互換性のため）
    try {
      return JSON.parse(match[1]) as Timeline;
    } catch {
      // JSONパース失敗時はコメント除去・変換してパースを試みる
      const jsonStr = convertJsObjectToJson(match[1]);
      return JSON.parse(jsonStr) as Timeline;
    }
  } catch {
    return null;
  }
}

/**
 * タイムラインファイルの内容から可変なTimelineオブジェクトを解析する
 * @param content ファイル内容
 * @param timelineId 期待するタイムラインID（オプション）
 * @returns 可変なTimelineオブジェクト、パース失敗時はnull
 */
export function parseTimelineFromFileWithMutableEvents(
  content: string,
  timelineId?: string,
): (Omit<Timeline, "events"> & { events: TimelineEvent[] }) | null {
  const timeline = parseTimelineFromFile(content);
  if (!timeline) {
    return null;
  }

  // IDを確認
  if (timelineId && timeline.id !== timelineId) {
    (timeline as { id: string }).id = timelineId;
  }

  return {
    ...timeline,
    events: [...timeline.events],
  };
}

/**
 * TimelineオブジェクトからTypeScriptファイルを生成する
 * @param timeline Timelineオブジェクト
 * @returns TypeScriptファイル内容
 */
export function generateTimelineFile(timeline: Timeline): string {
  const timelineJson = JSON.stringify(timeline, null, 2);

  return `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

/**
 * ${timeline.name}
 * ${timeline.summary}
 */
export const ${timeline.id}: Timeline = ${timelineJson};
`;
}

/**
 * ディレクトリからタイムラインをロードする
 * @param timelinesDir タイムラインディレクトリパス
 * @returns Timeline配列
 */
export async function loadTimelinesFromDirectory(
  timelinesDir: string,
): Promise<Timeline[]> {
  const timelines: Timeline[] = [];

  try {
    for await (const entry of Deno.readDir(timelinesDir)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;

      const filePath = `${timelinesDir}/${entry.name}`;
      try {
        const content = await Deno.readTextFile(filePath);
        const timeline = parseTimelineFromFile(content);
        if (timeline) {
          timelines.push(timeline);
        }
      } catch {
        // スキップ
      }
    }
  } catch {
    // ディレクトリが存在しない場合
  }

  return timelines;
}

/**
 * タイムラインファイルを読み込む
 * @param filePath ファイルパス
 * @returns Timelineオブジェクト、失敗時はnull
 */
export async function loadTimelineFromFile(
  filePath: string,
): Promise<Timeline | null> {
  try {
    const content = await Deno.readTextFile(filePath);
    return parseTimelineFromFile(content);
  } catch {
    return null;
  }
}

/**
 * タイムラインファイルを保存する
 * @param filePath ファイルパス
 * @param timeline Timelineオブジェクト
 */
export async function saveTimelineToFile(
  filePath: string,
  timeline: Timeline,
): Promise<void> {
  const content = generateTimelineFile(timeline);
  await Deno.writeTextFile(filePath, content);
}
