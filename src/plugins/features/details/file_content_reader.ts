/**
 * ファイル内容読み込みクラス
 *
 * ハイブリッドフィールド（インライン文字列またはファイル参照）を解決し、
 * ファイル参照の場合は内容を読み込んでフロントマターを除去する
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type { Result } from "@storyteller/shared/result.ts";
import { join } from "@std/path";

/**
 * ファイル読み込みエラー
 */
export type FileContentError = {
  /** エラーの種類 */
  type: "file_not_found" | "read_error";
  /** ファイルパス */
  filePath: string;
  /** エラーメッセージ */
  message: string;
};

/**
 * ハイブリッドフィールドの型（インライン文字列またはファイル参照）
 */
export type HybridFieldValue = string | { file: string } | undefined;

/**
 * ファイル内容読み込みクラス
 */
export class FileContentReader {
  /**
   * @param projectRoot プロジェクトルートパス
   */
  constructor(private readonly projectRoot: string) {}

  /**
   * ハイブリッドフィールドを解決する
   *
   * @param value インライン文字列、ファイル参照、またはundefined
   * @returns 解決された文字列、またはundefined
   */
  async resolveHybridField(
    value: HybridFieldValue,
  ): Promise<Result<string | undefined, FileContentError>> {
    // undefinedの場合
    if (value === undefined) {
      return ok(undefined);
    }

    // インライン文字列の場合
    if (typeof value === "string") {
      return ok(value);
    }

    // ファイル参照の場合
    return await this.readFileContent(value.file);
  }

  /**
   * ファイル内容を読み込む
   *
   * @param relativePath プロジェクトルートからの相対パス
   * @returns ファイル内容（フロントマター除去済み）
   */
  async readFileContent(
    relativePath: string,
  ): Promise<Result<string, FileContentError>> {
    const absolutePath = join(this.projectRoot, relativePath);

    try {
      const content = await Deno.readTextFile(absolutePath);
      const strippedContent = this.stripFrontmatter(content);
      return ok(strippedContent);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return err({
          type: "file_not_found",
          filePath: relativePath,
          message: `File not found: ${relativePath}`,
        });
      }

      return err({
        type: "read_error",
        filePath: relativePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * フロントマターを除去する
   *
   * @param content ファイル内容
   * @returns フロントマター除去後の本文
   */
  private stripFrontmatter(content: string): string {
    // フロントマターのパターン: ---で始まり---で終わる（空のフロントマターも対応）
    const frontmatterRegex = /^---\r?\n[\s\S]*?---\r?\n?/;

    if (frontmatterRegex.test(content)) {
      const strippedContent = content.replace(frontmatterRegex, "");
      return strippedContent.trim();
    }

    return content;
  }
}
