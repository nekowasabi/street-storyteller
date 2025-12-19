import type { McpPromptDefinition } from "@storyteller/mcp/prompts/prompt_registry.ts";

export const projectSetupWizardPrompt: McpPromptDefinition = {
  name: "project_setup_wizard",
  description: "新規ストーリープロジェクトのセットアップを対話的に支援します。",
  arguments: [
    { name: "name", description: "プロジェクト名", required: true },
    {
      name: "template",
      description: "テンプレート（basic/novel/screenplay）",
      required: false,
    },
  ],
  getMessages: (args) => {
    const name = args.name ?? "";
    const template = args.template ?? "";
    const templateLine = template.trim().length > 0
      ? `Template: ${template}`
      : "Template: (not specified)";

    return [
      {
        role: "system" as const,
        content:
          "You are a project setup assistant for a story writing codebase. Ask clarifying questions and propose a concrete initial structure.",
      },
      {
        role: "user" as const,
        content:
          `Help me set up a new story project.\nName: ${name}\n${templateLine}\nAsk up to 5 questions, then propose initial files/directories and a short README outline.`,
      },
    ];
  },
};
