/**
 * マイグレーションシステムの型定義
 */

import type { ProjectMetadata } from "@storyteller/core/version_manager.ts";

/**
 * プロジェクトコンテキスト
 * マイグレーション対象のプロジェクト情報
 */
export interface ProjectContext {
  /** プロジェクトのルートパス */
  readonly projectPath: string;
  /** 現在のバージョン */
  readonly currentVersion: string;
  /** プロジェクトメタデータ */
  readonly metadata: ProjectMetadata;
}

/**
 * マイグレーション可能性チェック結果
 */
export interface MigrationCheck {
  /** マイグレーション可能かどうか */
  readonly canMigrate: boolean;
  /** 理由（可能/不可能の説明） */
  readonly reason: string;
  /** 推定される変更数 */
  readonly estimatedChanges: number;
  /** 警告メッセージ（オプショナル） */
  readonly warnings?: string[];
}

/**
 * マイグレーション実行結果
 */
export interface MigrationResult {
  /** 成功したかどうか */
  readonly success: boolean;
  /** 変更されたファイルのリスト */
  readonly filesChanged: string[];
  /** 実行サマリー */
  readonly summary: string;
  /** エラーメッセージ（オプショナル） */
  readonly errors?: string[];
}

/**
 * マイグレーション実行オプション
 */
export interface MigrationOptions {
  /** ドライランモード（実際の変更はしない） */
  readonly dryRun: boolean;
  /** インタラクティブモード（確認を求める） */
  readonly interactive: boolean;
  /** 強制実行（警告を無視） */
  readonly force: boolean;
}

/**
 * バックアップコンテキスト
 * ロールバック時に使用
 */
export interface BackupContext {
  /** バックアップのパス */
  readonly backupPath: string;
  /** バックアップの作成日時 */
  readonly createdAt: Date;
  /** バックアップに含まれるファイルのリスト */
  readonly files: string[];
}

/**
 * Migrationインターフェース
 * 個々のマイグレーションスクリプトが実装すべきインターフェース
 */
export interface Migration {
  /** マイグレーションの一意なID */
  readonly id: string;
  /** マイグレーション元のバージョン */
  readonly from: string;
  /** マイグレーション先のバージョン */
  readonly to: string;
  /** 破壊的変更かどうか */
  readonly breaking: boolean;

  /**
   * マイグレーション可能かどうかをチェック
   * @param project プロジェクトコンテキスト
   * @returns マイグレーション可能性チェック結果
   */
  canMigrate(project: ProjectContext): Promise<MigrationCheck>;

  /**
   * マイグレーションを実行
   * @param project プロジェクトコンテキスト
   * @param options マイグレーション実行オプション
   * @returns マイグレーション実行結果
   */
  migrate(
    project: ProjectContext,
    options: MigrationOptions,
  ): Promise<MigrationResult>;

  /**
   * マイグレーションをロールバック
   * @param backup バックアップコンテキスト
   */
  rollback(backup: BackupContext): Promise<void>;
}
