/**
 * MCP Prompt Registry
 * プロンプトの登録・取得・一覧化を管理
 */

import type { McpPrompt, McpPromptArgument } from "../protocol/types.ts";

export type McpPromptMessage = {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
};

export type McpPromptDefinition = {
  readonly name: string;
  readonly description: string;
  readonly arguments?: readonly McpPromptArgument[];
  readonly getMessages: (
    args: Record<string, string>,
  ) => readonly McpPromptMessage[];
};

export class PromptRegistry {
  private readonly prompts = new Map<string, McpPromptDefinition>();

  register(prompt: McpPromptDefinition): void {
    this.prompts.set(prompt.name, prompt);
  }

  get(name: string): McpPromptDefinition | undefined {
    return this.prompts.get(name);
  }

  listPrompts(): McpPromptDefinition[] {
    return Array.from(this.prompts.values());
  }

  toMcpPrompts(): McpPrompt[] {
    return this.listPrompts().map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments,
    }));
  }
}
