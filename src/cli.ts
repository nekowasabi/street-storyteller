import { parseArgs } from "jsr:@std/cli/parse-args";
import { GenerateOptions, generateStoryProject } from "./commands/generate.ts";

export async function runCLI(): Promise<void> {
  const args = parseArgs(Deno.args, {
    string: ["name", "template", "path"],
    default: {
      template: "basic",
    },
    alias: {
      n: "name",
      t: "template",
      p: "path",
    },
  });

  const command = args._[0] as string;

  switch (command) {
    case "generate":
    case "g":
      await handleGenerate(args);
      break;
    case "help":
    case "h":
      showHelp();
      break;
    default:
      console.error("Unknown command:", command);
      showHelp();
      Deno.exit(1);
  }
}

async function handleGenerate(args: Record<string, unknown>): Promise<void> {
  if (!args.name || typeof args.name !== "string") {
    console.error("❌ Project name is required");
    console.log("Usage: deno run main.ts generate --name <project-name>");
    Deno.exit(1);
  }

  const validTemplates = ["basic", "novel", "screenplay"];
  if (!validTemplates.includes(args.template as string)) {
    console.error(`❌ Invalid template: ${args.template}`);
    console.log(`Available templates: ${validTemplates.join(", ")}`);
    Deno.exit(1);
  }

  const options: GenerateOptions = {
    name: args.name,
    template: args.template as "basic" | "novel" | "screenplay",
    path: typeof args.path === "string" ? args.path : undefined,
  };

  try {
    await generateStoryProject(options);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error generating project:", errorMessage);
    Deno.exit(1);
  }
}

function showHelp(): void {
  console.log(`
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

For more information, visit: https://github.com/nekowasabi/street-storyteller
`);
}
