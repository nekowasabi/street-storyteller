import { err, ok } from "../shared/result.ts";
import type { CommandHandler, CommandRegistrationError } from "./types.ts";
import type { Result } from "../shared/result.ts";

export interface CommandRegistry {
  register(handler: CommandHandler): void;
  resolve(commandName: string): CommandHandler | undefined;
  validate(): Result<void, readonly CommandRegistrationError[]>;
}

export function createCommandRegistry(): CommandRegistry {
  const handlers = new Map<string, CommandHandler[]>();

  return {
    register(handler: CommandHandler) {
      const list = handlers.get(handler.name) ?? [];
      list.push(handler);
      handlers.set(handler.name, list);
    },

    resolve(commandName: string): CommandHandler | undefined {
      const list = handlers.get(commandName);
      return list?.[0];
    },

    validate(): Result<void, readonly CommandRegistrationError[]> {
      const issues: CommandRegistrationError[] = [];

      for (const [name, list] of handlers) {
        if (list.length > 1) {
          issues.push({
            code: "duplicate_command",
            message: `Command \"${name}\" registered multiple times`,
            details: { count: list.length },
          });
        }
      }

      for (const [name, list] of handlers) {
        for (const handler of list) {
          const dependencies = handler.dependencies ?? [];
          for (const dependency of dependencies) {
            if (!handlers.has(dependency)) {
              issues.push({
                code: "missing_dependency",
                message: `Command \"${name}\" requires missing dependency \"${dependency}\"`,
                details: { dependency, command: name },
              });
            }
          }
        }
      }

      if (issues.length > 0) {
        return err(issues);
      }

      return ok(undefined);
    },
  };
}
