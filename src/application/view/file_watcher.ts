/**
 * ファイル監視クラス
 * ディレクトリ内のファイル変更を検出し、デバウンス処理付きでコールバックを呼び出す
 */

/**
 * FileWatcherオプション
 */
export interface FileWatcherOptions {
  /** 変更時のコールバック */
  onChange: (changedPaths: string[]) => void;
  /** デバウンス時間（ミリ秒） */
  debounceMs: number;
}

/**
 * ファイル監視クラス
 */
export class FileWatcher {
  private readonly watchPath: string;
  private readonly onChange: (changedPaths: string[]) => void;
  private readonly debounceMs: number;
  private watcher: Deno.FsWatcher | null = null;
  private debounceTimer: number | null = null;
  private pendingPaths: Set<string> = new Set();
  private running = false;

  constructor(watchPath: string, options: FileWatcherOptions) {
    this.watchPath = watchPath;
    this.onChange = options.onChange;
    this.debounceMs = options.debounceMs;
  }

  /**
   * 監視を開始
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.watcher = Deno.watchFs(this.watchPath);

    // イベントループを開始（非同期で実行）
    this.processEvents();
  }

  /**
   * 監視を停止
   */
  stop(): void {
    this.running = false;

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    this.pendingPaths.clear();
  }

  /**
   * ファイルシステムイベントを処理
   */
  private async processEvents(): Promise<void> {
    if (!this.watcher) return;

    try {
      for await (const event of this.watcher) {
        if (!this.running) break;

        // イベントタイプに基づいて処理
        if (
          event.kind === "create" || event.kind === "modify" ||
          event.kind === "remove"
        ) {
          for (const path of event.paths) {
            this.pendingPaths.add(path);
          }
          this.scheduleCallback();
        }
      }
    } catch (error) {
      // watcherが閉じられた場合のエラーは無視
      if (error instanceof Deno.errors.BadResource) {
        return;
      }
      // その他のエラーは再スロー
      if (this.running) {
        throw error;
      }
    }
  }

  /**
   * デバウンス付きでコールバックをスケジュール
   */
  private scheduleCallback(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      if (!this.running) return;

      const paths = Array.from(this.pendingPaths);
      this.pendingPaths.clear();

      if (paths.length > 0) {
        this.onChange(paths);
      }
    }, this.debounceMs);
  }
}
