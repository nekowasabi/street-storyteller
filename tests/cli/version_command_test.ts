import { assert } from "../asserts.ts";
import { versionCommandHandler } from "@storyteller/cli/modules/version.ts";
import type { CommandContext } from "@storyteller/cli/types.ts";
import { createStubLogger, createStubPresenter } from "../asserts.ts";

Deno.test("versionコマンド - 基本動作", async (t) => {
  await t.step("引数なしで実行", async () => {
    const logger = createStubLogger();
    const presenter = createStubPresenter();
    const context: CommandContext = {
      logger,
      presenter,
      args: {},
      config: undefined as never,
    };

    const result = await versionCommandHandler.execute(context);
    assert(result.ok);
  });

  await t.step("--checkオプションあり（プロジェクトなし）", async () => {
    const logger = createStubLogger();
    const presenter = createStubPresenter();
    const context: CommandContext = {
      logger,
      presenter,
      args: { check: true, path: "/nonexistent" },
      config: undefined as never,
    };

    const result = await versionCommandHandler.execute(context);
    // プロジェクトが存在しないのでエラーになる
    assert(!result.ok);
  });
});
