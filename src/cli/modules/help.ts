import { ok } from "../../shared/result.ts";
import type { CommandHandler } from "../types.ts";

const HELP_MESSAGE = `
🎭 Street Storyteller - Story Writing as Code

USAGE:
  storyteller <command> [options]

COMMANDS:
  generate, g    Generate a new story project
  help, h        Show this help message

GENERATE OPTIONS:
  --name, -n <name>       Project name (required)
  --template, -t <type>   Template type (default: basic)
  --path, -p <path>       Custom project path

TEMPLATES:
  basic        Basic story structure
  novel        Novel-focused structure
  screenplay   Screenplay structure

EXAMPLES:
  storyteller generate --name "my-story"
  storyteller generate --name "novel-project" --template novel
  storyteller g -n "screenplay" -t screenplay -p ~/stories
`;

export const helpCommandHandler: CommandHandler = {
  name: "help",
  async execute({ presenter }) {
    presenter.showInfo(HELP_MESSAGE);
    return ok(undefined);
  },
};
