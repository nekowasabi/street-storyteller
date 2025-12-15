/**
 * LSPプロバイダー共通ユーティリティ
 * 各プロバイダーで使用するヘルパー関数を一元管理
 */

/**
 * コンテンツが有効かどうかをチェック
 * 空文字列、空白のみの文字列はfalse
 */
export function isValidContent(content: string): boolean {
  return content.trim().length > 0;
}

/**
 * ファイルパスをfile:// URIに変換
 * @param filePath 相対または絶対ファイルパス
 * @param projectPath プロジェクトルートパス
 * @returns file:// URI
 */
export function filePathToUri(filePath: string, projectPath: string): string {
  // 絶対パスの場合はそのまま使用
  if (filePath.startsWith("/")) {
    return `file://${filePath}`;
  }

  // プロジェクトパスの末尾スラッシュを正規化
  const normalizedProjectPath = projectPath.endsWith("/")
    ? projectPath.slice(0, -1)
    : projectPath;

  return `file://${normalizedProjectPath}/${filePath}`;
}
