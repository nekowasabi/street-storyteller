import { assert } from "../asserts.ts";
import { updateCommandHandler } from "../../src/cli/modules/update.ts";
import type { CommandContext } from "../../src/cli/types.ts";
import { createStubLogger, createStubPresenter } from "../asserts.ts";
import { STORYTELLER_VERSION } from "../../src/core/version.ts";

async function writeProjectMetadata(projectPath: string, version: string) {
  const configDir = `${projectPath}/.storyteller`;
  await Deno.mkdir(configDir, { recursive: true });
  await Deno.writeTextFile(
    `${configDir}/config.json`,
    JSON.stringify(
      {
        version: {
          version,
          storytellerVersion: version,
          created: "2025-01-01T00:00:00.000Z",
          lastUpdated: "2025-01-01T00:00:00.000Z",
        },
        features: {},
        compatibility: "strict",
      },
      null,
      2,
    ) + "\n",
  );
}

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

  await t.step("--checkオプション（プロジェクトが最新）", async () => {
    const tmp = await Deno.makeTempDir({ prefix: "storyteller-update-" });
    try {
      await writeProjectMetadata(tmp, STORYTELLER_VERSION);

      const logger = createStubLogger();
      const presenter = createStubPresenter();
      const context: CommandContext = {
        logger,
        presenter,
        args: { check: true, path: tmp },
        config: undefined as never,
      };

      const result = await updateCommandHandler.execute(context);
      assert(result.ok);
    } finally {
      await Deno.remove(tmp, { recursive: true });
    }
  });

  await t.step("--checkオプション（更新がある）", async () => {
    const tmp = await Deno.makeTempDir({ prefix: "storyteller-update-" });
    try {
      await writeProjectMetadata(tmp, "0.1.0");

      const logger = createStubLogger();
      const presenter = createStubPresenter();
      const context: CommandContext = {
        logger,
        presenter,
        args: { check: true, path: tmp },
        config: undefined as never,
      };

      const result = await updateCommandHandler.execute(context);
      assert(result.ok);
    } finally {
      await Deno.remove(tmp, { recursive: true });
    }
  });

  await t.step(
    "--applyオプション（更新適用でバージョンを書き換える）",
    async () => {
      const tmp = await Deno.makeTempDir({ prefix: "storyteller-update-" });
      try {
        await writeProjectMetadata(tmp, "0.1.0");

        const logger = createStubLogger();
        const presenter = createStubPresenter();
        const context: CommandContext = {
          logger,
          presenter,
          args: { apply: true, path: tmp },
          config: undefined as never,
        };

        const result = await updateCommandHandler.execute(context);
        assert(result.ok);

        const updated = JSON.parse(
          await Deno.readTextFile(`${tmp}/.storyteller/config.json`),
        ) as { version: { version: string; storytellerVersion: string } };
        assert(updated.version.version === STORYTELLER_VERSION);
        assert(updated.version.storytellerVersion === STORYTELLER_VERSION);
      } finally {
        await Deno.remove(tmp, { recursive: true });
      }
    },
  );

  await t.step("--applyオプション（すでに最新なら何もしない）", async () => {
    const tmp = await Deno.makeTempDir({ prefix: "storyteller-update-" });
    try {
      await writeProjectMetadata(tmp, STORYTELLER_VERSION);

      const before = await Deno.readTextFile(`${tmp}/.storyteller/config.json`);

      const logger = createStubLogger();
      const presenter = createStubPresenter();
      const context: CommandContext = {
        logger,
        presenter,
        args: { apply: true, path: tmp },
        config: undefined as never,
      };

      const result = await updateCommandHandler.execute(context);
      assert(result.ok);

      const after = await Deno.readTextFile(`${tmp}/.storyteller/config.json`);
      assert(before === after);
    } finally {
      await Deno.remove(tmp, { recursive: true });
    }
  });

  await t.step("--applyオプション（migration required を返す）", async () => {
    const tmp = await Deno.makeTempDir({ prefix: "storyteller-update-" });
    try {
      // compareVersions() は parseInt ベースなので、負のメジャーバージョンで breaking 分岐を通す
      await writeProjectMetadata(tmp, "-1.0.0");

      const logger = createStubLogger();
      const presenter = createStubPresenter();
      const context: CommandContext = {
        logger,
        presenter,
        args: { apply: true, path: tmp },
        config: undefined as never,
      };

      const result = await updateCommandHandler.execute(context);
      assert(!result.ok);
      if (!result.ok) {
        assert(result.error.code === "migration_required");
      }
    } finally {
      await Deno.remove(tmp, { recursive: true });
    }
  });

  await t.step(
    "--add-featureオプション（featureフラグを追加する）",
    async () => {
      const tmp = await Deno.makeTempDir({ prefix: "storyteller-update-" });
      try {
        await writeProjectMetadata(tmp, STORYTELLER_VERSION);

        const logger = createStubLogger();
        const presenter = createStubPresenter();
        const context: CommandContext = {
          logger,
          presenter,
          args: { "add-feature": "character_details", path: tmp },
          config: undefined as never,
        };

        const result = await updateCommandHandler.execute(context);
        assert(result.ok);

        const updated = JSON.parse(
          await Deno.readTextFile(`${tmp}/.storyteller/config.json`),
        ) as { features: Record<string, boolean> };
        assert(updated.features.character_details === true);
      } finally {
        await Deno.remove(tmp, { recursive: true });
      }
    },
  );

  await t.step(
    "--add-featureオプション（メタデータが無いとエラー）",
    async () => {
      const tmp = await Deno.makeTempDir({ prefix: "storyteller-update-" });
      try {
        const logger = createStubLogger();
        const presenter = createStubPresenter();
        const context: CommandContext = {
          logger,
          presenter,
          args: { "add-feature": "character_details", path: tmp },
          config: undefined as never,
        };

        const result = await updateCommandHandler.execute(context);
        assert(!result.ok);
        if (!result.ok) {
          assert(result.error.code === "metadata_load_failed");
        }
      } finally {
        await Deno.remove(tmp, { recursive: true });
      }
    },
  );

  await t.step(
    "--checkオプション（メタデータ形式が壊れていると update_check_failed）",
    async () => {
      const tmp = await Deno.makeTempDir({ prefix: "storyteller-update-" });
      try {
        await Deno.mkdir(`${tmp}/.storyteller`, { recursive: true });
        await Deno.writeTextFile(
          `${tmp}/.storyteller/config.json`,
          "{not json",
        );

        const logger = createStubLogger();
        const presenter = createStubPresenter();
        const context: CommandContext = {
          logger,
          presenter,
          args: { check: true, path: tmp },
          config: undefined as never,
        };

        const result = await updateCommandHandler.execute(context);
        assert(!result.ok);
        if (!result.ok) {
          assert(result.error.code === "update_check_failed");
        }
      } finally {
        await Deno.remove(tmp, { recursive: true });
      }
    },
  );

  await t.step(
    "--applyオプション（メタデータが無いと metadata_load_failed）",
    async () => {
      const tmp = await Deno.makeTempDir({ prefix: "storyteller-update-" });
      try {
        const logger = createStubLogger();
        const presenter = createStubPresenter();
        const context: CommandContext = {
          logger,
          presenter,
          args: { apply: true, path: tmp },
          config: undefined as never,
        };

        const result = await updateCommandHandler.execute(context);
        assert(!result.ok);
        if (!result.ok) {
          assert(result.error.code === "metadata_load_failed");
        }
      } finally {
        await Deno.remove(tmp, { recursive: true });
      }
    },
  );

  await t.step(
    "--add-featureオプション（保存に失敗すると metadata_save_failed）",
    async () => {
      if (Deno.build.os === "windows") return;
      const tmp = await Deno.makeTempDir({ prefix: "storyteller-update-" });
      try {
        await writeProjectMetadata(tmp, STORYTELLER_VERSION);
        await Deno.chmod(`${tmp}/.storyteller/config.json`, 0o400);

        const logger = createStubLogger();
        const presenter = createStubPresenter();
        const context: CommandContext = {
          logger,
          presenter,
          args: { "add-feature": "character_details", path: tmp },
          config: undefined as never,
        };

        const result = await updateCommandHandler.execute(context);
        assert(!result.ok);
        if (!result.ok) {
          assert(result.error.code === "metadata_save_failed");
        }
      } finally {
        try {
          await Deno.chmod(`${tmp}/.storyteller/config.json`, 0o600);
        } catch {
          // ignore
        }
        await Deno.remove(tmp, { recursive: true });
      }
    },
  );
});
