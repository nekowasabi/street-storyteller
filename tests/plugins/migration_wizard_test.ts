/**
 * MigrationWizardのテスト
 */

import { assert, assertEquals } from "../asserts.ts";
import { MigrationWizard } from "@storyteller/plugins/features/migration/wizard.ts";
import { MigrationRegistry } from "@storyteller/migrations/registry.ts";
import type {
  BackupContext,
  Migration,
  MigrationCheck,
  MigrationOptions,
  MigrationResult,
  ProjectContext,
} from "@storyteller/migrations/types.ts";

// テスト用のダミーマイグレーション
function createDummyMigration(
  id: string,
  from: string,
  to: string,
  estimatedChanges: number,
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
        estimatedChanges,
      };
    },

    async migrate(
      _project: ProjectContext,
      _options: MigrationOptions,
    ): Promise<MigrationResult> {
      return {
        success: true,
        filesChanged: [],
        summary: `Migration ${id} completed`,
      };
    },

    async rollback(_backup: BackupContext): Promise<void> {},
  };
}

Deno.test("MigrationWizard - マイグレーション分析（単一ステップ）", async () => {
  const registry = new MigrationRegistry();
  registry.register(createDummyMigration("v1_to_v2", "1.0.0", "2.0.0", 5));

  const wizard = new MigrationWizard(registry);

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

  const analysis = await wizard.analyzeMigration(projectContext, "2.0.0");

  assert(analysis.success);
  assertEquals(analysis.steps, 1);
  assertEquals(analysis.estimatedChanges, 5);
  assert(analysis.path);
  assertEquals(analysis.path.length, 1);
});

Deno.test("MigrationWizard - マイグレーション分析（複数ステップ）", async () => {
  const registry = new MigrationRegistry();
  registry.register(createDummyMigration("v1_to_v2", "1.0.0", "2.0.0", 5));
  registry.register(createDummyMigration("v2_to_v3", "2.0.0", "3.0.0", 10));

  const wizard = new MigrationWizard(registry);

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

  const analysis = await wizard.analyzeMigration(projectContext, "3.0.0");

  assert(analysis.success);
  assertEquals(analysis.steps, 2);
  assertEquals(analysis.estimatedChanges, 15); // 5 + 10
  assert(analysis.path);
  assertEquals(analysis.path.length, 2);
});

Deno.test("MigrationWizard - パスが見つからない場合", async () => {
  const registry = new MigrationRegistry();
  registry.register(createDummyMigration("v1_to_v2", "1.0.0", "2.0.0", 5));

  const wizard = new MigrationWizard(registry);

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

  const analysis = await wizard.analyzeMigration(projectContext, "5.0.0");

  assertEquals(analysis.success, false);
  assert(analysis.error);
  assert(analysis.error.includes("No migration path found"));
});

Deno.test("MigrationWizard - サマリーメッセージの生成", async () => {
  const registry = new MigrationRegistry();
  registry.register(createDummyMigration("v1_to_v2", "1.0.0", "2.0.0", 5));

  const wizard = new MigrationWizard(registry);

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

  const analysis = await wizard.analyzeMigration(projectContext, "2.0.0");

  assert(analysis.success);

  const summary = wizard.generateSummary(analysis);
  assert(summary.includes("1.0.0"));
  assert(summary.includes("2.0.0"));
  assert(summary.includes("1"));
  assert(summary.includes("5"));
});
