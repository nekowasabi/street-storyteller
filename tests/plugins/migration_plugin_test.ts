/**
 * MigrationPluginのテスト
 */

import { assert, assertEquals } from "../asserts.ts";
import { MigrationPlugin } from "@storyteller/plugins/features/migration/plugin.ts";
import { MigrationRegistry } from "@storyteller/migrations/registry.ts";
import type {
  BackupContext,
  Migration,
  MigrationCheck,
  MigrationOptions,
  MigrationResult,
  ProjectContext,
} from "@storyteller/migrations/types.ts";

// テスト用のカウンター付きマイグレーション
function createTestMigration(
  id: string,
  from: string,
  to: string,
  counter: { executeCount: number; rollbackCount: number },
): Migration {
  return {
    id,
    from,
    to,
    breaking: false,

    async canMigrate(_project: ProjectContext): Promise<MigrationCheck> {
      return {
        canMigrate: true,
        reason: "OK",
        estimatedChanges: 1,
      };
    },

    async migrate(
      _project: ProjectContext,
      _options: MigrationOptions,
    ): Promise<MigrationResult> {
      counter.executeCount++;
      return {
        success: true,
        filesChanged: [`file_${id}.ts`],
        summary: `Migration ${id} completed`,
      };
    },

    async rollback(_backup: BackupContext): Promise<void> {
      counter.rollbackCount++;
    },
  };
}

Deno.test("MigrationPlugin - 単一マイグレーションの実行", async () => {
  const registry = new MigrationRegistry();
  const counter = { executeCount: 0, rollbackCount: 0 };

  registry.register(
    createTestMigration("v1_to_v2", "1.0.0", "2.0.0", counter),
  );

  const plugin = new MigrationPlugin(registry);

  const projectContext: ProjectContext = {
    projectPath: "/test/project",
    currentVersion: "1.0.0",
    metadata: {
      version: {
        version: "1.0.0",
        storytellerVersion: "0.3.0",
        created: new Date(),
        lastUpdated: new Date(),
      },
      features: {},
      compatibility: "strict",
    },
  };

  const result = await plugin.executeMigration(
    projectContext,
    "2.0.0",
    { dryRun: false, interactive: false, force: false },
  );

  assert(result.success);
  assertEquals(result.migrationsExecuted, 1);
  assertEquals(counter.executeCount, 1);
  assertEquals(counter.rollbackCount, 0);
});

Deno.test("MigrationPlugin - 段階的マイグレーションの実行", async () => {
  const registry = new MigrationRegistry();
  const counter = { executeCount: 0, rollbackCount: 0 };

  registry.register(
    createTestMigration("v1_to_v2", "1.0.0", "2.0.0", counter),
  );
  registry.register(
    createTestMigration("v2_to_v3", "2.0.0", "3.0.0", counter),
  );

  const plugin = new MigrationPlugin(registry);

  const projectContext: ProjectContext = {
    projectPath: "/test/project",
    currentVersion: "1.0.0",
    metadata: {
      version: {
        version: "1.0.0",
        storytellerVersion: "0.3.0",
        created: new Date(),
        lastUpdated: new Date(),
      },
      features: {},
      compatibility: "strict",
    },
  };

  const result = await plugin.executeMigration(
    projectContext,
    "3.0.0",
    { dryRun: false, interactive: false, force: false },
  );

  assert(result.success);
  assertEquals(result.migrationsExecuted, 2);
  assertEquals(counter.executeCount, 2);
});

Deno.test("MigrationPlugin - ドライランモード", async () => {
  const registry = new MigrationRegistry();
  const counter = { executeCount: 0, rollbackCount: 0 };

  registry.register(
    createTestMigration("v1_to_v2", "1.0.0", "2.0.0", counter),
  );

  const plugin = new MigrationPlugin(registry);

  const projectContext: ProjectContext = {
    projectPath: "/test/project",
    currentVersion: "1.0.0",
    metadata: {
      version: {
        version: "1.0.0",
        storytellerVersion: "0.3.0",
        created: new Date(),
        lastUpdated: new Date(),
      },
      features: {},
      compatibility: "strict",
    },
  };

  const result = await plugin.executeMigration(
    projectContext,
    "2.0.0",
    { dryRun: true, interactive: false, force: false },
  );

  // ドライランモードでは実際には実行されない
  assert(result.success);
  assertEquals(result.migrationsExecuted, 0); // 実行されていない
  assertEquals(counter.executeCount, 0); // カウンターも増えない
});

Deno.test("MigrationPlugin - マイグレーションパスが見つからない場合", async () => {
  const registry = new MigrationRegistry();

  registry.register(
    createTestMigration("v1_to_v2", "1.0.0", "2.0.0", {
      executeCount: 0,
      rollbackCount: 0,
    }),
  );

  const plugin = new MigrationPlugin(registry);

  const projectContext: ProjectContext = {
    projectPath: "/test/project",
    currentVersion: "1.0.0",
    metadata: {
      version: {
        version: "1.0.0",
        storytellerVersion: "0.3.0",
        created: new Date(),
        lastUpdated: new Date(),
      },
      features: {},
      compatibility: "strict",
    },
  };

  const result = await plugin.executeMigration(
    projectContext,
    "5.0.0", // 存在しないバージョン
    { dryRun: false, interactive: false, force: false },
  );

  // パスが見つからないため失敗
  assertEquals(result.success, false);
  assert(result.error);
  assert(result.error.includes("No migration path found"));
});

Deno.test("MigrationPlugin - 同じバージョンへのマイグレーション", async () => {
  const registry = new MigrationRegistry();

  const plugin = new MigrationPlugin(registry);

  const projectContext: ProjectContext = {
    projectPath: "/test/project",
    currentVersion: "2.0.0",
    metadata: {
      version: {
        version: "2.0.0",
        storytellerVersion: "0.3.0",
        created: new Date(),
        lastUpdated: new Date(),
      },
      features: {},
      compatibility: "strict",
    },
  };

  const result = await plugin.executeMigration(
    projectContext,
    "2.0.0", // 同じバージョン
    { dryRun: false, interactive: false, force: false },
  );

  // マイグレーション不要
  assert(result.success);
  assertEquals(result.migrationsExecuted, 0);
});
