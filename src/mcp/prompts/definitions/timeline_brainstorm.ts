/**
 * timeline_brainstorm プロンプト定義
 * タイムラインのアイデアをブレインストーミングする
 */

import type { McpPromptDefinition } from "../prompt_registry.ts";

export const timelineBrainstormPrompt: McpPromptDefinition = {
  name: "timeline_brainstorm",
  description:
    "物語のタイムライン構成をブレインストーミングします。スコープに応じたイベント案や時系列構造を提案します。",
  arguments: [
    {
      name: "scope",
      description: "タイムラインのスコープ（story/world/character/arc）",
      required: true,
    },
    {
      name: "genre",
      description: "物語のジャンル（任意）",
      required: false,
    },
    {
      name: "theme",
      description: "物語のテーマ（任意）",
      required: false,
    },
    {
      name: "existing_events",
      description: "既存のイベント情報（JSON形式、任意）",
      required: false,
    },
  ],
  getMessages: (args) => {
    const scope = args.scope ?? "story";
    const genre = args.genre ?? "";
    const theme = args.theme ?? "";
    const existingEvents = args.existing_events ?? "";

    const scopeDescription = getScopeDescription(scope);
    const genreLine = genre.trim().length > 0 ? `ジャンル: ${genre}` : "";
    const themeLine = theme.trim().length > 0 ? `テーマ: ${theme}` : "";
    const existingLine = existingEvents.trim().length > 0
      ? `\n既存のイベント:\n${existingEvents}`
      : "";

    return [
      {
        role: "system" as const,
        content:
          `あなたは物語構成の専門家です。タイムライン設計の観点から、因果関係が明確で、読者を引き込む構成を提案してください。
出力は日本語で、構造化された形式で提供してください。`,
      },
      {
        role: "user" as const,
        content: `以下の条件でタイムラインのアイデアを3つ提案してください。

スコープ: ${scope}（${scopeDescription}）
${genreLine}
${themeLine}
${existingLine}

各提案には以下を含めてください：
1. タイムライン名と概要
2. 主要イベント（5-7個）とその順序
3. イベント間の因果関係
4. 物語の転換点（クライマックス、伏線回収など）
5. このタイムラインが物語にもたらす効果`,
      },
    ];
  },
};

function getScopeDescription(scope: string): string {
  switch (scope) {
    case "story":
      return "物語全体の主要な時系列";
    case "world":
      return "世界の歴史や背景となる出来事";
    case "character":
      return "特定キャラクターの人生や成長";
    case "arc":
      return "特定の章やアークの出来事";
    default:
      return "物語の時系列";
  }
}
