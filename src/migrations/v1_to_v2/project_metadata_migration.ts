/**
 * ProjectMetadata v1→v2マイグレーション
 */

import type {
  Migration,
  MigrationCheck,
  MigrationResult,
  MigrationOptions,
  ProjectContext,
  BackupContext,
} from "../types.ts";

/**
 * プロジェクトメタデータのv1→v2マイグレーション
 */
export class ProjectMetadataMigration implements Migration {
  readonly id = "project_metadata_v1_to_v2";
  readonly from = "1.0.0";
  readonly to = "2.0.0";
  readonly breaking = false; // メタデータの更新なので破壊的変更ではない

  /**
   * マイグレーション可能性チェック
   */
  async canMigrate(_project: ProjectContext): Promise<MigrationCheck> {
    return {
      canMigrate: true,
      reason: "Project metadata can be updated to v2",
      estimatedChanges: 1, // .storyteller/config.json の更新
      warnings: [],
    };
  }

  /**
   * マイグレーション実行
   */
  async migrate(
    _project: ProjectContext,
    _options: MigrationOptions,
  ): Promise<MigrationResult> {
    // TODO: 実際の.storyteller/config.jsonの更新を実装
    // 現在はダミー実装
    return {
      success: true,
      filesChanged: [".storyteller/config.json"],
      summary: "Project metadata updated to v2",
    };
  }

  /**
   * ロールバック
   */
  async rollback(_backup: BackupContext): Promise<void> {
    // TODO: バックアップからの復元を実装
  }
}
