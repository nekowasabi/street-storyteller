/**
 * GitIntegrationのテスト
 */

import { assert, assertEquals } from "../asserts.ts";
import { GitIntegration } from "../../src/plugins/features/migration/git_integration.ts";

Deno.test("GitIntegration - マイグレーションブランチ名の生成", () => {
  const git = new GitIntegration("/test/project");

  const branchName = git.generateMigrationBranchName("1.0.0", "2.0.0");

  assert(branchName.startsWith("migration/"));
  assert(branchName.includes("1.0.0"));
  assert(branchName.includes("2.0.0"));
});

Deno.test("GitIntegration - コミットメッセージの生成", () => {
  const git = new GitIntegration("/test/project");

  const message = git.generateCommitMessage(
    "character_v1_to_v2",
    ["src/character.ts"],
    "Migrated Character from v1 to v2",
  );

  assert(message.includes("character_v1_to_v2"));
  assert(message.includes("src/character.ts"));
  assert(message.includes("Migrated Character from v1 to v2"));
});

Deno.test("GitIntegration - ブランチ作成コマンドの生成", () => {
  const git = new GitIntegration("/test/project");

  const command = git.createBranchCommand("migration/v1-to-v2");

  assertEquals(command, "git checkout -b migration/v1-to-v2");
});

Deno.test("GitIntegration - コミットコマンドの生成", () => {
  const git = new GitIntegration("/test/project");

  const commands = git.createCommitCommands(
    ["src/character.ts", "src/setting.ts"],
    "Migration step 1",
  );

  assertEquals(commands.length, 2);
  assert(commands[0].includes("git add"));
  assert(commands[1].includes("git commit"));
  assert(commands[1].includes("Migration step 1"));
});

Deno.test("GitIntegration - ロールバックコマンドの生成", () => {
  const git = new GitIntegration("/test/project");

  const command = git.createRollbackCommand("main");

  assert(command.includes("git checkout main"));
});

Deno.test("GitIntegration - マージコマンドの生成", () => {
  const git = new GitIntegration("/test/project");

  const command = git.createMergeCommand("migration/v1-to-v2");

  assert(command.includes("git merge migration/v1-to-v2"));
});
