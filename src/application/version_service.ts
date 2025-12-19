/**
 * バージョン管理サービス
 * プロジェクトメタデータの読み書き、互換性チェック、更新チェックを提供
 */

import type {
  FileSystemError,
  FileSystemGateway,
} from "@storyteller/application/file_system_gateway.ts";
import type { Logger } from "@storyteller/shared/logging/types.ts";
import { err, ok, type Result } from "@storyteller/shared/result.ts";
import {
  parseProjectMetadata,
  type ProjectMetadata,
} from "@storyteller/shared/config/schema.ts";
import {
  checkUpdates,
  type CompatibilityCheckResult,
  isCompatible,
  type UpdateCheckResult,
} from "@storyteller/core/version_manager.ts";

const CONFIG_DIR = ".storyteller";
const CONFIG_FILE = "config.json";

export interface VersionServiceError {
  readonly code:
    | "not_found"
    | "invalid_format"
    | "write_error"
    | FileSystemError["code"];
  readonly message: string;
}

export interface VersionService {
  loadProjectMetadata(
    projectPath: string,
  ): Promise<Result<ProjectMetadata, VersionServiceError>>;
  saveProjectMetadata(
    projectPath: string,
    metadata: ProjectMetadata,
  ): Promise<Result<void, VersionServiceError>>;
  checkCompatibility(
    projectPath: string,
    currentVersion: string,
  ): Promise<Result<CompatibilityCheckResult, VersionServiceError>>;
  checkForUpdates(
    projectPath: string,
    currentVersion: string,
  ): Promise<Result<UpdateCheckResult, VersionServiceError>>;
}

export function createVersionService(
  fileSystem: FileSystemGateway,
  logger: Logger,
): VersionService {
  function getConfigPath(projectPath: string): string {
    return `${projectPath}/${CONFIG_DIR}/${CONFIG_FILE}`;
  }

  return {
    async loadProjectMetadata(
      projectPath: string,
    ): Promise<Result<ProjectMetadata, VersionServiceError>> {
      const configPath = getConfigPath(projectPath);
      logger.debug("Loading project metadata", { path: configPath });

      const readResult = await fileSystem.readFile(configPath);
      if (!readResult.ok) {
        return err({
          code: readResult.error.code,
          message: `Failed to read metadata: ${readResult.error.message}`,
        });
      }

      try {
        const metadata = parseProjectMetadata(JSON.parse(readResult.value));
        logger.debug("Project metadata loaded successfully", {
          version: metadata.version.version,
        });
        return ok(metadata);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Failed to parse project metadata", { error: message });
        return err({
          code: "invalid_format",
          message: `Invalid metadata format: ${message}`,
        });
      }
    },

    async saveProjectMetadata(
      projectPath: string,
      metadata: ProjectMetadata,
    ): Promise<Result<void, VersionServiceError>> {
      const configPath = getConfigPath(projectPath);
      const configDir = `${projectPath}/${CONFIG_DIR}`;

      logger.debug("Saving project metadata", { path: configPath });

      // ディレクトリ作成
      const ensureDirResult = await fileSystem.ensureDir(configDir);
      if (!ensureDirResult.ok) {
        return err({
          code: ensureDirResult.error.code,
          message:
            `Failed to create config directory: ${ensureDirResult.error.message}`,
        });
      }

      // メタデータをJSON化
      const content = JSON.stringify(metadata, null, 2) + "\n";

      // ファイル書き込み
      const writeResult = await fileSystem.writeFile(configPath, content);
      if (!writeResult.ok) {
        return err({
          code: "write_error",
          message: `Failed to write metadata: ${writeResult.error.message}`,
        });
      }

      logger.debug("Project metadata saved successfully");
      return ok(undefined);
    },

    async checkCompatibility(
      projectPath: string,
      currentVersion: string,
    ): Promise<Result<CompatibilityCheckResult, VersionServiceError>> {
      const metadataResult = await this.loadProjectMetadata(projectPath);
      if (!metadataResult.ok) {
        return err(metadataResult.error);
      }

      const compatibilityResult = isCompatible(
        metadataResult.value,
        currentVersion,
      );
      logger.debug("Compatibility check completed", {
        compatible: compatibilityResult.compatible,
        projectVersion: metadataResult.value.version.version,
        currentVersion,
      });

      return ok(compatibilityResult);
    },

    async checkForUpdates(
      projectPath: string,
      currentVersion: string,
    ): Promise<Result<UpdateCheckResult, VersionServiceError>> {
      const metadataResult = await this.loadProjectMetadata(projectPath);
      if (!metadataResult.ok) {
        return err(metadataResult.error);
      }

      const updateResult = checkUpdates(metadataResult.value, currentVersion);
      logger.debug("Update check completed", {
        updateAvailable: updateResult.updateAvailable,
        recommendedAction: updateResult.recommendedAction,
        projectVersion: metadataResult.value.version.version,
        currentVersion,
      });

      return ok(updateResult);
    },
  };
}
