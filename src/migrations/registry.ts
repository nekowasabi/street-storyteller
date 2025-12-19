/**
 * MigrationRegistry
 * マイグレーションの登録とパス探索を管理
 */

import type { Migration } from "@storyteller/migrations/types.ts";

/**
 * マイグレーションレジストリ
 * BFS（幅優先探索）でバージョン間の最短マイグレーションパスを見つける
 */
export class MigrationRegistry {
  private migrations: Migration[] = [];

  /**
   * マイグレーションを登録
   * @param migration 登録するマイグレーション
   */
  register(migration: Migration): void {
    this.migrations.push(migration);
  }

  /**
   * すべての登録済みマイグレーションを取得
   * @returns すべてのマイグレーション
   */
  getAll(): Migration[] {
    return [...this.migrations];
  }

  /**
   * バージョン間の最短マイグレーションパスを探索（BFS）
   *
   * @param from 開始バージョン
   * @param to 目標バージョン
   * @returns マイグレーションの配列（パスが見つからない場合はnull）
   */
  findPath(from: string, to: string): Migration[] | null {
    // 同じバージョンの場合は空の配列を返す
    if (from === to) {
      return [];
    }

    // BFS用のキュー: [現在のバージョン, そこまでのパス]
    const queue: Array<[string, Migration[]]> = [[from, []]];

    // 訪問済みバージョンを記録（無限ループ防止）
    const visited = new Set<string>([from]);

    while (queue.length > 0) {
      const [currentVersion, path] = queue.shift()!;

      // 現在のバージョンから遷移可能なマイグレーションを探す
      for (const migration of this.migrations) {
        if (migration.from !== currentVersion) {
          continue;
        }

        const nextVersion = migration.to;
        const nextPath = [...path, migration];

        // 目標バージョンに到達した場合
        if (nextVersion === to) {
          return nextPath;
        }

        // まだ訪問していないバージョンの場合、キューに追加
        if (!visited.has(nextVersion)) {
          visited.add(nextVersion);
          queue.push([nextVersion, nextPath]);
        }
      }
    }

    // パスが見つからなかった
    return null;
  }
}
