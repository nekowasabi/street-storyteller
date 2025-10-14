import { ok, err } from "../../shared/result.ts";
import type { CommandExecutionError, CommandHandler, CommandContext } from "../types.ts";
import { generateStoryProject, type GenerateOptions } from "../../commands/generate.ts";

function parseGenerateOptions(context: CommandContext): GenerateOptions | CommandExecutionError {
  const args = context.args ?? {};
  const name = args.name;
  const template = args.template ?? "basic";
  const path = args.path;

  if (typeof name !== "string" || name.trim().length === 0) {
    return {
      code: "invalid_arguments",
      message: "Project name is required",
    };
  }

  const validTemplates = ["basic", "novel", "screenplay"] as const;
  if (!validTemplates.includes(template as typeof validTemplates[number])) {
    return {
      code: "invalid_arguments",
      message: `Invalid template: ${template}`,
    };
  }

  return {
    name,
    template: template as GenerateOptions["template"],
    path: typeof path === "string" ? path : undefined,
  };
}

async function executeGenerate(context: CommandContext) {
  const parsed = parseGenerateOptions(context);
  if ("code" in parsed) {
    return err(parsed);
  }

  try {
    await generateStoryProject(parsed);
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err({
      code: "generation_failed",
      message,
    });
  }
}

export const generateCommandHandler: CommandHandler = {
  name: "generate",
  dependencies: [],
  async execute(context) {
    return executeGenerate(context);
  },
};
