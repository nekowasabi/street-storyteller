/**
 * MCPプロンプトハンドラー
 * prompts/list, prompts/get の処理
 */

import type { McpPrompt } from "../../protocol/types.ts";
import {
  type McpPromptMessage,
  PromptRegistry,
} from "../../prompts/prompt_registry.ts";
import { characterBrainstormPrompt } from "../../prompts/definitions/character_brainstorm.ts";
import { plotSuggestionPrompt } from "../../prompts/definitions/plot_suggestion.ts";
import { sceneImprovementPrompt } from "../../prompts/definitions/scene_improvement.ts";
import { projectSetupWizardPrompt } from "../../prompts/definitions/project_setup_wizard.ts";
import { chapterReviewPrompt } from "../../prompts/definitions/chapter_review.ts";
import { consistencyFixPrompt } from "../../prompts/definitions/consistency_fix.ts";

export type McpListPromptsResult = {
  readonly prompts: readonly McpPrompt[];
};

export type McpGetPromptParams = {
  readonly name: string;
  readonly arguments?: Record<string, string>;
};

export type McpGetPromptResult = {
  readonly description?: string;
  readonly messages: readonly McpPromptMessage[];
};

export function handlePromptsList(
  registry: PromptRegistry,
): McpListPromptsResult {
  return { prompts: registry.toMcpPrompts() };
}

export function handlePromptsGet(
  registry: PromptRegistry,
  params: McpGetPromptParams,
): McpGetPromptResult {
  const prompt = registry.get(params.name);
  if (!prompt) {
    throw new Error(`Prompt not found: ${params.name}`);
  }
  const args = params.arguments ?? {};
  return {
    description: prompt.description,
    messages: prompt.getMessages(args),
  };
}

export function createDefaultPromptRegistry(): PromptRegistry {
  const registry = new PromptRegistry();

  registry.register(characterBrainstormPrompt);
  registry.register(plotSuggestionPrompt);
  registry.register(sceneImprovementPrompt);
  registry.register(projectSetupWizardPrompt);
  registry.register(chapterReviewPrompt);
  registry.register(consistencyFixPrompt);

  return registry;
}
