import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

export const plotSuggestionPrompt: McpPromptDefinition = {
  name: "plot_suggestion",
  description: "指定ジャンルに合わせたプロット案を提案します。",
  arguments: [
    {
      name: "genre",
      description: "ジャンル（例: fantasy, mystery）",
      required: true,
    },
    { name: "logline", description: "一行あらすじ（任意）", required: false },
  ],
  getMessages: (args) => {
    const genre = args.genre ?? "";
    const logline = args.logline ?? "";
    const loglineLine = logline.trim().length > 0
      ? `Logline: ${logline}`
      : "Logline: (not specified)";

    return [
      {
        role: "system" as const,
        content:
          "You are a story development assistant. Produce actionable outlines in Japanese.",
      },
      {
        role: "user" as const,
        content:
          `Suggest 3 plot outlines.\nGenre: ${genre}\n${loglineLine}\nEach outline should include: inciting incident, turning points, climax, resolution.`,
      },
    ];
  },
};
