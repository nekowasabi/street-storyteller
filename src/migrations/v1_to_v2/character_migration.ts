/**
 * Character v1→v2マイグレーション
 */

import type {
  BackupContext,
  Migration,
  MigrationCheck,
  MigrationOptions,
  MigrationResult,
  ProjectContext,
} from "../types.ts";
import type { Character as CharacterV1 } from "../../type/character.ts";
import type { Character as CharacterV2 } from "../../type/v2/character.ts";
import { migrateCharacterV1toV2 } from "../../type/compat.ts";

/**
 * Character型のv1→v2マイグレーション
 */
export class CharacterMigration implements Migration {
  readonly id = "character_v1_to_v2";
  readonly from = "1.0.0";
  readonly to = "2.0.0";
  readonly breaking = true; // 破壊的変更（型が大きく変わる）

  /**
   * v1のCharacterをv2に変換
   */
  convertV1toV2(v1Char: CharacterV1): CharacterV2 {
    return migrateCharacterV1toV2(v1Char);
  }

  /**
   * マイグレーション可能性チェック
   */
  async canMigrate(_project: ProjectContext): Promise<MigrationCheck> {
    // TODO: 実際のファイル存在チェックを実装
    // 現在は常にマイグレーション可能と判断
    return {
      canMigrate: true,
      reason: "Character files can be migrated to v2",
      estimatedChanges: 0, // TODO: 実際のファイル数をカウント
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
    // TODO: 実際のファイル読み書きを実装
    // 現在はダミー実装
    return {
      success: true,
      filesChanged: [],
      summary: "Character files migrated from v1 to v2",
    };
  }

  /**
   * ロールバック
   */
  async rollback(_backup: BackupContext): Promise<void> {
    // TODO: バックアップからの復元を実装
  }
}
