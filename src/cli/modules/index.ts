import type { CommandRegistry } from "@storyteller/cli/command_registry.ts";
import { registerCommandDescriptor } from "@storyteller/cli/command_registry.ts";
import { generateCommandDescriptor } from "@storyteller/cli/modules/generate.ts";
import { createHelpDescriptor } from "@storyteller/cli/modules/help.ts";
import { createMetaDescriptor } from "@storyteller/cli/modules/meta/index.ts";
import { createLspDescriptor } from "@storyteller/cli/modules/lsp/index.ts";
import { createElementDescriptor } from "@storyteller/cli/modules/element/index.ts";
import { viewCommandDescriptor } from "@storyteller/cli/modules/view.ts";
import { createMcpDescriptor } from "@storyteller/cli/modules/mcp/index.ts";

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
