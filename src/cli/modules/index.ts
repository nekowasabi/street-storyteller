import type { CommandRegistry } from "../command_registry.ts";
import { registerCommandDescriptor } from "../command_registry.ts";
import { generateCommandDescriptor } from "./generate.ts";
import { createHelpDescriptor } from "./help.ts";
import { createMetaDescriptor } from "./meta/index.ts";
import { createLspDescriptor } from "./lsp/index.ts";
import { createElementDescriptor } from "./element/index.ts";
import { viewCommandDescriptor } from "./view.ts";
import { createMcpDescriptor } from "./mcp/index.ts";

export function registerCoreModules(registry: CommandRegistry): void {
  registerCommandDescriptor(registry, generateCommandDescriptor);
  const metaDescriptor = createMetaDescriptor(registry);
  registerCommandDescriptor(registry, metaDescriptor);
  const lspDescriptor = createLspDescriptor(registry);
  registerCommandDescriptor(registry, lspDescriptor);
  const elementDescriptor = createElementDescriptor(registry);
  registerCommandDescriptor(registry, elementDescriptor);
  registerCommandDescriptor(registry, viewCommandDescriptor);
  const mcpDescriptor = createMcpDescriptor(registry);
  registerCommandDescriptor(registry, mcpDescriptor);
  const helpDescriptor = createHelpDescriptor(registry);
  registerCommandDescriptor(registry, helpDescriptor);
}
