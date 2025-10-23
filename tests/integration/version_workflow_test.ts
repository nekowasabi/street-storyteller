import { assertEquals, assert } from "../asserts.ts";
import { createVersionService } from "../../src/application/version_service.ts";
import type { FileSystemGateway } from "../../src/application/file_system_gateway.ts";
import { ok, err } from "../../src/shared/result.ts";
import type { ProjectMetadata } from "../../src/shared/config/schema.ts";
import { createStubLogger } from "../asserts.ts";

function createMockFileSystem(files: Record<string, string>): FileSystemGateway {
  return {
    async readFile(path: string) {
      if (files[path]) {
        return ok(files[path]);
      }
      return err({ code: "not_found", message: "File not found" });
    },
    async writeFile(path: string, content: string) {
      files[path] = content;
      return ok(undefined);
    },
    async ensureDir() {
      return ok(undefined);
    },
    async exists(path: string) {
      return ok(files[path] !== undefined);
    },
  };
}

Deno.test("統合テスト: プロジェクト作成→バージョン確認→更新フロー", async (t) => {
  const logger = createStubLogger();
  const files: Record<string, string> = {};
  const fs = createMockFileSystem(files);
  const versionService = createVersionService(fs, logger);
  const projectPath = "/test-project";

  await t.step("1. プロジェクトメタデータの初期作成", async () => {
    const initialMetadata: ProjectMetadata = {
      version: {
        version: "1.0.0",
        storytellerVersion: "0.2.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-01"),
      },
      features: {},
      compatibility: "strict",
    };

    const saveResult = await versionService.saveProjectMetadata(projectPath, initialMetadata);
    assert(saveResult.ok);

    // メタデータが保存されたことを確認
    const configPath = `${projectPath}/.storyteller/config.json`;
    assert(files[configPath]);
  });

  await t.step("2. プロジェクトメタデータの読み込み", async () => {
    const loadResult = await versionService.loadProjectMetadata(projectPath);
    assert(loadResult.ok);

    assertEquals(loadResult.value.version.version, "1.0.0");
    assertEquals(loadResult.value.version.storytellerVersion, "0.2.0");
  });

  await t.step("3. 互換性チェック（v2.0.0との互換性なし）", async () => {
    const compatibilityResult = await versionService.checkCompatibility(projectPath, "2.0.0");
    assert(compatibilityResult.ok);
    assert(!compatibilityResult.value.compatible);
  });

  await t.step("4. 更新チェック（メジャーアップデート必要）", async () => {
    const updateResult = await versionService.checkForUpdates(projectPath, "2.0.0");
    assert(updateResult.ok);
    assert(updateResult.value.updateAvailable);
    assertEquals(updateResult.value.recommendedAction, "migrate");
    assert(updateResult.value.breaking);
  });

  await t.step("5. マイナーバージョン更新（v1.5.0）", async () => {
    const loadResult = await versionService.loadProjectMetadata(projectPath);
    assert(loadResult.ok);

    const updatedMetadata: ProjectMetadata = {
      ...loadResult.value,
      version: {
        ...loadResult.value.version,
        version: "1.5.0",
        storytellerVersion: "0.3.0",
        lastUpdated: new Date("2025-01-10"),
      },
    };

    const saveResult = await versionService.saveProjectMetadata(projectPath, updatedMetadata);
    assert(saveResult.ok);

    // 更新後の確認
    const reloadResult = await versionService.loadProjectMetadata(projectPath);
    assert(reloadResult.ok);
    assertEquals(reloadResult.value.version.version, "1.5.0");
  });

  await t.step("6. 互換性チェック（v1.9.0との互換性あり）", async () => {
    const compatibilityResult = await versionService.checkCompatibility(projectPath, "1.9.0");
    assert(compatibilityResult.ok);
    assert(compatibilityResult.value.compatible);
  });

  await t.step("7. 更新チェック（マイナーアップデート可能）", async () => {
    const updateResult = await versionService.checkForUpdates(projectPath, "1.9.0");
    assert(updateResult.ok);
    assert(updateResult.value.updateAvailable);
    assertEquals(updateResult.value.recommendedAction, "update");
    assert(!updateResult.value.breaking);
  });

  await t.step("8. 機能フラグの追加", async () => {
    const loadResult = await versionService.loadProjectMetadata(projectPath);
    assert(loadResult.ok);

    const updatedMetadata: ProjectMetadata = {
      ...loadResult.value,
      features: {
        ...loadResult.value.features,
        character_details: true,
        migration_support: true,
      },
      version: {
        ...loadResult.value.version,
        lastUpdated: new Date("2025-01-15"),
      },
    };

    const saveResult = await versionService.saveProjectMetadata(projectPath, updatedMetadata);
    assert(saveResult.ok);

    // 機能フラグの確認
    const reloadResult = await versionService.loadProjectMetadata(projectPath);
    assert(reloadResult.ok);
    assertEquals(reloadResult.value.features.character_details, true);
    assertEquals(reloadResult.value.features.migration_support, true);
  });

  await t.step("9. 最終状態の確認", async () => {
    const finalResult = await versionService.loadProjectMetadata(projectPath);
    assert(finalResult.ok);

    const metadata = finalResult.value;
    assertEquals(metadata.version.version, "1.5.0");
    assertEquals(metadata.version.storytellerVersion, "0.3.0");
    assertEquals(metadata.compatibility, "strict");
    assertEquals(Object.keys(metadata.features).length, 2);
  });
});

Deno.test("統合テスト: looseモードでの互換性チェック", async () => {
  const logger = createStubLogger();
  const files: Record<string, string> = {};
  const fs = createMockFileSystem(files);
  const versionService = createVersionService(fs, logger);
  const projectPath = "/loose-project";

  const metadata: ProjectMetadata = {
    version: {
      version: "1.0.0",
      storytellerVersion: "0.2.0",
      created: new Date("2025-01-01"),
      lastUpdated: new Date("2025-01-01"),
    },
    features: {},
    compatibility: "loose",
  };

  await versionService.saveProjectMetadata(projectPath, metadata);

  // looseモードでもメジャーバージョンが違えば互換性なし
  const compatResult1 = await versionService.checkCompatibility(projectPath, "2.0.0");
  assert(compatResult1.ok);
  assert(!compatResult1.value.compatible);

  // looseモードではマイナー/パッチの違いは許容
  const compatResult2 = await versionService.checkCompatibility(projectPath, "1.9.5");
  assert(compatResult2.ok);
  assert(compatResult2.value.compatible);
});
