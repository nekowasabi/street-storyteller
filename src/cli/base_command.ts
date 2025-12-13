import type { Result } from "../shared/result.ts";
import { err } from "../shared/result.ts";
import type {
  CommandContext,
  CommandExecutionError,
  CommandHandler,
} from "./types.ts";

export abstract class BaseCliCommand implements CommandHandler {
  abstract readonly name: string;
  readonly path?: readonly string[];
  readonly aliases?: readonly string[];
  readonly dependencies?: readonly string[];

  constructor(
    dependencies?: readonly string[],
    options?: { path?: readonly string[]; aliases?: readonly string[] },
  ) {
    this.dependencies = dependencies;
    this.path = options?.path;
    this.aliases = options?.aliases;
  }

  async execute(
    context: CommandContext,
  ): Promise<Result<unknown, CommandExecutionError>> {
    const scopedLogger = context.logger.withContext({ command: this.name });
    const scopedContext: CommandContext = {
      ...context,
      logger: scopedLogger,
    };

    try {
      const result = await this.handle(scopedContext);
      if (result.ok) {
        scopedLogger.debug("command completed");
      } else {
        scopedLogger.warn("command failed", { error: result.error });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      scopedLogger.error("command crashed", { message });
      return err({
        code: "unexpected_error",
        message,
      });
    }
  }

  protected abstract handle(
    context: CommandContext,
  ): Promise<Result<unknown, CommandExecutionError>>;
}
