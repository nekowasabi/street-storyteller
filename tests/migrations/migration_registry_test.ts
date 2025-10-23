/**
 * MigrationRegistryのテスト
 */

import { assert, assertEquals } from "../asserts.ts";
import { MigrationRegistry } from "../../src/migrations/registry.ts";
import type {
  Migration,
  MigrationCheck,
  MigrationResult,
  MigrationOptions,
  ProjectContext,
  BackupContext,
} from "../../src/migrations/types.ts";

// テスト用のダミーマイグレーション
function createDummyMigration(
  id: string,
  from: string,
  to: string,
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
        estimatedChanges: 0,
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

Deno.test("MigrationRegistry - 基本的なマイグレーション登録", () => {
  const registry = new MigrationRegistry();
  const migration = createDummyMigration("test_v1_to_v2", "1.0.0", "2.0.0");

  registry.register(migration);

  const allMigrations = registry.getAll();
  assertEquals(allMigrations.length, 1);
  assertEquals(allMigrations[0].id, "test_v1_to_v2");
});

Deno.test("MigrationRegistry - 複数のマイグレーション登録", () => {
  const registry = new MigrationRegistry();

  registry.register(createDummyMigration("v1_to_v2", "1.0.0", "2.0.0"));
  registry.register(createDummyMigration("v2_to_v3", "2.0.0", "3.0.0"));
  registry.register(createDummyMigration("v3_to_v4", "3.0.0", "4.0.0"));

  const allMigrations = registry.getAll();
  assertEquals(allMigrations.length, 3);
});

Deno.test("MigrationRegistry - 直接パスの探索（v1.0.0 → v2.0.0）", () => {
  const registry = new MigrationRegistry();
  registry.register(createDummyMigration("v1_to_v2", "1.0.0", "2.0.0"));

  const path = registry.findPath("1.0.0", "2.0.0");

  assert(path);
  assertEquals(path.length, 1);
  assertEquals(path[0].id, "v1_to_v2");
  assertEquals(path[0].from, "1.0.0");
  assertEquals(path[0].to, "2.0.0");
});

Deno.test("MigrationRegistry - 段階的パスの探索（v1.0.0 → v3.0.0）", () => {
  const registry = new MigrationRegistry();
  registry.register(createDummyMigration("v1_to_v2", "1.0.0", "2.0.0"));
  registry.register(createDummyMigration("v2_to_v3", "2.0.0", "3.0.0"));

  const path = registry.findPath("1.0.0", "3.0.0");

  assert(path);
  assertEquals(path.length, 2);
  assertEquals(path[0].id, "v1_to_v2");
  assertEquals(path[1].id, "v2_to_v3");
});

Deno.test("MigrationRegistry - 複雑なグラフでのBFS探索", () => {
  const registry = new MigrationRegistry();

  // 複数の経路が存在するケース
  registry.register(createDummyMigration("v1_to_v2", "1.0.0", "2.0.0"));
  registry.register(createDummyMigration("v2_to_v3", "2.0.0", "3.0.0"));
  registry.register(createDummyMigration("v1_to_v3_direct", "1.0.0", "3.0.0")); // 直接パス

  // BFSは最短パスを見つけるはず
  const path = registry.findPath("1.0.0", "3.0.0");

  assert(path);
  // 最短パスは直接パス（1ステップ）
  assertEquals(path.length, 1);
  assertEquals(path[0].id, "v1_to_v3_direct");
});

Deno.test("MigrationRegistry - パスが見つからない場合", () => {
  const registry = new MigrationRegistry();
  registry.register(createDummyMigration("v1_to_v2", "1.0.0", "2.0.0"));

  const path = registry.findPath("1.0.0", "5.0.0");

  assertEquals(path, null);
});

Deno.test("MigrationRegistry - 同じバージョン間のパス", () => {
  const registry = new MigrationRegistry();
  registry.register(createDummyMigration("v1_to_v2", "1.0.0", "2.0.0"));

  const path = registry.findPath("2.0.0", "2.0.0");

  // 同じバージョンの場合は空の配列を返す
  assert(path);
  assertEquals(path.length, 0);
});

Deno.test("MigrationRegistry - 循環グラフでの探索（無限ループ防止）", () => {
  const registry = new MigrationRegistry();

  // 循環を作る（v1 → v2 → v3 → v1）
  registry.register(createDummyMigration("v1_to_v2", "1.0.0", "2.0.0"));
  registry.register(createDummyMigration("v2_to_v3", "2.0.0", "3.0.0"));
  registry.register(createDummyMigration("v3_to_v1", "3.0.0", "1.0.0"));

  // v1 → v3は見つかるはず（v1 → v2 → v3）
  const path = registry.findPath("1.0.0", "3.0.0");

  assert(path);
  assertEquals(path.length, 2);
  assertEquals(path[0].id, "v1_to_v2");
  assertEquals(path[1].id, "v2_to_v3");
});
