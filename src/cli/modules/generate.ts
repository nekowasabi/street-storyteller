import { ok, err } from "../../shared/result.ts";
import type { CommandExecutionError, CommandContext } from "../types.ts";
import { BaseCliCommand } from "../base_command.ts";
import { createLegacyCommandDescriptor } from "../legacy_adapter.ts";
import type { CommandDescriptor, CommandOptionDescriptor } from "../types.ts";
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
    context.logger.info("Generating project", {
      name: parsed.name,
      template: parsed.template,
      path: parsed.path,
    });
    await generateStoryProject(parsed);
    context.logger.info("Project generated", { name: parsed.name });
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err({
      code: "generation_failed",
      message,
    });
  }
}

class GenerateCommand extends BaseCliCommand {
  readonly name = "generate" as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    return executeGenerate(context);
  }
}

export const generateCommandHandler = new GenerateCommand();

const GENERATE_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "--name",
    aliases: ["-n"],
    summary: "Project name (required).",
    type: "string",
    required: true,
  },
  {
    name: "--template",
    aliases: ["-t"],
    summary: "Template type (basic, novel, screenplay).",
    type: "string",
    defaultValue: "basic",
  },
  {
    name: "--path",
    aliases: ["-p"],
    summary: "Custom output directory.",
    type: "string",
  },
] as const;

export const generateCommandDescriptor: CommandDescriptor = createLegacyCommandDescriptor(
  generateCommandHandler,
  {
    summary: "Generate a new story project scaffold.",
    usage: "storyteller generate --name <name> [--template <template>] [--path <path>]",
    aliases: ["g"],
    options: GENERATE_OPTIONS,
    examples: [
      {
        summary: "Generate a project with the default template",
        command: `storyteller generate --name "my-story"`,
      },
      {
        summary: "Generate using the novel template",
        command: `storyteller generate --name "novel-project" --template novel`,
      },
      {
        summary: "Generate into a specific directory",
        command: `storyteller g -n "screenplay" -t screenplay -p ~/stories`,
      },
    ],
  },
);
