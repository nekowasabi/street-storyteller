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
import { timelineBrainstormPrompt } from "../../prompts/definitions/timeline_brainstorm.ts";
import { eventDetailSuggestPrompt } from "../../prompts/definitions/event_detail_suggest.ts";
import { causalityAnalysisPrompt } from "../../prompts/definitions/causality_analysis.ts";
import { timelineConsistencyCheckPrompt } from "../../prompts/definitions/timeline_consistency_check.ts";
import { storyDirectorPrompt } from "../../prompts/definitions/story_director.ts";
import { characterArcSuggestPrompt } from "../../prompts/definitions/character_arc_suggest.ts";
import { phaseTransitionCheckPrompt } from "../../prompts/definitions/phase_transition_check.ts";

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

  // Timeline prompts
  registry.register(timelineBrainstormPrompt);
  registry.register(eventDetailSuggestPrompt);
  registry.register(causalityAnalysisPrompt);
  registry.register(timelineConsistencyCheckPrompt);

  // Director prompt
  registry.register(storyDirectorPrompt);

  // Character phase prompts
  registry.register(characterArcSuggestPrompt);
  registry.register(phaseTransitionCheckPrompt);

  return registry;
}
