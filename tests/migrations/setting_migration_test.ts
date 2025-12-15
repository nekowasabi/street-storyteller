import { assert, assertEquals } from "../asserts.ts";
import { SettingMigration } from "../../src/migrations/v1_to_v2/setting_migration.ts";
import type { ProjectContext } from "../../src/migrations/types.ts";

function createProjectContext(): ProjectContext {
  return {
    projectPath: "/tmp/project",
    currentVersion: "1.0.0",
    metadata: {
      version: {
        version: "1.0.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01T00:00:00.000Z"),
        lastUpdated: new Date("2025-01-01T00:00:00.000Z"),
      },
      features: {},
      compatibility: "strict",
    },
  };
}

Deno.test("SettingMigration canMigrate returns optional migration check", async () => {
  const migration = new SettingMigration();
  const result = await migration.canMigrate(createProjectContext());
  assertEquals(result.canMigrate, true);
  assert(result.reason.includes("optional"));
  assertEquals(result.estimatedChanges, 0);
  assertEquals((result.warnings ?? []).length, 0);
});

Deno.test("SettingMigration migrate is a no-op and succeeds", async () => {
  const migration = new SettingMigration();
  const result = await migration.migrate(createProjectContext(), {
    dryRun: true,
    interactive: false,
    force: false,
  });
  assertEquals(result.success, true);
  assertEquals(result.filesChanged.length, 0);
  assert(result.summary.includes("No Setting files"));
});

Deno.test("SettingMigration rollback is a no-op", async () => {
  const migration = new SettingMigration();
  await migration.rollback({
    backupPath: "/tmp/backup",
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    files: [],
  });
});
