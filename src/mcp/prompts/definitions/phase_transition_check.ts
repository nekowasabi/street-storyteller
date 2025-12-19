/**
 * phase_transition_check プロンプト
 *
 * キャラクターのフェーズ遷移の妥当性をチェックする
 */

import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

export const phaseTransitionCheckPrompt: McpPromptDefinition = {
  name: "phase_transition_check",
  description: "キャラクターのフェーズ遷移の妥当性をチェックします。",
  arguments: [
    {
      name: "character_name",
      description: "キャラクター名",
      required: true,
    },
    {
      name: "from_phase_name",
      description: "遷移元フェーズ名",
      required: true,
    },
    {
      name: "to_phase_name",
      description: "遷移先フェーズ名",
      required: true,
    },
    {
      name: "from_traits",
      description: "遷移元の特性（カンマ区切り）",
      required: false,
    },
    {
      name: "to_traits",
      description: "遷移先の特性（カンマ区切り）",
      required: false,
    },
    {
      name: "transition_type",
      description:
        "遷移タイプ（gradual, turning_point, revelation, regression, transformation）",
      required: false,
    },
    {
      name: "trigger_event",
      description: "トリガーイベントの説明",
      required: false,
    },
    {
      name: "chapters_between",
      description: "遷移間のチャプター数",
      required: false,
    },
  ],
  getMessages: (args) => {
    const characterName = args.character_name ?? "";
    const fromPhaseName = args.from_phase_name ?? "";
    const toPhaseName = args.to_phase_name ?? "";
    const fromTraits = args.from_traits ?? "";
    const toTraits = args.to_traits ?? "";
    const transitionType = args.transition_type ?? "";
    const triggerEvent = args.trigger_event ?? "";
    const chaptersBetween = args.chapters_between ?? "";

    const contextLines: string[] = [
      `## 遷移情報`,
      `- キャラクター: ${characterName}`,
      `- 遷移元: ${fromPhaseName}`,
      `- 遷移先: ${toPhaseName}`,
    ];

    if (fromTraits) {
      contextLines.push(`- 遷移元の特性: ${fromTraits}`);
    }
    if (toTraits) {
      contextLines.push(`- 遷移先の特性: ${toTraits}`);
    }
    if (transitionType) {
      contextLines.push(`- 遷移タイプ: ${transitionType}`);
    }
    if (triggerEvent) {
      contextLines.push(`- トリガーイベント: ${triggerEvent}`);
    }
    if (chaptersBetween) {
      contextLines.push(`- 遷移間のチャプター数: ${chaptersBetween}`);
    }

    return [
      {
        role: "system" as const,
        content:
          `あなたは物語創作と心理学の専門家です。キャラクターの成長フェーズ間の遷移の妥当性を評価してください。

評価観点：
1. **心理的妥当性**: 人間の心理発達として自然な変化か
2. **物語的一貫性**: ストーリーテリングとして説得力があるか
3. **遷移タイプの適切性**: 選択された遷移タイプが変化の内容に適切か
4. **トリガーの十分性**: トリガーイベントが変化を引き起こすのに十分か
5. **ペーシング**: 遷移に要する時間/チャプター数が適切か

出力は日本語で、具体的な改善提案も含めてください。`,
      },
      {
        role: "user" as const,
        content: `以下のキャラクターフェーズ遷移の妥当性を評価してください。

${contextLines.join("\n")}

以下の形式で回答してください：

### 評価サマリー
[全体評価: 妥当/要検討/問題あり]

### 詳細評価
1. 心理的妥当性: [評価とコメント]
2. 物語的一貫性: [評価とコメント]
3. 遷移タイプの適切性: [評価とコメント]
4. トリガーの十分性: [評価とコメント]
5. ペーシング: [評価とコメント]

### 改善提案
[具体的な提案があれば]

### 補足すべきイベント案
[遷移をより自然にするためのイベント案があれば]`,
      },
    ];
  },
};
