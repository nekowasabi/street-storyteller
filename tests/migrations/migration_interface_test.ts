/**
 * Migrationインターフェースのテスト
 */

import { assert, assertEquals } from "../asserts.ts";
import type {
  BackupContext,
  Migration,
  MigrationCheck,
  MigrationOptions,
  MigrationResult,
  ProjectContext,
} from "@storyteller/migrations/types.ts";

Deno.test("Migration - インターフェースの基本構造", () => {
  // Migrationインターフェースを実装するダミーマイグレーション
  const testMigration: Migration = {
    id: "test_v1_to_v2",
    from: "1.0.0",
    to: "2.0.0",
    breaking: true,

    async canMigrate(_project: ProjectContext): Promise<MigrationCheck> {
      return {
        canMigrate: true,
        reason: "Test migration is always possible",
        estimatedChanges: 1,
      };
    },

    async migrate(
      _project: ProjectContext,
      _options: MigrationOptions,
    ): Promise<MigrationResult> {
      return {
        success: true,
        filesChanged: ["test.ts"],
        summary: "Test migration completed",
      };
    },

    async rollback(_backup: BackupContext): Promise<void> {
      // ロールバック処理（テスト用）
    },
  };

  // 型チェック用のアサーション
  assertEquals(testMigration.id, "test_v1_to_v2");
  assertEquals(testMigration.from, "1.0.0");
  assertEquals(testMigration.to, "2.0.0");
  assertEquals(testMigration.breaking, true);
});

Deno.test("MigrationCheck - マイグレーション可能性チェック", async () => {
  const testMigration: Migration = {
    id: "test_migration",
    from: "1.0.0",
    to: "2.0.0",
    breaking: false,

    async canMigrate(_project: ProjectContext): Promise<MigrationCheck> {
      return {
        canMigrate: true,
        reason: "All conditions met",
        estimatedChanges: 5,
        warnings: ["This is a test warning"],
      };
    },

    async migrate(
      _project: ProjectContext,
      _options: MigrationOptions,
    ): Promise<MigrationResult> {
      return {
        success: true,
        filesChanged: [],
        summary: "Test",
      };
    },

    async rollback(_backup: BackupContext): Promise<void> {},
  };

  const projectContext: ProjectContext = {
    projectPath: "/test/path",
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

  const check = await testMigration.canMigrate(projectContext);

  assertEquals(check.canMigrate, true);
  assertEquals(check.reason, "All conditions met");
  assertEquals(check.estimatedChanges, 5);
  assert(check.warnings);
  assertEquals(check.warnings.length, 1);
  assertEquals(check.warnings[0], "This is a test warning");
});

Deno.test("MigrationResult - マイグレーション実行結果", async () => {
  const testMigration: Migration = {
    id: "test_migration",
    from: "1.0.0",
    to: "2.0.0",
    breaking: false,

    async canMigrate(_project: ProjectContext): Promise<MigrationCheck> {
      return {
        canMigrate: true,
        reason: "OK",
        estimatedChanges: 0,
      };
    },

    async migrate(
      _project: ProjectContext,
      _options: MigrationOptions,
    ): Promise<MigrationResult> {
      return {
        success: true,
        filesChanged: ["src/type/character.ts", "src/type/setting.ts"],
        summary: "Migrated 2 files from v1 to v2",
        errors: [],
      };
    },

    async rollback(_backup: BackupContext): Promise<void> {},
  };

  const projectContext: ProjectContext = {
    projectPath: "/test/path",
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

  const options: MigrationOptions = {
    dryRun: false,
    interactive: false,
    force: false,
  };

  const result = await testMigration.migrate(projectContext, options);

  assertEquals(result.success, true);
  assertEquals(result.filesChanged.length, 2);
  assert(result.filesChanged.includes("src/type/character.ts"));
  assert(result.filesChanged.includes("src/type/setting.ts"));
  assertEquals(result.summary, "Migrated 2 files from v1 to v2");
  assert(result.errors);
  assertEquals(result.errors.length, 0);
});
