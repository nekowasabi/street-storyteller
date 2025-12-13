/**
 * Setting v1→v2マイグレーション
 */

import type {
  BackupContext,
  Migration,
  MigrationCheck,
  MigrationOptions,
  MigrationResult,
  ProjectContext,
} from "../types.ts";

/**
 * Setting型のv1→v2マイグレーション
 * NOTE: v1にはSetting型が存在しないため、このマイグレーションは将来の拡張のためのプレースホルダー
 */
export class SettingMigration implements Migration {
  readonly id = "setting_v1_to_v2";
  readonly from = "1.0.0";
  readonly to = "2.0.0";
  readonly breaking = false; // 新規追加なので破壊的変更ではない

  /**
   * マイグレーション可能性チェック
   */
  async canMigrate(_project: ProjectContext): Promise<MigrationCheck> {
    return {
      canMigrate: true,
      reason: "Setting migration is optional (no v1 Setting type exists yet)",
      estimatedChanges: 0,
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
    // v1にSetting型が存在しないため、何もしない
    return {
      success: true,
      filesChanged: [],
      summary: "No Setting files to migrate (v1 does not have Setting type)",
    };
  }

  /**
   * ロールバック
   */
  async rollback(_backup: BackupContext): Promise<void> {
    // 何もしない
  }
}
