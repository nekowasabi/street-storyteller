/**
 * プロジェクトルート検出器
 * ファイルURIから最も近い.storyteller.jsonを検出し、プロジェクトルートを返す
 *
 * monorepo内のサブプロジェクト（samples/cinderella等）を正しく検出するために、
 * 各LSPリクエストでファイルに対応するプロジェクトを動的に特定する。
 */

/**
 * プロジェクト検出結果
 */
export type ProjectDetectionResult = {
  /** プロジェクトルートの絶対パス */
  projectRoot: string;
  /** 検出元のマーカーファイル（.storyteller.json） */
  markerFile: string;
};

/**
 * プロジェクトルート検出器クラス
 */
export class ProjectDetector {
  /** 検出結果のキャッシュ (fileUri -> projectRoot) */
  private readonly cache = new Map<string, string>();

  /** フォールバックのプロジェクトルート（起動時に渡されたもの） */
  private readonly fallbackProjectRoot: string;

  /** マーカーファイル名 */
  private static readonly MARKER_FILE = ".storyteller.json";

  /** 最大検索深度（無限ループ防止） */
  private static readonly MAX_SEARCH_DEPTH = 20;

  /**
   * @param fallbackProjectRoot フォールバック用のプロジェクトルート（.storyteller.jsonが見つからない場合に使用）
   */
  constructor(fallbackProjectRoot: string) {
    this.fallbackProjectRoot = fallbackProjectRoot;
  }

  /**
   * ファイルURIからプロジェクトルートを検出
   * @param fileUri ドキュメントのfile:// URI
   * @returns プロジェクトルート（絶対パス）
   */
  async detectProjectRoot(fileUri: string): Promise<string> {
    // キャッシュチェック
    const cached = this.cache.get(fileUri);
    if (cached) {
      return cached;
    }

    // file://プロトコルを除去
    const filePath = this.uriToPath(fileUri);

    // 上方向に.storyteller.jsonを探索
    const result = await this.findMarkerFile(filePath);

    const projectRoot = result?.projectRoot ?? this.fallbackProjectRoot;

    // キャッシュに保存
    this.cache.set(fileUri, projectRoot);

    return projectRoot;
  }

  /**
   * file:// URIをファイルパスに変換
   */
  private uriToPath(uri: string): string {
    if (uri.startsWith("file://")) {
      return uri.substring(7);
    }
    return uri;
  }

  /**
   * マーカーファイルを上方向に探索
   * @param startPath 開始パス（ファイルまたはディレクトリ）
   * @returns 検出結果、見つからない場合はnull
   */
  private async findMarkerFile(
    startPath: string,
  ): Promise<ProjectDetectionResult | null> {
    let currentDir = startPath;
    let depth = 0;

    // ファイルの場合はディレクトリを取得
    try {
      const stat = await Deno.stat(currentDir);
      if (stat.isFile) {
        const lastSlash = currentDir.lastIndexOf("/");
        currentDir = currentDir.substring(0, lastSlash);
      }
    } catch {
      // 存在しないパスの場合はnullを返す
      return null;
    }

    // ルートディレクトリまで遡る
    while (currentDir.length > 1 && depth < ProjectDetector.MAX_SEARCH_DEPTH) {
      const markerPath = `${currentDir}/${ProjectDetector.MARKER_FILE}`;

      try {
        const stat = await Deno.stat(markerPath);
        if (stat.isFile) {
          return {
            projectRoot: currentDir,
            markerFile: markerPath,
          };
        }
      } catch {
        // ファイルが存在しない場合は続行
      }

      // 親ディレクトリへ
      const lastSlash = currentDir.lastIndexOf("/");
      if (lastSlash <= 0) {
        break;
      }
      currentDir = currentDir.substring(0, lastSlash);
      depth++;
    }

    return null;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * キャッシュサイズを取得（テスト用）
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
