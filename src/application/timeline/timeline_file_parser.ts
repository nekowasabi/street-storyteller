/**
 * Timeline File Parser
 * タイムラインファイルの読み込み・パース・書き込みユーティリティ
 */

import type { Timeline, TimelineEvent } from "../../type/v2/timeline.ts";

/**
 * タイムラインファイルの内容からTimelineオブジェクトを解析する
 * @param content ファイル内容
 * @returns Timelineオブジェクト、パース失敗時はnull
 */
export function parseTimelineFromFile(content: string): Timeline | null {
  try {
    const match = content.match(
      /export\s+const\s+\w+\s*:\s*Timeline\s*=\s*(\{[\s\S]*?\});?\s*$/
    );
    if (!match) {
      return null;
    }

    return JSON.parse(match[1]) as Timeline;
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
  timelineId?: string
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
  timelinesDir: string
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
  filePath: string
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
  timeline: Timeline
): Promise<void> {
  const content = generateTimelineFile(timeline);
  await Deno.writeTextFile(filePath, content);
}
