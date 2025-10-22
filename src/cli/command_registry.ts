import { err, ok, type Result } from "../shared/result.ts";
import type {
  CommandDescriptor,
  CommandExampleDescriptor,
  CommandHandler,
  CommandOptionDescriptor,
  CommandRegistrationError,
  CommandTreeNode,
} from "./types.ts";

type CommandId = string;
type CommandPath = readonly string[];

interface RegistryNode {
  readonly name: string;
  readonly path: CommandPath;
  handler?: CommandHandler;
  readonly children: Map<string, RegistryNode>;
  readonly aliasChildren: Map<string, RegistryNode>;
  readonly aliases: Set<string>;
  metadata?: CommandHelpMetadata;
}

interface CommandHelpMetadata {
  readonly summary?: string;
  readonly description?: string;
  readonly usage?: string;
  readonly options?: readonly CommandOptionDescriptor[];
  readonly examples?: readonly CommandExampleDescriptor[];
}

export interface CommandRegistry {
  register(handler: CommandHandler): void;
  registerDescriptor(descriptor: CommandDescriptor): void;
  resolve(command: string | CommandPath): CommandHandler | undefined;
  validate(): Result<void, readonly CommandRegistrationError[]>;
  snapshot(): CommandTreeNode;
}

export function createCommandRegistry(): CommandRegistry {
  const root = createNode("", []);
  const registrations = new Map<CommandId, CommandHandler[]>();
  const nodesById = new Map<CommandId, RegistryNode>();

  function registerHandler(
    handler: CommandHandler,
  ): { node: RegistryNode; parent: RegistryNode | undefined } | undefined {
    const path = normalizeCommandPath(handler.path ?? [handler.name]);
    if (path.length === 0) {
      return undefined;
    }

    const traversal: RegistryNode[] = [];
    let current = root;
    for (const segment of path) {
      traversal.push(current);
      let next = current.children.get(segment);
      if (!next) {
        next = createNode(segment, [...current.path, segment]);
        current.children.set(segment, next);
      }
      current = next;
    }

    const id = toCommandId(current.path);
    const registered = registrations.get(id) ?? [];
    registered.push(handler);
    registrations.set(id, registered);

    const parent = traversal.at(-1);

    if (registered.length === 1) {
      current.handler = handler;
      current.aliases.clear();
      for (const alias of handler.aliases ?? []) {
        current.aliases.add(alias);
      }
      nodesById.set(id, current);
      if (handler.aliases) {
        for (const alias of handler.aliases) {
          parent?.aliasChildren.set(alias, current);
        }
      }
    }

    return { node: current, parent };
  }

  function registerDescriptorInternal(
    descriptor: CommandDescriptor,
    parentPath: readonly string[] = [],
  ): void {
    const resolvedPath = descriptor.path && descriptor.path.length > 0
      ? descriptor.path
      : [...parentPath, descriptor.name];

    const handler = descriptor.handler;
    if (!handler.path || handler.path.length === 0) {
      handler.path = resolvedPath;
    }

    if (descriptor.aliases && descriptor.aliases.length > 0) {
      const aliasSet = new Set<string>(handler.aliases ?? []);
      for (const alias of descriptor.aliases) {
        aliasSet.add(alias);
      }
      handler.aliases = Array.from(aliasSet);
    }

    const registration = registerHandler(handler);
    if (registration?.node) {
      registration.node.metadata = {
        summary: descriptor.summary,
        description: descriptor.description,
        usage: descriptor.usage,
        options: descriptor.options ?? [],
        examples: descriptor.examples ?? [],
      };
    }

    for (const child of descriptor.children ?? []) {
      registerDescriptorInternal(child, resolvedPath);
    }
  }

  return {
    register(handler: CommandHandler) {
      registerHandler(handler);
    },

    registerDescriptor(descriptor: CommandDescriptor) {
      registerDescriptorInternal(descriptor);
    },

    resolve(command: string | CommandPath): CommandHandler | undefined {
      const path = normalizeCommandPath(command);
      if (path.length === 0) {
        return undefined;
      }

      let current = root;
      for (const segment of path) {
        const next = current.children.get(segment) ??
          current.aliasChildren.get(segment);
        if (!next) {
          return undefined;
        }
        current = next;
      }

      return current.handler;
    },

    validate(): Result<void, readonly CommandRegistrationError[]> {
      const issues: CommandRegistrationError[] = [];

      for (const [id, list] of registrations) {
        if (list.length > 1) {
          issues.push({
            code: "duplicate_command",
            message: `Command "${id}" registered multiple times`,
            details: { count: list.length, path: id },
          });
        }
      }

      for (const [id, node] of nodesById) {
        const handler = node.handler;
        if (!handler) {
          continue;
        }
        for (const dependency of handler.dependencies ?? []) {
          const dependencyPath = normalizeCommandPath(dependency);
          if (dependencyPath.length === 0) {
            continue;
          }
          const dependencyId = toCommandId(dependencyPath);
          if (!nodesById.has(dependencyId)) {
            issues.push({
              code: "missing_dependency",
              message: `Command "${id}" requires missing dependency "${dependencyId}"`,
              details: { dependency: dependencyId, command: id },
            });
          }
        }
      }

      if (issues.length > 0) {
        return err(issues);
      }

      return ok(undefined);
    },

    snapshot(): CommandTreeNode {
      return toSnapshot(root, true);
    },
  };
}

function createNode(name: string, path: CommandPath): RegistryNode {
  return {
    name,
    path,
    handler: undefined,
    children: new Map(),
    aliasChildren: new Map(),
    aliases: new Set(),
  };
}

function normalizeCommandPath(
  path: string | CommandPath,
): string[] {
  if (typeof path === "string") {
    const trimmed = path.trim();
    if (trimmed.length === 0) {
      return [];
    }
    return trimmed.split(/\s+/).filter((segment: string) => segment.length > 0);
  }
  return path.filter((segment: string) => segment.length > 0);
}

function toCommandId(path: CommandPath): CommandId {
  return path.join(" ");
}

export function registerCommandDescriptor(
  registry: CommandRegistry,
  descriptor: CommandDescriptor,
  parentPath: readonly string[] = [],
): void {
  if (parentPath.length > 0) {
    // Parent path parameter retained for backward compatibility; unused.
  }
  if (typeof registry.registerDescriptor === "function") {
    registry.registerDescriptor(descriptor);
  } else {
    registry.register(descriptor.handler);
  }
}

function toSnapshot(node: RegistryNode, isRoot = false): CommandTreeNode {
  const children = Array.from(node.children.values())
    .map((child) => toSnapshot(child))
    .sort((a, b) => a.name.localeCompare(b.name));

  const aliases = Array.from(node.aliases.values()).sort();
  const metadata = node.metadata;

  return {
    name: isRoot ? "" : node.name,
    path: node.path,
    aliases,
    summary: metadata?.summary,
    description: metadata?.description,
    usage: metadata?.usage,
    options: metadata?.options ?? [],
    examples: metadata?.examples ?? [],
    children,
    executable: Boolean(node.handler),
  };
}
