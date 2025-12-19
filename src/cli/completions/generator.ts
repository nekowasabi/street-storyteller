import type {
  CommandOptionDescriptor,
  CommandTreeNode,
} from "@storyteller/cli/types.ts";

export function generateBashCompletionScript(tree: CommandTreeNode): string {
  const commands = collectExecutableCommands(tree);
  const commandList = commands.map((command) => formatCommandPath(command.path))
    .join(" ");
  const commandCases = commands.map((command) => renderBashCase(command)).join(
    "\n",
  );

  return [
    "#!/usr/bin/env bash",
    "_storyteller_completion() {",
    "  local cur prev",
    "  COMPREPLY=()",
    '  cur="${COMP_WORDS[COMP_CWORD]}"',
    '  prev="${COMP_WORDS[COMP_CWORD-1]}"',
    "",
    "  if [[ ${COMP_CWORD} -eq 1 ]]; then",
    `    COMPREPLY=( $(compgen -W "${commandList}" -- "$cur") )`,
    "    return 0",
    "  fi",
    "",
    '  case "${COMP_WORDS[1]}" in',
    commandCases,
    "  esac",
    "}",
    "complete -F _storyteller_completion storyteller",
  ].join("\n");
}

export function generateZshCompletionScript(tree: CommandTreeNode): string {
  const commands = collectExecutableCommands(tree);
  const commandEntries = commands.map((command) =>
    `'${formatCommandPath(command.path)}:${command.summary ?? ""}'`
  ).join(" ");
  const optionHandlers = commands.map((command) =>
    renderZshOptionHandler(command)
  ).join("\n");

  return [
    "#compdef storyteller",
    "",
    "_storyteller_completion() {",
    "  local -a commands",
    `  commands=(${commandEntries})`,
    "",
    '  local curcontext="$curcontext" state',
    "",
    "  _arguments \\",
    "    '1:command:->command' \\",
    "    '*::options:->options'",
    "",
    "  case $state in",
    "    command)",
    "      _describe 'command' commands",
    "      ;;",
    "    options)",
    "      case $words[1] in",
    optionHandlers,
    "      esac",
    "      ;;",
    "  esac",
    "}",
    "",
    '_storyteller_completion "$@"',
  ].join("\n");
}

function collectExecutableCommands(
  tree: CommandTreeNode,
): CommandTreeNode[] {
  const collected: CommandTreeNode[] = [];
  for (const child of tree.children) {
    if (child.executable) {
      collected.push(child);
    }
    collected.push(...collectExecutableCommands(child));
  }
  return collected;
}

function renderBashCase(command: CommandTreeNode): string {
  const options = collectOptionFlags(command.options);
  const optionWords = options.join(" ");
  const commandName = formatCommandPath(command.path);

  if (optionWords.length === 0) {
    return `    ${commandName})\n      COMPREPLY=()\n      ;;\n`;
  }

  return [
    `    ${commandName})`,
    `      local opts="${optionWords}"`,
    '      COMPREPLY=( $(compgen -W "$opts" -- "$cur") )',
    "      ;;",
  ].join("\n");
}

function renderZshOptionHandler(command: CommandTreeNode): string {
  const commandName = formatCommandPath(command.path);
  const optionLines = collectOptionEntries(command.options)
    .map((entry) => `          '${entry}'`)
    .join(" \\\n");

  if (optionLines.length === 0) {
    return [
      `        ${commandName})`,
      "          _arguments",
      "          ;;",
    ].join("\n");
  }

  return [
    `        ${commandName})`,
    "          _arguments \\",
    optionLines,
    "          ;;",
  ].join("\n");
}

function collectOptionFlags(
  options: readonly CommandOptionDescriptor[],
): string[] {
  const flags: string[] = [];
  for (const option of options) {
    flags.push(option.name);
    if (option.aliases) {
      flags.push(...option.aliases);
    }
  }
  return flags;
}

function collectOptionEntries(
  options: readonly CommandOptionDescriptor[],
): string[] {
  const entries: string[] = [];
  for (const option of options) {
    const summary = appendFlags(option.summary, option);
    entries.push(`${option.name}[${summary}]`);
    if (option.aliases) {
      for (const alias of option.aliases) {
        entries.push(`${alias}[${summary}]`);
      }
    }
  }
  return entries;
}

function appendFlags(
  summary: string,
  option: CommandOptionDescriptor,
): string {
  const flags: string[] = [];
  if (option.required) {
    flags.push("Required");
  }
  if (option.defaultValue !== undefined) {
    flags.push(`Default: ${String(option.defaultValue)}`);
  }
  if (flags.length === 0) {
    return summary;
  }
  return `${summary} (${flags.join(", ")})`;
}

function formatCommandPath(path: readonly string[]): string {
  return path.join(" ").trim();
}
