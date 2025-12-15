import type { McpPromptDefinition } from "../prompt_registry.ts";

export const sceneImprovementPrompt: McpPromptDefinition = {
  name: "scene_improvement",
  description: "シーンを改善するための具体的な提案を生成します。",
  arguments: [
    { name: "scene", description: "改善したいシーン本文/要約", required: true },
    { name: "goal", description: "シーンの目的（任意）", required: false },
  ],
  getMessages: (args) => {
    const scene = args.scene ?? "";
    const goal = args.goal ?? "";
    const goalLine = goal.trim().length > 0
      ? `Goal: ${goal}`
      : "Goal: (not specified)";

    return [
      {
        role: "system" as const,
        content:
          "You are a professional editor. Give concrete, line-level suggestions in Japanese.",
      },
      {
        role: "user" as const,
        content:
          `Improve the following scene.\n${goalLine}\nScene:\n${scene}\nProvide: issues, rewrite suggestions, and 3 alternative lines of dialogue if applicable.`,
      },
    ];
  },
};
