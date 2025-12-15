import type { McpPromptDefinition } from "../prompt_registry.ts";

export const chapterReviewPrompt: McpPromptDefinition = {
  name: "chapter_review",
  description: "章（原稿）のレビュー観点と改善案を生成します。",
  arguments: [
    {
      name: "chapter",
      description: "章IDまたはファイル名（例: chapter01）",
      required: true,
    },
    {
      name: "text",
      description: "章本文（任意。未指定の場合はレビュー観点のみ）",
      required: false,
    },
  ],
  getMessages: (args) => {
    const chapter = args.chapter ?? "";
    const text = args.text ?? "";
    const hasText = text.trim().length > 0;

    return [
      {
        role: "system" as const,
        content:
          "You are a developmental editor. Provide clear, actionable feedback in Japanese.",
      },
      {
        role: "user" as const,
        content: hasText
          ? `Review this chapter.\nChapter: ${chapter}\nText:\n${text}\nProvide: strengths, issues, suggestions, and a short rewrite of one paragraph.`
          : `Give a review checklist for a chapter.\nChapter: ${chapter}\nFocus on: pacing, clarity, character voice, continuity, and hooks.`,
      },
    ];
  },
};
