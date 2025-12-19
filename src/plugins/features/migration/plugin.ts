/**
 * MigrationPlugin
 * マイグレーションの実行エンジン、バックアップ、ロールバックを管理
 */

import type { MigrationRegistry } from "@storyteller/migrations/registry.ts";
import type {
  MigrationOptions,
  ProjectContext,
} from "@storyteller/migrations/types.ts";

/**
 * マイグレーション実行結果
 */
export interface MigrationExecutionResult {
  /** 成功したかどうか */
  readonly success: boolean;
  /** 実行されたマイグレーションの数 */
  readonly migrationsExecuted: number;
  /** 変更されたファイルの総数 */
  readonly totalFilesChanged?: number;
  /** エラーメッセージ（失敗時） */
  readonly error?: string;
}

/**
 * MigrationPlugin
 * マイグレーションの実行を統括
 */
export class MigrationPlugin {
  constructor(private registry: MigrationRegistry) {}

  /**
   * マイグレーションを実行
   *
   * @param project プロジェクトコンテキスト
   * @param targetVersion 目標バージョン
   * @param options マイグレーション実行オプション
   * @returns マイグレーション実行結果
   */
  async executeMigration(
    project: ProjectContext,
    targetVersion: string,
    options: MigrationOptions,
  ): Promise<MigrationExecutionResult> {
    const { currentVersion } = project;

    // マイグレーションパスを探索
    const path = this.registry.findPath(currentVersion, targetVersion);

    if (path === null) {
      return {
        success: false,
        migrationsExecuted: 0,
        error:
          `No migration path found from ${currentVersion} to ${targetVersion}`,
      };
    }

    // 同じバージョンの場合はマイグレーション不要
    if (path.length === 0) {
      return {
        success: true,
        migrationsExecuted: 0,
        totalFilesChanged: 0,
      };
    }

    // ドライランモードの場合は実際には実行しない
    if (options.dryRun) {
      return {
        success: true,
        migrationsExecuted: 0,
        totalFilesChanged: 0,
      };
    }

    // マイグレーションを順番に実行
    let totalFilesChanged = 0;
    let migrationsExecuted = 0;

    for (const migration of path) {
      const result = await migration.migrate(project, options);

      if (!result.success) {
        return {
          success: false,
          migrationsExecuted,
          totalFilesChanged,
          error: `Migration ${migration.id} failed: ${result.summary}`,
        };
      }

      totalFilesChanged += result.filesChanged.length;
      migrationsExecuted++;
    }

    return {
      success: true,
      migrationsExecuted,
      totalFilesChanged,
    };
  }
}
