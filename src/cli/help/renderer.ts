import type { CommandTreeNode } from "@storyteller/cli/types.ts";

export type HelpRenderResult =
  | { kind: "root"; content: string }
  | { kind: "command"; content: string };

export interface HelpRenderError {
  readonly kind: "error";
  readonly message: string;
  readonly suggestions: readonly string[];
  readonly fallback: string;
}

export function renderHelp(
  tree: CommandTreeNode,
  targetPath: readonly string[],
): HelpRenderResult | HelpRenderError {
  const normalizedPath = targetPath.map(normalizeSegment).filter(Boolean);
  const rootHelp = renderRootHelp(tree);

  if (normalizedPath.length === 0) {
    return { kind: "root", content: rootHelp };
  }

  const resolution = resolveNode(tree, normalizedPath);
  if (!resolution) {
    const suggestions = suggestCommands(tree, normalizedPath.at(-1) ?? "");
    return {
      kind: "error",
      message: `Unknown command "${normalizedPath.join(" ")}"`,
      suggestions,
      fallback: rootHelp,
    };
  }

  const commandHelp = renderCommandHelp(resolution);
  return { kind: "command", content: commandHelp };
}

function renderRootHelp(tree: CommandTreeNode): string {
  const children = tree.children;
  const usage = "storyteller <command> [options]";

  const commandLabels = children.map((child) => ({
    label: formatCommandLabel(child),
    summary: child.summary ?? "",
  }));

  const labelWidth = commandLabels.reduce(
    (width, { label }) => Math.max(width, label.length),
    0,
  );

  const lines = [
    "🎭 Street Storyteller - Story Writing as Code",
    "",
    "USAGE:",
    `  ${usage}`,
    "",
    "COMMANDS:",
  ];

  for (const child of commandLabels) {
    const paddedLabel = child.label.padEnd(labelWidth);
    lines.push(`  ${paddedLabel}  ${child.summary}`.trimEnd());
  }

  lines.push(
    "",
    'Tip: Run "storyteller help <command>" for detailed usage.',
  );

  return lines.join("\n");
}

function renderCommandHelp(node: CommandTreeNode): string {
  const lines: string[] = [];
  const titleSummary = node.summary ?? "No summary available.";
  const title = `${formatCommandPath(node.path)} — ${titleSummary}`;
  lines.push(title);

  if (node.description) {
    lines.push("", node.description);
  }

  const usage = node.usage ?? `storyteller ${formatCommandPath(node.path)}`;
  lines.push("", "Usage:", `  ${usage}`);

  if (node.aliases.length > 0) {
    lines.push("", "Aliases:", `  ${node.aliases.join(", ")}`);
  }

  if (node.options.length > 0) {
    lines.push("", "Options:");
    const optionLabels = node.options.map((option) =>
      formatOptionLabel(option)
    );
    const optionWidth = optionLabels.reduce(
      (width, label) => Math.max(width, label.length),
      0,
    );

    node.options.forEach((option, index) => {
      const label = optionLabels[index].padEnd(optionWidth);
      const flags: string[] = [];
      if (option.required) {
        flags.push("Required");
      }
      if (option.defaultValue !== undefined) {
        flags.push(`Default: ${String(option.defaultValue)}`);
      }
      const flagSuffix = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
      lines.push(`  ${label}  ${option.summary}${flagSuffix}`.trimEnd());
    });
  }

  if (node.examples.length > 0) {
    lines.push("", "Examples:");
    for (const example of node.examples) {
      lines.push(`  # ${example.summary}`);
      lines.push(`  ${example.command}`);
      lines.push("");
    }
    if (lines.at(-1) === "") {
      lines.pop();
    }
  }

  if (node.children.length > 0) {
    lines.push("", "Subcommands:");
    const childLabels = node.children.map((child) => formatCommandLabel(child));
    const childWidth = childLabels.reduce(
      (width, label) => Math.max(width, label.length),
      0,
    );
    node.children.forEach((child, index) => {
      const label = childLabels[index].padEnd(childWidth);
      lines.push(
        `  ${label}  ${child.summary ?? ""}`.trimEnd(),
      );
    });
  }

  return lines.join("\n");
}

function resolveNode(
  root: CommandTreeNode,
  path: readonly string[],
): CommandTreeNode | undefined {
  let current: CommandTreeNode | undefined = root;

  for (const segment of path) {
    if (!current) {
      return undefined;
    }
    current = current.children.find((child) =>
      normalizeSegment(child.name) === segment ||
      child.aliases.map(normalizeSegment).includes(segment)
    );
  }

  return current && current !== root ? current : undefined;
}

function suggestCommands(
  root: CommandTreeNode,
  segment: string,
): string[] {
  const normalizedSegment = normalizeSegment(segment);
  const candidates = collectExecutableNodes(root);
  const maxDistance = Math.max(2, Math.floor(normalizedSegment.length / 2));

  const scored = candidates.flatMap((node) => {
    const labels = [
      normalizeSegment(node.name),
      ...node.aliases.map(normalizeSegment),
    ];
    const best = labels.reduce(
      (min, label) => Math.min(min, levenshtein(normalizedSegment, label)),
      Number.POSITIVE_INFINITY,
    );
    return [{
      command: formatCommandPath(node.path),
      distance: best,
    }];
  }).filter((item) => item.distance <= maxDistance)
    .sort((a, b) =>
      a.distance === b.distance
        ? a.command.localeCompare(b.command)
        : a.distance - b.distance
    );

  const unique = new Set<string>();
  const suggestions: string[] = [];
  for (const item of scored) {
    if (!unique.has(item.command)) {
      unique.add(item.command);
      suggestions.push(item.command);
    }
    if (suggestions.length >= 3) {
      break;
    }
  }

  return suggestions;
}

function collectExecutableNodes(node: CommandTreeNode): CommandTreeNode[] {
  const collected: CommandTreeNode[] = [];
  for (const child of node.children) {
    if (child.executable) {
      collected.push(child);
    }
    collected.push(...collectExecutableNodes(child));
  }
  return collected;
}

function formatCommandLabel(node: CommandTreeNode): string {
  const label = formatCommandPath(node.path);
  if (node.aliases.length === 0) {
    return label;
  }
  return `${label} (aliases: ${node.aliases.join(", ")})`;
}

function formatCommandPath(path: readonly string[]): string {
  return path.join(" ").trim();
}

function formatOptionLabel(
  option: { name: string; aliases?: readonly string[] },
): string {
  const parts = [option.name];
  if (option.aliases && option.aliases.length > 0) {
    parts.push(...option.aliases);
  }
  return parts.join(", ");
}

function normalizeSegment(value: string): string {
  return value.trim().toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from(
    { length: a.length + 1 },
    () => new Array<number>(b.length + 1),
  );

  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}
