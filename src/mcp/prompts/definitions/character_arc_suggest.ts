/**
 * character_arc_suggest プロンプト
 *
 * キャラクターの成長アークを提案する
 */

import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

export const characterArcSuggestPrompt: McpPromptDefinition = {
  name: "character_arc_suggest",
  description: "キャラクターの成長アーク（フェーズ）を提案します。",
  arguments: [
    {
      name: "character_id",
      description: "キャラクターID",
      required: true,
    },
    {
      name: "character_name",
      description: "キャラクター名",
      required: true,
    },
    {
      name: "current_traits",
      description: "現在の特性（カンマ区切り）",
      required: false,
    },
    {
      name: "goal",
      description: "物語における目標",
      required: false,
    },
    {
      name: "genre",
      description: "物語のジャンル（ファンタジー、ミステリー等）",
      required: false,
    },
    {
      name: "existing_phases",
      description: "既存のフェーズ情報（JSON形式）",
      required: false,
    },
  ],
  getMessages: (args) => {
    const characterId = args.character_id ?? "";
    const characterName = args.character_name ?? "";
    const currentTraits = args.current_traits ?? "";
    const goal = args.goal ?? "";
    const genre = args.genre ?? "";
    const existingPhases = args.existing_phases ?? "";

    const contextLines: string[] = [
      `## キャラクター情報`,
      `- ID: ${characterId}`,
      `- 名前: ${characterName}`,
    ];

    if (currentTraits) {
      contextLines.push(`- 現在の特性: ${currentTraits}`);
    }
    if (goal) {
      contextLines.push(`- 目標: ${goal}`);
    }
    if (genre) {
      contextLines.push(`- ジャンル: ${genre}`);
    }
    if (existingPhases) {
      contextLines.push(`\n## 既存のフェーズ\n${existingPhases}`);
    }

    return [
      {
        role: "system" as const,
        content:
          `あなたは物語創作の専門家です。キャラクターの成長アーク（フェーズ）を提案してください。

提案する各フェーズには以下を含めてください：
1. フェーズ名と概要
2. 遷移タイプ（gradual: 段階的, turning_point: 転換点, revelation: 気づき, regression: 退行, transformation: 変容）
3. 特性の変化（追加/削除）
4. 能力の変化
5. 精神状態の変化
6. トリガーとなり得るイベント

出力は日本語で、具体的かつ実用的な提案をしてください。`,
      },
      {
        role: "user" as const,
        content:
          `以下のキャラクターの成長アーク（フェーズ）を3〜5個提案してください。

${contextLines.join("\n")}

各フェーズはstoryteller CLIで使用できる形式で提案してください。
例:
\`\`\`
storyteller element phase --character "${characterId}" --id "awakening" --name "覚醒期" --order 1 --summary "..." --transition-type turning_point --add-trait "勇敢" --remove-trait "臆病"
\`\`\``,
      },
    ];
  },
};
