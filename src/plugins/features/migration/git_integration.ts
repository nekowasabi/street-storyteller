/**
 * GitIntegration
 * マイグレーション時のGit操作を統合
 */

/**
 * GitIntegration
 * マイグレーションブランチの作成、コミット、ロールバックを管理
 */
export class GitIntegration {
  constructor(private projectPath: string) {}

  /**
   * マイグレーションブランチ名を生成
   *
   * @param fromVersion マイグレーション元バージョン
   * @param toVersion マイグレーション先バージョン
   * @returns ブランチ名
   */
  generateMigrationBranchName(fromVersion: string, toVersion: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(
      0,
      19,
    );
    return `migration/v${fromVersion}-to-v${toVersion}-${timestamp}`;
  }

  /**
   * コミットメッセージを生成
   *
   * @param migrationId マイグレーションID
   * @param filesChanged 変更されたファイルのリスト
   * @param summary サマリー
   * @returns コミットメッセージ
   */
  generateCommitMessage(
    migrationId: string,
    filesChanged: string[],
    summary: string,
  ): string {
    const header = `chore(migration): ${migrationId}`;
    const body = [
      summary,
      "",
      "Files changed:",
      ...filesChanged.map((file) => `- ${file}`),
    ].join("\n");

    return `${header}\n\n${body}`;
  }

  /**
   * ブランチ作成コマンドを生成
   *
   * @param branchName ブランチ名
   * @returns Gitコマンド
   */
  createBranchCommand(branchName: string): string {
    return `git checkout -b ${branchName}`;
  }

  /**
   * コミットコマンドを生成
   *
   * @param filesChanged 変更されたファイルのリスト
   * @param message コミットメッセージ
   * @returns Gitコマンドの配列
   */
  createCommitCommands(filesChanged: string[], message: string): string[] {
    const addCommand = `git add ${filesChanged.join(" ")}`;
    const commitCommand = `git commit -m "${message}"`;

    return [addCommand, commitCommand];
  }

  /**
   * ロールバックコマンドを生成
   *
   * @param baseBranch ベースブランチ名（通常は "main" または "master"）
   * @returns Gitコマンド
   */
  createRollbackCommand(baseBranch: string): string {
    return `git checkout ${baseBranch}`;
  }

  /**
   * マージコマンドを生成
   *
   * @param migrationBranch マイグレーションブランチ名
   * @returns Gitコマンド
   */
  createMergeCommand(migrationBranch: string): string {
    return `git merge ${migrationBranch} --no-ff`;
  }
}
