import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

export const consistencyFixPrompt: McpPromptDefinition = {
  name: "consistency_fix",
  description:
    "整合性問題（時系列・設定・人物の矛盾など）の修正方針と案を提示します。",
  arguments: [
    { name: "issue", description: "問題の説明", required: true },
    {
      name: "context",
      description: "関連する本文/状況（任意）",
      required: false,
    },
  ],
  getMessages: (args) => {
    const issue = args.issue ?? "";
    const context = args.context ?? "";
    const contextBlock = context.trim().length > 0
      ? `Context:\n${context}`
      : "Context: (not specified)";

    return [
      {
        role: "system" as const,
        content:
          "You are a continuity editor. Offer multiple fix strategies and note trade-offs.",
      },
      {
        role: "user" as const,
        content:
          `Help fix a consistency issue.\nIssue: ${issue}\n${contextBlock}\nProvide: likely root cause, 3 fix options, and suggested minimal edits.`,
      },
    ];
  },
};
