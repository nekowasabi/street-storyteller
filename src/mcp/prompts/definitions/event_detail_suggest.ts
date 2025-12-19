/**
 * event_detail_suggest プロンプト定義
 * イベントの詳細を提案する
 */

import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

export const eventDetailSuggestPrompt: McpPromptDefinition = {
  name: "event_detail_suggest",
  description:
    "タイムラインイベントの詳細（キャラクター、設定、因果関係など）を提案します。",
  arguments: [
    {
      name: "event_title",
      description: "イベントのタイトル",
      required: true,
    },
    {
      name: "context",
      description: "物語のコンテキスト（世界観、ジャンルなど）",
      required: false,
    },
    {
      name: "timeline_summary",
      description: "タイムラインの概要",
      required: false,
    },
    {
      name: "characters",
      description: "関連しうるキャラクター一覧（JSON形式）",
      required: false,
    },
    {
      name: "settings",
      description: "関連しうる設定一覧（JSON形式）",
      required: false,
    },
  ],
  getMessages: (args) => {
    const eventTitle = args.event_title ?? "";
    const context = args.context ?? "";
    const timelineSummary = args.timeline_summary ?? "";
    const characters = args.characters ?? "";
    const settings = args.settings ?? "";

    const contextLine = context.trim().length > 0
      ? `コンテキスト: ${context}`
      : "";
    const timelineLine = timelineSummary.trim().length > 0
      ? `タイムライン概要: ${timelineSummary}`
      : "";
    const charactersLine = characters.trim().length > 0
      ? `\n利用可能なキャラクター:\n${characters}`
      : "";
    const settingsLine = settings.trim().length > 0
      ? `\n利用可能な設定:\n${settings}`
      : "";

    return [
      {
        role: "system" as const,
        content:
          `あなたは物語構成の専門家です。イベントの詳細を、物語全体の整合性を考慮しながら提案してください。
出力は日本語で、具体的かつ実用的な提案を心がけてください。`,
      },
      {
        role: "user" as const,
        content: `以下のイベントの詳細を提案してください。

イベントタイトル: ${eventTitle}
${contextLine}
${timelineLine}
${charactersLine}
${settingsLine}

以下の観点で提案してください：
1. **イベント概要**: 何が起こるかの詳細な説明
2. **関連キャラクター**: このイベントに関わるべきキャラクターとその役割
3. **舞台設定**: イベントが起こる場所と時間
4. **因果関係**:
   - このイベントの原因（causedBy）
   - このイベントが引き起こす結果（causes）
5. **重要度**: major（主要）/minor（副次）/background（背景）
6. **カテゴリ提案**: plot_point/character_event/world_event/foreshadow/climax/resolution
7. **演出のポイント**: このイベントを印象的にする要素`,
      },
    ];
  },
};
