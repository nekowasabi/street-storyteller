/**
 * FrontmatterParser - Markdown FrontmatterからStoryTellerメタデータを解析
 * TDD Step 2: Green - テストを通過させる最小限の実装
 */
import { parse as parseYaml } from "@std/yaml";
import { err, ok, type Result } from "@storyteller/shared/result.ts";

/**
 * Frontmatterから抽出されるデータの型定義
 */
export interface FrontmatterData {
  /** 章の一意識別子 */
  chapter_id: string;
  /** 章のタイトル */
  title: string;
  /** 章の順序 */
  order: number;
  /** 登場キャラクターID一覧（オプション） */
  characters?: string[];
  /** 使用設定ID一覧（オプション） */
  settings?: string[];
  /** 伏線ID一覧（オプション） */
  foreshadowings?: string[];
  /** タイムラインイベントID一覧（オプション） */
  timeline_events?: string[];
  /** キャラクターフェーズID一覧（オプション） */
  phases?: string[];
  /** タイムラインID一覧（オプション） */
  timelines?: string[];
  /** 章の概要（オプション） */
  summary?: string;
}

/**
 * パースエラーの型定義
 */
export type ParseError =
  | { type: "no_frontmatter"; message: string }
  | { type: "yaml_parse_error"; message: string; cause?: unknown }
  | { type: "missing_storyteller_key"; message: string }
  | { type: "missing_required_field"; message: string; field: string };

/**
 * StoryTeller形式のFrontmatterを持つYAMLの型
 */
interface StorytellerYaml {
  storyteller?: {
    chapter_id?: string;
    title?: string;
    order?: number;
    characters?: string[];
    settings?: string[];
    foreshadowings?: string[];
    timeline_events?: string[];
    phases?: string[];
    timelines?: string[];
    summary?: string;
  };
}

/**
 * Markdown FrontmatterからStoryTellerメタデータを解析するクラス
 */
export class FrontmatterParser {
  /**
   * Frontmatterの開始・終了を示すデリミタ
   */
  private static readonly FRONTMATTER_DELIMITER = "---";

  /**
   * MarkdownコンテンツからFrontmatterを解析する
   * @param markdownContent Markdownファイルの内容
   * @returns 解析結果（成功時はFrontmatterData、失敗時はParseError）
   */
  parse(markdownContent: string): Result<FrontmatterData, ParseError> {
    // Step 1: Frontmatterを抽出
    const frontmatterResult = this.extractFrontmatter(markdownContent);
    if (!frontmatterResult.ok) {
      return frontmatterResult;
    }

    // Step 2: YAMLをパース
    const yamlResult = this.parseYaml(frontmatterResult.value);
    if (!yamlResult.ok) {
      return yamlResult;
    }

    // Step 3: storytellerキーを検証
    const storytellerResult = this.extractStorytellerData(yamlResult.value);
    if (!storytellerResult.ok) {
      return storytellerResult;
    }

    // Step 4: 必須フィールドを検証
    const validationResult = this.validateRequiredFields(
      storytellerResult.value,
    );
    if (!validationResult.ok) {
      return validationResult;
    }

    return ok(validationResult.value);
  }

  /**
   * Markdownコンテンツからフロントマター部分を抽出
   */
  private extractFrontmatter(
    content: string,
  ): Result<string, ParseError> {
    const lines = content.split("\n");

    // 最初の行が --- で始まるか確認
    if (lines[0]?.trim() !== FrontmatterParser.FRONTMATTER_DELIMITER) {
      return err({
        type: "no_frontmatter",
        message:
          "Frontmatterが見つかりません。ファイルは --- で始まる必要があります。",
      });
    }

    // 2番目の --- を探す
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === FrontmatterParser.FRONTMATTER_DELIMITER) {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      return err({
        type: "no_frontmatter",
        message: "Frontmatterの終了デリミタ（---）が見つかりません。",
      });
    }

    // フロントマター部分を抽出
    const frontmatterLines = lines.slice(1, endIndex);
    return ok(frontmatterLines.join("\n"));
  }

  /**
   * YAML文字列をパース
   */
  private parseYaml(
    yamlContent: string,
  ): Result<StorytellerYaml, ParseError> {
    try {
      const parsed = parseYaml(yamlContent) as StorytellerYaml;
      return ok(parsed);
    } catch (cause) {
      return err({
        type: "yaml_parse_error",
        message: "YAMLの解析に失敗しました。",
        cause,
      });
    }
  }

  /**
   * storytellerキーのデータを抽出
   */
  private extractStorytellerData(
    yaml: StorytellerYaml,
  ): Result<NonNullable<StorytellerYaml["storyteller"]>, ParseError> {
    if (!yaml.storyteller) {
      return err({
        type: "missing_storyteller_key",
        message:
          "storytellerキーが見つかりません。Frontmatterには storyteller: セクションが必要です。",
      });
    }
    return ok(yaml.storyteller);
  }

  /**
   * 必須フィールドを検証してFrontmatterDataを返す
   */
  private validateRequiredFields(
    data: NonNullable<StorytellerYaml["storyteller"]>,
  ): Result<FrontmatterData, ParseError> {
    // chapter_id の検証
    if (!data.chapter_id) {
      return err({
        type: "missing_required_field",
        message: "必須フィールド chapter_id が見つかりません。",
        field: "chapter_id",
      });
    }

    // title の検証
    if (!data.title) {
      return err({
        type: "missing_required_field",
        message: "必須フィールド title が見つかりません。",
        field: "title",
      });
    }

    // order の検証
    if (data.order === undefined || data.order === null) {
      return err({
        type: "missing_required_field",
        message: "必須フィールド order が見つかりません。",
        field: "order",
      });
    }

    return ok({
      chapter_id: data.chapter_id,
      title: data.title,
      order: data.order,
      characters: data.characters,
      settings: data.settings,
      foreshadowings: data.foreshadowings,
      timeline_events: data.timeline_events,
      phases: data.phases,
      timelines: data.timelines,
      summary: data.summary,
    });
  }
}
