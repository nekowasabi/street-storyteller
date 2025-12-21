/**
 * プロジェクトコンテキスト管理
 * プロジェクトごとのエンティティと情報を遅延ロード・キャッシュする
 *
 * 複数のサブプロジェクト（samples/cinderella等）を同時に管理可能にし、
 * 各LSPリクエストで適切なプロジェクトのエンティティを使用できるようにする。
 */

import type { DetectableEntity } from "@storyteller/lsp/detection/positioned_detector.ts";
import type { EntityInfo } from "@storyteller/lsp/providers/hover_provider.ts";
import { loadEntities } from "@storyteller/cli/modules/lsp/start.ts";
import { join, toFileUrl } from "@std/path";

/**
 * プロジェクトコンテキスト
 * プロジェクト固有のエンティティと情報を保持
 */
export type ProjectContext = {
  /** プロジェクトルート */
  readonly projectRoot: string;
  /** 検出可能エンティティ */
  readonly entities: readonly DetectableEntity[];
  /** エンティティ詳細情報マップ */
  readonly entityInfoMap: Map<string, EntityInfo>;
};

/**
 * プロジェクトコンテキスト管理クラス
 */
export class ProjectContextManager {
  /** プロジェクトルート → コンテキストのキャッシュ */
  private readonly contexts = new Map<string, ProjectContext>();

  /** ロード中のプロミス（重複ロード防止） */
  private readonly loadingPromises = new Map<string, Promise<ProjectContext>>();

  /**
   * プロジェクトのコンテキストを取得（遅延ロード）
   * @param projectRoot プロジェクトルート
   * @returns プロジェクトコンテキスト
   */
  async getContext(projectRoot: string): Promise<ProjectContext> {
    // キャッシュチェック
    const cached = this.contexts.get(projectRoot);
    if (cached) {
      return cached;
    }

    // ロード中かチェック（重複ロード防止）
    const loading = this.loadingPromises.get(projectRoot);
    if (loading) {
      return await loading;
    }

    // 新規ロード
    const promise = this.loadContext(projectRoot);
    this.loadingPromises.set(projectRoot, promise);

    try {
      const context = await promise;
      this.contexts.set(projectRoot, context);
      return context;
    } finally {
      this.loadingPromises.delete(projectRoot);
    }
  }

  /**
   * プロジェクトのコンテキストをロード
   */
  private async loadContext(projectRoot: string): Promise<ProjectContext> {
    // エンティティをロード（既存のloadEntities関数を再利用）
    let entities: DetectableEntity[] = [];
    try {
      entities = await loadEntities(projectRoot);
    } catch {
      // プロジェクトが存在しない場合は空を返す
    }

    // エンティティ情報マップを構築
    const entityInfoMap = await this.buildEntityInfoMap(projectRoot, entities);

    return {
      projectRoot,
      entities,
      entityInfoMap,
    };
  }

  /**
   * エンティティ情報マップを構築
   */
  private async buildEntityInfoMap(
    projectRoot: string,
    entities: readonly DetectableEntity[],
  ): Promise<Map<string, EntityInfo>> {
    const map = new Map<string, EntityInfo>();

    for (const entity of entities) {
      try {
        // エンティティの定義ファイルをロード
        const absPath = join(projectRoot, entity.filePath);
        const mod = await import(toFileUrl(absPath).href);

        // エンティティオブジェクトを取得
        for (const [, value] of Object.entries(mod)) {
          if (value && typeof value === "object") {
            const record = value as Record<string, unknown>;
            if (record.id === entity.id) {
              // EntityInfoに変換
              const info = this.convertToEntityInfo(entity.kind, record);
              if (info) {
                map.set(entity.id, info);
              }
              break;
            }
          }
        }
      } catch {
        // エラーはスキップ（エンティティ情報なしで続行）
      }
    }

    return map;
  }

  /**
   * Record型からEntityInfoに変換
   */
  private convertToEntityInfo(
    kind: "character" | "setting" | "foreshadowing",
    record: Record<string, unknown>,
  ): EntityInfo | null {
    const id = record.id;
    const name = record.name;
    if (typeof id !== "string" || typeof name !== "string") {
      return null;
    }

    // 基本情報
    const info: Record<string, unknown> = {
      id,
      name,
      kind,
    };

    // character固有フィールド
    if (kind === "character") {
      if (typeof record.role === "string") {
        info.role = record.role;
      }
      if (typeof record.summary === "string") {
        info.summary = record.summary;
      }
      if (Array.isArray(record.traits)) {
        info.traits = record.traits.filter((t): t is string =>
          typeof t === "string"
        );
      }
      if (record.relationships && typeof record.relationships === "object") {
        info.relationships = record.relationships as Record<string, string>;
      }
    }

    // setting固有フィールド
    if (kind === "setting") {
      if (typeof record.summary === "string") {
        info.summary = record.summary;
      }
    }

    // foreshadowing固有フィールド
    if (kind === "foreshadowing") {
      if (typeof record.type === "string") {
        info.type = record.type;
      }
      if (typeof record.status === "string") {
        info.status = record.status;
      }
      if (typeof record.summary === "string") {
        info.summary = record.summary;
      }

      // planting情報
      if (record.planting && typeof record.planting === "object") {
        const planting = record.planting as Record<string, unknown>;
        if (typeof planting.chapter === "string") {
          info.plantingChapter = planting.chapter;
        }
        if (typeof planting.description === "string") {
          info.plantingDescription = planting.description;
        }
      }

      // resolutions配列
      if (Array.isArray(record.resolutions)) {
        info.resolutions = record.resolutions
          .filter((r): r is Record<string, unknown> =>
            r && typeof r === "object"
          )
          .map((r) => ({
            chapter: typeof r.chapter === "string" ? r.chapter : "",
            description: typeof r.description === "string" ? r.description : "",
            completeness: typeof r.completeness === "number"
              ? r.completeness
              : 0,
          }));
      }

      // relations
      if (record.relations && typeof record.relations === "object") {
        const relations = record.relations as Record<string, unknown>;
        if (Array.isArray(relations.characters)) {
          info.relatedCharacters = relations.characters.filter(
            (c): c is string => typeof c === "string",
          );
        }
        if (Array.isArray(relations.settings)) {
          info.relatedSettings = relations.settings.filter((s): s is string =>
            typeof s === "string"
          );
        }
      }
    }

    return info as EntityInfo;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.contexts.clear();
    this.loadingPromises.clear();
  }

  /**
   * キャッシュサイズを取得（テスト用）
   */
  getCacheSize(): number {
    return this.contexts.size;
  }
}
