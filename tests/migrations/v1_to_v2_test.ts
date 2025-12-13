/**
 * v1→v2マイグレーションスクリプトのテスト
 */

import { assert, assertEquals } from "../asserts.ts";
import { CharacterMigration } from "../../src/migrations/v1_to_v2/character_migration.ts";
import { SettingMigration } from "../../src/migrations/v1_to_v2/setting_migration.ts";
import { ProjectMetadataMigration } from "../../src/migrations/v1_to_v2/project_metadata_migration.ts";
import type {
  MigrationOptions,
  ProjectContext,
} from "../../src/migrations/types.ts";
import type { Character as CharacterV1 } from "../../src/type/character.ts";
import type { Character as CharacterV2 } from "../../src/type/v2/character.ts";

Deno.test("CharacterMigration - 基本的なマイグレーション", async () => {
  const migration = new CharacterMigration();

  assertEquals(migration.id, "character_v1_to_v2");
  assertEquals(migration.from, "1.0.0");
  assertEquals(migration.to, "2.0.0");
  assertEquals(migration.breaking, true);
});

Deno.test("CharacterMigration - canMigrate チェック", async () => {
  const migration = new CharacterMigration();

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

  const check = await migration.canMigrate(projectContext);

  assert(check.canMigrate);
  assertEquals(check.reason, "Character files can be migrated to v2");
  assert(check.estimatedChanges >= 0);
});

Deno.test("CharacterMigration - v1からv2への変換ロジック", () => {
  const v1Character: CharacterV1 = {
    name: "勇者",
  };

  // CharacterMigrationの変換ロジックを使用
  const migration = new CharacterMigration();
  const v2Character = migration.convertV1toV2(v1Character);

  assertEquals(v2Character.name, "勇者");
  assertEquals(v2Character.id, "勇者"); // nameがIDとして使用される
  assertEquals(v2Character.role, "supporting"); // デフォルト値
  assertEquals(v2Character.traits.length, 0);
  assert(v2Character.summary.includes("勇者"));
});

Deno.test("SettingMigration - 基本的なマイグレーション", async () => {
  const migration = new SettingMigration();

  assertEquals(migration.id, "setting_v1_to_v2");
  assertEquals(migration.from, "1.0.0");
  assertEquals(migration.to, "2.0.0");
  assertEquals(migration.breaking, false);
});

Deno.test("SettingMigration - canMigrate チェック", async () => {
  const migration = new SettingMigration();

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

  const check = await migration.canMigrate(projectContext);

  assert(check.canMigrate);
  assertEquals(
    check.reason,
    "Setting migration is optional (no v1 Setting type exists yet)",
  );
});

Deno.test("ProjectMetadataMigration - 基本的なマイグレーション", async () => {
  const migration = new ProjectMetadataMigration();

  assertEquals(migration.id, "project_metadata_v1_to_v2");
  assertEquals(migration.from, "1.0.0");
  assertEquals(migration.to, "2.0.0");
  assertEquals(migration.breaking, false);
});

Deno.test("ProjectMetadataMigration - canMigrate チェック", async () => {
  const migration = new ProjectMetadataMigration();

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

  const check = await migration.canMigrate(projectContext);

  assert(check.canMigrate);
  assertEquals(check.reason, "Project metadata can be updated to v2");
});

Deno.test("ProjectMetadataMigration - メタデータの更新", async () => {
  const migration = new ProjectMetadataMigration();

  const projectContext: ProjectContext = {
    projectPath: "/test/project",
    currentVersion: "1.0.0",
    metadata: {
      version: {
        version: "1.0.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-01"),
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

  const result = await migration.migrate(projectContext, options);

  assert(result.success);
  assertEquals(result.summary, "Project metadata updated to v2");
});
