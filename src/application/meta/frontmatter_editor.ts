/**
 * FrontmatterEditor - Markdown FrontmatterのStoryTellerセクションを編集
 * 原稿ファイルのFrontmatterにエンティティIDを追加・削除・置換する
 */
import { parse as parseYaml, stringify as stringifyYaml } from "@std/yaml";
import { err, ok, type Result } from "../../shared/result.ts";

/**
 * 紐付け可能なエンティティタイプ
 */
export type BindableEntityType =
  | "characters"
  | "settings"
  | "foreshadowings"
  | "timeline_events"
  | "phases"
  | "timelines";

/**
 * 編集結果
 */
export interface EditResult {
  /** 編集後のファイル内容 */
  content: string;
  /** 変更されたフィールド */
  changedFields: BindableEntityType[];
  /** 追加されたID */
  addedIds: string[];
  /** 削除されたID */
  removedIds: string[];
}

/**
 * 編集エラー
 */
export type EditError =
  | { type: "no_frontmatter"; message: string }
  | { type: "yaml_parse_error"; message: string; cause?: unknown }
  | { type: "missing_storyteller_key"; message: string };

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
  [key: string]: unknown;
}

/**
 * Markdown FrontmatterのStoryTellerセクションを編集するクラス
 */
export class FrontmatterEditor {
  private static readonly FRONTMATTER_DELIMITER = "---";

  /**
   * エンティティIDを追加する（重複は無視）
   * @param content Markdownコンテンツ
   * @param entityType エンティティタイプ
   * @param ids 追加するIDリスト
   * @returns 編集結果
   */
  addEntities(
    content: string,
    entityType: BindableEntityType,
    ids: string[],
  ): Result<EditResult, EditError> {
    return this.editEntities(content, entityType, ids, "add");
  }

  /**
   * エンティティIDを削除する（存在しないIDは無視）
   * @param content Markdownコンテンツ
   * @param entityType エンティティタイプ
   * @param ids 削除するIDリスト
   * @returns 編集結果
   */
  removeEntities(
    content: string,
    entityType: BindableEntityType,
    ids: string[],
  ): Result<EditResult, EditError> {
    return this.editEntities(content, entityType, ids, "remove");
  }

  /**
   * エンティティIDリストを完全置換する
   * @param content Markdownコンテンツ
   * @param entityType エンティティタイプ
   * @param ids 新しいIDリスト
   * @returns 編集結果
   */
  setEntities(
    content: string,
    entityType: BindableEntityType,
    ids: string[],
  ): Result<EditResult, EditError> {
    return this.editEntities(content, entityType, ids, "set");
  }

  /**
   * エンティティ編集の共通処理
   */
  private editEntities(
    content: string,
    entityType: BindableEntityType,
    ids: string[],
    action: "add" | "remove" | "set",
  ): Result<EditResult, EditError> {
    // Step 1: Frontmatterを抽出
    const extractResult = this.extractFrontmatter(content);
    if (!extractResult.ok) {
      return extractResult;
    }

    const { frontmatterYaml, body } = extractResult.value;

    // Step 2: YAMLをパース
    const parseResult = this.parseYaml(frontmatterYaml);
    if (!parseResult.ok) {
      return parseResult;
    }

    const yaml = parseResult.value;

    // Step 3: storytellerキーを検証
    if (!yaml.storyteller) {
      return err({
        type: "missing_storyteller_key",
        message:
          "storytellerキーが見つかりません。Frontmatterには storyteller: セクションが必要です。",
      });
    }

    // Step 4: エンティティリストを編集
    const editResult = this.modifyEntityList(
      yaml.storyteller,
      entityType,
      ids,
      action,
    );

    // Step 5: YAMLを再構築
    const newYaml = stringifyYaml(yaml, {
      indent: 2,
      lineWidth: -1, // 行の折り返しを無効化
    });

    // Step 6: 本文と結合
    const newContent = `---\n${newYaml}---${body}`;

    return ok({
      content: newContent,
      changedFields: editResult.changed ? [entityType] : [],
      addedIds: editResult.addedIds,
      removedIds: editResult.removedIds,
    });
  }

  /**
   * エンティティリストを変更
   */
  private modifyEntityList(
    storyteller: NonNullable<StorytellerYaml["storyteller"]>,
    entityType: BindableEntityType,
    ids: string[],
    action: "add" | "remove" | "set",
  ): { changed: boolean; addedIds: string[]; removedIds: string[] } {
    // 現在のリストを取得（undefined の場合は空配列）
    const currentList: string[] = (storyteller[entityType] as string[]) ?? [];
    const currentSet = new Set(currentList);

    let addedIds: string[] = [];
    let removedIds: string[] = [];
    let newList: string[];

    switch (action) {
      case "add": {
        // 既存にないIDのみ追加
        addedIds = ids.filter((id) => !currentSet.has(id));
        newList = [...currentList, ...addedIds];
        break;
      }
      case "remove": {
        // 既存にあるIDのみ削除
        const removeSet = new Set(ids);
        removedIds = currentList.filter((id) => removeSet.has(id));
        newList = currentList.filter((id) => !removeSet.has(id));
        break;
      }
      case "set": {
        // 完全置換
        const newSet = new Set(ids);
        addedIds = ids.filter((id) => !currentSet.has(id));
        removedIds = currentList.filter((id) => !newSet.has(id));
        newList = [...ids];
        break;
      }
    }

    // 変更があったかどうか
    const changed = addedIds.length > 0 || removedIds.length > 0;

    // リストを更新
    if (newList.length > 0) {
      storyteller[entityType] = newList;
    } else {
      // 空配列の場合は空配列を設定（フィールド削除ではなく）
      storyteller[entityType] = [];
    }

    return { changed, addedIds, removedIds };
  }

  /**
   * Markdownコンテンツからフロントマター部分を抽出
   */
  private extractFrontmatter(
    content: string,
  ): Result<{ frontmatterYaml: string; body: string }, EditError> {
    const lines = content.split("\n");

    // 最初の行が --- で始まるか確認
    if (lines[0]?.trim() !== FrontmatterEditor.FRONTMATTER_DELIMITER) {
      return err({
        type: "no_frontmatter",
        message:
          "Frontmatterが見つかりません。ファイルは --- で始まる必要があります。",
      });
    }

    // 2番目の --- を探す
    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i]?.trim() === FrontmatterEditor.FRONTMATTER_DELIMITER) {
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
    const frontmatterYaml = frontmatterLines.join("\n");

    // 本文部分を抽出（--- の後の改行を含む）
    const bodyLines = lines.slice(endIndex + 1);
    const body = "\n" + bodyLines.join("\n");

    return ok({ frontmatterYaml, body });
  }

  /**
   * YAML文字列をパース
   */
  private parseYaml(
    yamlContent: string,
  ): Result<StorytellerYaml, EditError> {
    try {
      const parsed = parseYaml(yamlContent) as StorytellerYaml;
      return ok(parsed ?? {});
    } catch (cause) {
      return err({
        type: "yaml_parse_error",
        message: "YAMLの解析に失敗しました。",
        cause,
      });
    }
  }
}
