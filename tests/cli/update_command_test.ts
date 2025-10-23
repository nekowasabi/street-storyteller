import { assert } from "../asserts.ts";
import { updateCommandHandler } from "../../src/cli/modules/update.ts";
import type { CommandContext } from "../../src/cli/types.ts";
import { createStubLogger, createStubPresenter } from "../asserts.ts";

Deno.test("updateコマンド - 基本動作", async (t) => {
  await t.step("引数なしで実行（ヘルプ表示）", async () => {
    const logger = createStubLogger();
    const presenter = createStubPresenter();
    const context: CommandContext = {
      logger,
      presenter,
      args: {},
      config: undefined as never,
    };

    const result = await updateCommandHandler.execute(context);
    assert(result.ok);
  });

  await t.step("--checkオプション（プロジェクトなし）", async () => {
    const logger = createStubLogger();
    const presenter = createStubPresenter();
    const context: CommandContext = {
      logger,
      presenter,
      args: { check: true, path: "/nonexistent" },
      config: undefined as never,
    };

    const result = await updateCommandHandler.execute(context);
    // プロジェクトが存在しないのでエラーになる
    assert(!result.ok);
  });

  await t.step("--applyオプション（プロジェクトなし）", async () => {
    const logger = createStubLogger();
    const presenter = createStubPresenter();
    const context: CommandContext = {
      logger,
      presenter,
      args: { apply: true, path: "/nonexistent" },
      config: undefined as never,
    };

    const result = await updateCommandHandler.execute(context);
    // プロジェクトが存在しないのでエラーになる
    assert(!result.ok);
  });
});
