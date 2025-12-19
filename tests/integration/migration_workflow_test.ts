/**
 * マイグレーションワークフローの統合テスト
 * v1→v2の完全フローをテスト
 */

import { assert, assertEquals } from "../asserts.ts";
import { MigrationRegistry } from "@storyteller/migrations/registry.ts";
import { MigrationPlugin } from "@storyteller/plugins/features/migration/plugin.ts";
import { MigrationWizard } from "@storyteller/plugins/features/migration/wizard.ts";
import { GitIntegration } from "@storyteller/plugins/features/migration/git_integration.ts";
import { CharacterMigration } from "@storyteller/migrations/v1_to_v2/character_migration.ts";
import { SettingMigration } from "@storyteller/migrations/v1_to_v2/setting_migration.ts";
import { ProjectMetadataMigration } from "@storyteller/migrations/v1_to_v2/project_metadata_migration.ts";
import type { ProjectContext } from "@storyteller/migrations/types.ts";

Deno.test("統合テスト - v1→v2マイグレーション完全フロー", async () => {
  // 1. MigrationRegistryにv1→v2のマイグレーションを登録
  const registry = new MigrationRegistry();
  registry.register(new CharacterMigration());
  registry.register(new SettingMigration());
  registry.register(new ProjectMetadataMigration());

  // 2. プロジェクトコンテキストの作成
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

  // 3. MigrationWizardでマイグレーションを分析
  const wizard = new MigrationWizard(registry);
  const analysis = await wizard.analyzeMigration(projectContext, "2.0.0");

  assert(analysis.success, "Migration analysis should succeed");
  // Character, Setting, ProjectMetadataのマイグレーションはすべて1.0.0→2.0.0なので、
  // 最初に見つかったものだけがパスに含まれる（BFSの特性）
  assert(analysis.steps >= 1, "Should have at least 1 migration step");
  assert(analysis.path, "Migration path should exist");
  assert(analysis.path.length >= 1, "Path should have at least 1 migration");

  // 4. サマリーメッセージの生成
  const summary = wizard.generateSummary(analysis);
  assert(summary.includes("1.0.0"), "Summary should mention source version");
  assert(summary.includes("2.0.0"), "Summary should mention target version");

  // 5. MigrationPluginでマイグレーションを実行（ドライランモード）
  const plugin = new MigrationPlugin(registry);
  const dryRunResult = await plugin.executeMigration(
    projectContext,
    "2.0.0",
    { dryRun: true, interactive: false, force: false },
  );

  assert(dryRunResult.success, "Dry-run should succeed");
  assertEquals(
    dryRunResult.migrationsExecuted,
    0,
    "Dry-run should not execute migrations",
  );

  // 6. MigrationPluginでマイグレーションを実行（実行モード）
  const actualResult = await plugin.executeMigration(
    projectContext,
    "2.0.0",
    { dryRun: false, interactive: false, force: false },
  );

  assert(actualResult.success, "Migration should succeed");
  assert(
    actualResult.migrationsExecuted >= 1,
    "Should execute at least 1 migration",
  );
});

Deno.test("統合テスト - Git統合フロー", () => {
  // 1. GitIntegrationの初期化
  const git = new GitIntegration("/test/project");

  // 2. マイグレーションブランチ名の生成
  const branchName = git.generateMigrationBranchName("1.0.0", "2.0.0");
  assert(
    branchName.startsWith("migration/"),
    "Branch name should start with 'migration/'",
  );

  // 3. ブランチ作成コマンドの生成
  const branchCommand = git.createBranchCommand(branchName);
  assert(
    branchCommand.includes("git checkout -b"),
    "Should create checkout command",
  );

  // 4. コミットメッセージの生成
  const commitMessage = git.generateCommitMessage(
    "character_v1_to_v2",
    ["src/type/character.ts"],
    "Migrated Character from v1 to v2",
  );
  assert(
    commitMessage.includes("character_v1_to_v2"),
    "Commit message should include migration ID",
  );

  // 5. コミットコマンドの生成
  const commitCommands = git.createCommitCommands(
    ["src/type/character.ts"],
    "Migration step 1",
  );
  assertEquals(
    commitCommands.length,
    2,
    "Should generate add and commit commands",
  );

  // 6. ロールバックコマンドの生成
  const rollbackCommand = git.createRollbackCommand("main");
  assert(
    rollbackCommand.includes("git checkout main"),
    "Should create rollback command",
  );
});

Deno.test("統合テスト - マイグレーションパスが見つからない場合", async () => {
  // 1. MigrationRegistryにv1→v2のみ登録
  const registry = new MigrationRegistry();
  registry.register(new CharacterMigration());

  // 2. プロジェクトコンテキストの作成
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

  // 3. MigrationWizardでマイグレーションを分析（存在しないバージョン）
  const wizard = new MigrationWizard(registry);
  const analysis = await wizard.analyzeMigration(projectContext, "5.0.0");

  assertEquals(
    analysis.success,
    false,
    "Analysis should fail for non-existent version",
  );
  assert(analysis.error, "Should have error message");
  assert(
    analysis.error.includes("No migration path found"),
    "Error should mention no path found",
  );
});

Deno.test("統合テスト - 同じバージョンへのマイグレーション", async () => {
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
    "2.0.0",
    { dryRun: false, interactive: false, force: false },
  );

  assert(result.success, "Should succeed for same version");
  assertEquals(
    result.migrationsExecuted,
    0,
    "Should not execute any migrations",
  );
});
