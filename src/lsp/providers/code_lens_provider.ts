/**
 * Code Lensプロバイダー
 * ファイル参照（{ file: "./path.md" }）にCode Lensを表示
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_codeLens
 */

import {
  debugLog,
  FILE_REF_PATTERN,
  isStorytellerFile,
  resolveFileRefPath,
} from "@storyteller/lsp/providers/file_ref_utils.ts";

/**
 * Code Lens型
 */
export type CodeLens = {
  /** Code Lensの表示位置 */
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  /** クリック時のコマンド */
  command?: {
    /** コマンドのタイトル（UI表示用） */
    title: string;
    /** コマンドID */
    command: string;
    /** コマンドに渡す引数 */
    arguments?: unknown[];
  };
  /** カスタムデータ */
  data?: unknown;
};

/**
 * Code Lensリクエストのパラメータ
 */
export type CodeLensParams = {
  textDocument: {
    uri: string;
  };
};

/**
 * Code Lensプロバイダークラス
 * ファイル参照を検出し、Code Lensを生成
 */
export class CodeLensProvider {
  /**
   * ドキュメント内のCode Lensを生成
   * @param uri ドキュメントURI
   * @param content ドキュメント内容
   * @returns Code Lens配列
   */
  provideCodeLenses(uri: string, content: string): CodeLens[] {
    debugLog(`provideCodeLenses: uri=${uri}`);

    // storyteller専用ディレクトリ外では処理しない
    if (!isStorytellerFile(uri)) {
      debugLog(`provideCodeLenses: skipping non-storyteller file`);
      return [];
    }

    const codeLenses: CodeLens[] = [];
    const lines = content.split("\n");

    // 各行をスキャンしてファイル参照を検出
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const globalPattern = new RegExp(FILE_REF_PATTERN.source, "g");
      let match: RegExpExecArray | null;

      while ((match = globalPattern.exec(line)) !== null) {
        const filePath = match[1];
        const startChar = match.index;
        const endChar = match.index + match[0].length;

        // ファイルパスを解決
        const resolvedPath = resolveFileRefPath(filePath, uri);
        const fileUri = `file://${resolvedPath}`;

        // Code Lensを生成
        codeLenses.push({
          range: {
            start: { line: lineIndex, character: startChar },
            end: { line: lineIndex, character: endChar },
          },
          command: {
            title: `Open ${filePath}`,
            command: "storyteller.openReferencedFile",
            arguments: [fileUri],
          },
        });
      }
    }

    debugLog(`provideCodeLenses: found ${codeLenses.length} file references`);
    return codeLenses;
  }

  /**
   * Code Lensを解決（追加情報を取得）
   * 必要に応じてCode Lensにコマンド情報を追加
   * @param codeLens 解決対象のCode Lens
   * @returns 解決されたCode Lens
   */
  resolveCodeLens(codeLens: CodeLens): CodeLens {
    // 現時点ではprovideCodeLensesで全情報を生成しているため、
    // 追加の解決は不要
    return codeLens;
  }
}
