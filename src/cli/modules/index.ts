import type { CommandRegistry } from "../command_registry.ts";
import { generateCommandHandler } from "./generate.ts";
import { helpCommandHandler } from "./help.ts";

export function registerCoreModules(registry: CommandRegistry): void {
  registry.register(generateCommandHandler);
  registry.register(helpCommandHandler);
}
