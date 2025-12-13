import type { CommandRegistry } from "../command_registry.ts";
import { registerCommandDescriptor } from "../command_registry.ts";
import { generateCommandDescriptor } from "./generate.ts";
import { createHelpDescriptor } from "./help.ts";
import { createMetaDescriptor } from "./meta/index.ts";

export function registerCoreModules(registry: CommandRegistry): void {
  registerCommandDescriptor(registry, generateCommandDescriptor);
  const metaDescriptor = createMetaDescriptor(registry);
  registerCommandDescriptor(registry, metaDescriptor);
  const helpDescriptor = createHelpDescriptor(registry);
  registerCommandDescriptor(registry, helpDescriptor);
}
