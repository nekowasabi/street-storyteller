/**
 * ファイル参照検出ユーティリティ
 * Process1: LSP拡張のためのファイル参照パターン検出と解決
 *
 * TypeScriptファイル内の { file: "./path.md" } パターンを検出し、
 * 参照先ファイルのパス解決を行う
 *
 * Process100: リファクタリングで以下を追加
 * - getLineAtPosition: 行取得ユーティリティ
 * - ログ機能: デバッグ用オプショナルログ
 */

/**
 * デバッグログを出力
 * 環境変数 STORYTELLER_LSP_DEBUG=1 でデバッグログを有効化
 *
 * @param message ログメッセージ
 * @param data 追加データ（オプション）
 */
export function debugLog(message: string, data?: unknown): void {
  // 遅延評価: 環境変数アクセスは実行時にのみ行う
  let debugEnabled = false;
  try {
    debugEnabled = Deno.env.get("STORYTELLER_LSP_DEBUG") === "1";
  } catch {
    // 環境変数アクセス権限がない場合は無効として扱う
  }

  if (debugEnabled) {
    if (data !== undefined) {
      console.error(`[file_ref_utils] ${message}`, data);
    } else {
      console.error(`[file_ref_utils] ${message}`);
    }
  }
}

/**
 * ファイル参照パターン
 * { file: "./path.md" } または { "file": "path.md" } を検出する正規表現
 *
 * キャプチャグループ:
 * - グループ1: ファイルパス（引用符なし）
 */
export const FILE_REF_PATTERN = /\{\s*["']?file["']?\s*:\s*["']([^"']+)["']\s*\}/;

/**
 * storyteller専用ディレクトリかどうかを判定
 * denolsとの競合を回避するため、storyteller LSPは
 * 特定のディレクトリ（characters/, settings/, samples/）のみを処理
 *
 * @param uri ファイルURI（file://プロトコル）
 * @returns storyteller専用ディレクトリの場合true
 */
export function isStorytellerFile(uri: string): boolean {
  return (
    uri.includes("/characters/") ||
    uri.includes("/settings/") ||
    uri.includes("/samples/")
  );
}

/**
 * ファイル参照検出結果
 */
export type FileReferenceResult = {
  /** 参照先ファイルパス（相対パス） */
  path: string;
  /** 参照開始位置（行内の文字位置） */
  startChar: number;
  /** 参照終了位置（行内の文字位置） */
  endChar: number;
};

/**
 * 行内の指定位置でファイル参照を検出
 * カーソル位置がファイル参照内にある場合のみ検出結果を返す
 *
 * @param line 検索対象の行
 * @param character カーソル位置（0-indexed）
 * @returns ファイル参照が見つかった場合は検出結果、なければnull
 */
export function detectFileReference(
  line: string,
  character: number,
): FileReferenceResult | null {
  // グローバルフラグで全マッチを検索
  const globalPattern = new RegExp(FILE_REF_PATTERN.source, "g");
  let match: RegExpExecArray | null;

  while ((match = globalPattern.exec(line)) !== null) {
    const startChar = match.index;
    const endChar = match.index + match[0].length;

    // カーソル位置がマッチ範囲内かチェック
    if (character >= startChar && character < endChar) {
      return {
        path: match[1],
        startChar,
        endChar,
      };
    }
  }

  return null;
}

/**
 * ファイル参照の相対パスを絶対パスに解決
 *
 * @param refPath 参照パス（相対または絶対）
 * @param currentFileUri 現在のファイルのURI（file://プロトコル）
 * @returns 解決された絶対パス（file://プロトコルなし）
 */
export function resolveFileRefPath(
  refPath: string,
  currentFileUri: string,
): string {
  // 絶対パスはそのまま返す
  if (refPath.startsWith("/")) {
    return refPath;
  }

  // file://プロトコルを除去してファイルパスを取得
  const currentPath = currentFileUri.replace("file://", "");

  // ディレクトリパスを取得（最後のスラッシュまで）
  const lastSlash = currentPath.lastIndexOf("/");
  const currentDir = currentPath.substring(0, lastSlash);

  // パスを結合（./や../を処理）
  return resolvePath(currentDir, refPath);
}

/**
 * パスを結合・正規化
 * ./や../を適切に処理
 */
function resolvePath(basePath: string, relativePath: string): string {
  // ./を除去
  let path = relativePath;
  if (path.startsWith("./")) {
    path = path.substring(2);
  }

  // パスを分割
  const baseParts = basePath.split("/").filter((p) => p);
  const relativeParts = path.split("/").filter((p) => p);

  // ../を処理
  for (const part of relativeParts) {
    if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }

  return "/" + baseParts.join("/");
}

/**
 * Position型（LSP互換）
 */
export type Position = {
  /** 行番号（0-indexed） */
  line: number;
  /** 文字位置（0-indexed） */
  character: number;
};

/**
 * 指定位置の行を取得
 * hover_provider.tsとdefinition_provider.tsの共通処理を抽出
 *
 * @param content ドキュメント内容
 * @param position カーソル位置
 * @returns 指定行の文字列、範囲外の場合はnull
 */
export function getLineAtPosition(
  content: string,
  position: Position,
): string | null {
  const lines = content.split("\n");
  if (position.line >= lines.length) {
    debugLog(`getLineAtPosition: line ${position.line} out of range (${lines.length} lines)`);
    return null;
  }
  return lines[position.line];
}

/**
 * ファイル参照をカーソル位置から検出し、パスを解決する
 * hover_provider.tsとdefinition_provider.tsの共通処理を統合
 *
 * @param uri ドキュメントURI
 * @param content ドキュメント内容
 * @param position カーソル位置
 * @returns 検出結果（参照情報と解決済みパス）、見つからない場合はnull
 */
export function detectAndResolveFileRef(
  uri: string,
  content: string,
  position: Position,
): { fileRef: FileReferenceResult; resolvedPath: string } | null {
  // storyteller専用ディレクトリチェック
  if (!isStorytellerFile(uri)) {
    debugLog(`detectAndResolveFileRef: not a storyteller file: ${uri}`);
    return null;
  }

  // 行を取得
  const line = getLineAtPosition(content, position);
  if (line === null) {
    return null;
  }

  // ファイル参照を検出
  const fileRef = detectFileReference(line, position.character);
  if (!fileRef) {
    debugLog(`detectAndResolveFileRef: no file reference at position ${position.character}`);
    return null;
  }

  // パスを解決
  const resolvedPath = resolveFileRefPath(fileRef.path, uri);
  debugLog(`detectAndResolveFileRef: resolved ${fileRef.path} -> ${resolvedPath}`);

  return { fileRef, resolvedPath };
}
