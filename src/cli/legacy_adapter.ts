import type {
  CommandDescriptor,
  CommandExampleDescriptor,
  CommandHandler,
  CommandOptionDescriptor,
} from "./types.ts";

export interface LegacyCommandAdapterOptions {
  readonly summary: string;
  readonly description?: string;
  readonly usage?: string;
  readonly path?: readonly string[];
  readonly aliases?: readonly string[];
  readonly options?: readonly CommandOptionDescriptor[];
  readonly examples?: readonly CommandExampleDescriptor[];
  readonly children?: readonly CommandDescriptor[];
}

export function createLegacyCommandDescriptor(
  handler: CommandHandler,
  options: LegacyCommandAdapterOptions,
): CommandDescriptor {
  const resolvedPath = options.path && options.path.length > 0
    ? options.path
    : handler.path && handler.path.length > 0
    ? handler.path
    : [handler.name];

  const aliasSet = new Set<string>();
  for (const existing of handler.aliases ?? []) {
    aliasSet.add(existing);
  }
  for (const alias of options.aliases ?? []) {
    aliasSet.add(alias);
  }
  const aliases = aliasSet.size > 0 ? Array.from(aliasSet) : undefined;

  handler.path = resolvedPath;
  if (aliases) {
    handler.aliases = aliases;
  }

  return {
    name: handler.name,
    summary: options.summary,
    description: options.description,
    usage: options.usage,
    path: resolvedPath,
    aliases,
    options: options.options,
    examples: options.examples,
    children: options.children,
    handler,
  };
}
