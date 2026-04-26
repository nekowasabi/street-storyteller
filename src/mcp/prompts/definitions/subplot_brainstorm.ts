/**
 * subplot_brainstorm プロンプト定義
 * サブプロットのアイデアをブレインストーミングする
 */

import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

export const subplotBrainstormPrompt: McpPromptDefinition = {
  name: "subplot_brainstorm",
  description:
    "サブプロットのブレインストーミングを行います。メインプロットに基づいて、物語を豊かにするサブプロット案を提案します。",
  arguments: [
    {
      name: "mainPlotSummary",
      description: "メインプロットの概要",
      required: true,
    },
    {
      name: "themes",
      description: "テーマ（カンマ区切り）",
      required: false,
    },
    {
      name: "focusCharacter",
      description: "フォーカスキャラクター",
      required: false,
    },
  ],
  getMessages: (args) => {
    const mainPlotSummary = args.mainPlotSummary ?? "";
    const themes = args.themes ?? "";
    const focusCharacter = args.focusCharacter ?? "";

    const themesLine = themes.trim().length > 0 ? `テーマ: ${themes}` : "";
    const focusLine = focusCharacter.trim().length > 0
      ? `フォーカスキャラクター: ${focusCharacter}`
      : "";

    return [
      {
        role: "user" as const,
        content:
          `以下のメインプロットに基づいて、3〜5個のサブプロット案を提案してください。

メインプロット: ${mainPlotSummary}
${themesLine}
${focusLine}

各サブプロット案には以下を含めてください：
1. サブプロット名と概要
2. メインプロットとの関連性（どのように補完・対比するか）
3. 関与するキャラクター
4. サブプロット単体での起承転結
5. メインプロットへの影響ポイント（交差点）

サブプロットのタイプは以下のいずれかを想定してください：
- キャラクターサブプロット（個人の成長や内面的な葛藤）
- ロマンチックサブプロット（人間関係の深化）
- 世界観サブプロット（設定の背景や拡張）
- テーマ的サブプロット（メインテーマの別側面を探求）
- コーミックサブプロット（緊張緩和や軽妙な展開）`,
      },
    ];
  },
};
