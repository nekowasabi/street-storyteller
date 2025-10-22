import type { CommandRegistry } from "../command_registry.ts";
import { registerCommandDescriptor } from "../command_registry.ts";
import { generateCommandDescriptor } from "./generate.ts";
import { createHelpDescriptor } from "./help.ts";

export function registerCoreModules(registry: CommandRegistry): void {
  registerCommandDescriptor(registry, generateCommandDescriptor);
  const helpDescriptor = createHelpDescriptor(registry);
  registerCommandDescriptor(registry, helpDescriptor);
}
