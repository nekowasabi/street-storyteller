/**
 * Subplot File Generator
 * SubplotオブジェクトからTypeScriptファイル内容を生成する
 */

import type { Subplot } from "@storyteller/types/v2/subplot.ts";

/**
 * SubplotオブジェクトからTypeScriptファイルを生成する
 * @param subplot Subplotオブジェクト
 * @returns TypeScriptファイル内容
 */
export function generateSubplotFile(subplot: Subplot): string {
  const subplotJson = JSON.stringify(subplot, null, 2);

  return `import type { Subplot } from "@storyteller/types/v2/subplot.ts";

/**
 * ${subplot.name}
 * ${subplot.summary}
 */
export const ${subplot.id}: Subplot = ${subplotJson};
`;
}
