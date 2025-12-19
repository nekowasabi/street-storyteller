import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

export const characterBrainstormPrompt: McpPromptDefinition = {
  name: "character_brainstorm",
  description: "キャラクター案をブレインストーミングします。",
  arguments: [
    {
      name: "role",
      description: "役割（protagonist/antagonist/supporting/guest）",
      required: true,
    },
    { name: "genre", description: "ジャンル（任意）", required: false },
  ],
  getMessages: (args) => {
    const role = args.role ?? "";
    const genre = args.genre ?? "";
    const genreLine = genre.trim().length > 0
      ? `Genre: ${genre}`
      : "Genre: (not specified)";

    return [
      {
        role: "system" as const,
        content:
          "You are a creative writing assistant. Provide structured, practical ideas in Japanese.",
      },
      {
        role: "user" as const,
        content:
          `Create 3 distinct character concepts.\nRole: ${role}\n${genreLine}\nInclude: name, summary, traits, goals, conflict.`,
      },
    ];
  },
};
