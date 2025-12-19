/**
 * MigrationWizard
 * インタラクティブなマイグレーション実行のためのウィザード
 */

import type { MigrationRegistry } from "@storyteller/migrations/registry.ts";
import type {
  Migration,
  ProjectContext,
} from "@storyteller/migrations/types.ts";

/**
 * マイグレーション分析結果
 */
export interface MigrationAnalysis {
  /** 成功したかどうか */
  readonly success: boolean;
  /** マイグレーションステップ数 */
  readonly steps: number;
  /** 推定される変更数の合計 */
  readonly estimatedChanges: number;
  /** マイグレーションパス */
  readonly path?: Migration[];
  /** エラーメッセージ（失敗時） */
  readonly error?: string;
}

/**
 * MigrationWizard
 * マイグレーションの分析と進捗表示を管理
 */
export class MigrationWizard {
  constructor(private registry: MigrationRegistry) {}

  /**
   * マイグレーションを分析
   *
   * @param project プロジェクトコンテキスト
   * @param targetVersion 目標バージョン
   * @returns マイグレーション分析結果
   */
  async analyzeMigration(
    project: ProjectContext,
    targetVersion: string,
  ): Promise<MigrationAnalysis> {
    const { currentVersion } = project;

    // マイグレーションパスを探索
    const path = this.registry.findPath(currentVersion, targetVersion);

    if (path === null) {
      return {
        success: false,
        steps: 0,
        estimatedChanges: 0,
        error:
          `No migration path found from ${currentVersion} to ${targetVersion}`,
      };
    }

    // 各マイグレーションのcanMigrateをチェック
    let totalEstimatedChanges = 0;

    for (const migration of path) {
      const check = await migration.canMigrate(project);

      if (!check.canMigrate) {
        return {
          success: false,
          steps: 0,
          estimatedChanges: 0,
          error:
            `Migration ${migration.id} cannot be executed: ${check.reason}`,
        };
      }

      totalEstimatedChanges += check.estimatedChanges;
    }

    return {
      success: true,
      steps: path.length,
      estimatedChanges: totalEstimatedChanges,
      path,
    };
  }

  /**
   * マイグレーション分析のサマリーメッセージを生成
   *
   * @param analysis マイグレーション分析結果
   * @returns サマリーメッセージ
   */
  generateSummary(analysis: MigrationAnalysis): string {
    if (!analysis.success) {
      return `Migration analysis failed: ${analysis.error}`;
    }

    const { steps, estimatedChanges, path } = analysis;

    if (steps === 0) {
      return "No migration needed (already at target version)";
    }

    const fromVersion = path![0].from;
    const toVersion = path![path!.length - 1].to;

    return `Migration from ${fromVersion} to ${toVersion} will execute ${steps} step(s) and affect approximately ${estimatedChanges} file(s).`;
  }
}
