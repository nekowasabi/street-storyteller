/**
 * FrontmatterSyncService - 原稿FrontMatter自動同期サービス
 *
 * 原稿ファイル内のエンティティ参照を検出し、FrontMatterに自動追加/同期する。
 */
import { isAbsolute, join } from "@std/path";
import { err, ok, type Result } from "@storyteller/shared/result.ts";
import {
  type BindableEntityType,
  FrontmatterEditor,
} from "@storyteller/application/meta/frontmatter_editor.ts";
import { EntityValidator } from "@storyteller/application/meta/entity_validator.ts";
import {
  type DetectableEntity,
  PositionedDetector,
  type PositionedMatch,
} from "@storyteller/lsp/detection/positioned_detector.ts";

/**
 * FrontMatter同期オプション
 */
export interface SyncOptions {
  /** 同期モード: add=追加のみ, sync=検出結果で置換 */
  readonly mode: "add" | "sync";
  /** 対象エンティティタイプ */
  readonly entityTypes: readonly BindableEntityType[];
  /** 自動追加する信頼度閾値 (0.0-1.0) */
  readonly confidenceThreshold: number;
  /** プレビューモード（ファイル更新なし） */
  readonly dryRun: boolean;
}

/**
 * デフォルト同期オプション
 */
export const DEFAULT_SYNC_OPTIONS: Readonly<SyncOptions> = {
  mode: "add",
  entityTypes: [
    "characters",
    "settings",
    "foreshadowings",
    "timelines",
    "timeline_events",
    "phases",
  ],
  confidenceThreshold: 0.85,
  dryRun: false,
};

/**
 * エンティティタイプ別の変更情報
 */
export interface EntityChange {
  /** 変更されたエンティティタイプ */
  readonly type: BindableEntityType;
  /** 変更されたID一覧 */
  readonly ids: readonly string[];
}

/**
 * FrontMatter同期結果
 */
export interface SyncResult {
  /** 原稿ファイルパス */
  readonly path: string;
  /** 変更があったかどうか */
  readonly changed: boolean;
  /** 追加されたエンティティ */
  readonly added: readonly EntityChange[];
  /** 削除されたエンティティ（syncモード時のみ） */
  readonly removed: readonly EntityChange[];
  /** 変更なしのエンティティ */
  readonly unchanged: readonly EntityChange[];
  /** 処理にかかった時間（ミリ秒） */
  readonly durationMs: number;
}

/**
 * 同期エラー型
 */
export type SyncError =
  | { type: "file_not_found"; message: string; path: string }
  | { type: "read_error"; message: string; cause?: unknown }
  | { type: "write_error"; message: string; cause?: unknown }
  | { type: "frontmatter_error"; message: string; cause?: unknown }
  | { type: "detection_error"; message: string; cause?: unknown };

/**
 * FrontMatter同期サービス
 *
 * 原稿ファイル内のエンティティ参照を検出し、FrontMatterに自動追加/同期する。
 *
 * 依存関係:
 * - PositionedDetector: エンティティ参照の検出
 * - FrontmatterEditor: FrontMatterの編集
 * - EntityValidator: エンティティIDの存在確認
 */
export class FrontmatterSyncService {
  private readonly projectRoot: string;
  private readonly detector: PositionedDetector;
  private readonly editor: FrontmatterEditor;
  private readonly validator: EntityValidator;

  constructor(
    projectRoot: string,
    entities: DetectableEntity[],
    options?: {
      detector?: PositionedDetector;
      editor?: FrontmatterEditor;
      validator?: EntityValidator;
    },
  ) {
    this.projectRoot = projectRoot;
    this.detector = options?.detector ?? new PositionedDetector(entities);
    this.editor = options?.editor ?? new FrontmatterEditor();
    this.validator = options?.validator ?? new EntityValidator(projectRoot);
  }

  /**
   * FrontMatterを同期する（メインAPI）
   */
  async sync(
    path: string,
    options: Partial<SyncOptions> = {},
  ): Promise<Result<SyncResult, SyncError>> {
    const startTime = Date.now();
    const opts = { ...DEFAULT_SYNC_OPTIONS, ...options };

    // 1. ファイル読み込み
    const absolutePath = isAbsolute(path) ? path : join(this.projectRoot, path);
    let content: string;
    try {
      content = await Deno.readTextFile(absolutePath);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return err({
          type: "file_not_found",
          message: `File not found: ${path}`,
          path,
        });
      }
      return err({
        type: "read_error",
        message: "File read error",
        cause: error,
      });
    }

    // 2. エンティティ検出
    const matches = this.detector.detectWithPositions(content);

    // 3. 信頼度閾値でフィルタリング
    const filteredMatches = matches.filter(
      (m) => m.confidence >= opts.confidenceThreshold,
    );

    // 4. エンティティタイプ別にグループ化
    const byType = this.groupMatchesByType(
      filteredMatches,
      opts.entityTypes as BindableEntityType[],
    );

    // 5. FrontMatter編集
    let newContent = content;
    const added: EntityChange[] = [];
    const removed: EntityChange[] = [];
    const unchanged: EntityChange[] = [];

    for (const entityType of opts.entityTypes) {
      const ids = byType.get(entityType) ?? [];

      if (opts.mode === "add") {
        if (ids.length === 0) {
          unchanged.push({ type: entityType, ids: [] });
          continue;
        }

        const result = this.editor.addEntities(newContent, entityType, [
          ...ids,
        ]);
        if (!result.ok) {
          // FrontMatterがない場合はスキップ（エラーにしない）
          continue;
        }

        newContent = result.value.content;
        if (result.value.addedIds.length > 0) {
          added.push({ type: entityType, ids: result.value.addedIds });
        }
        if (ids.length > result.value.addedIds.length) {
          const existingIds = ids.filter(
            (id) => !result.value.addedIds.includes(id),
          );
          unchanged.push({ type: entityType, ids: existingIds });
        }
      } else {
        // syncモード: Process 4で実装
        const result = this.editor.setEntities(newContent, entityType, [
          ...ids,
        ]);
        if (!result.ok) continue;

        newContent = result.value.content;
        if (result.value.addedIds.length > 0) {
          added.push({ type: entityType, ids: result.value.addedIds });
        }
        if (result.value.removedIds.length > 0) {
          removed.push({ type: entityType, ids: result.value.removedIds });
        }
      }
    }

    // 6. ファイル書き込み（dryRunでない場合）
    if (!opts.dryRun && newContent !== content) {
      try {
        await Deno.writeTextFile(absolutePath, newContent);
      } catch (error) {
        return err({
          type: "write_error",
          message: "File write error",
          cause: error,
        });
      }
    }

    return ok({
      path,
      changed: added.length > 0 || removed.length > 0,
      added,
      removed,
      unchanged,
      durationMs: Date.now() - startTime,
    });
  }

  /**
   * 変更内容をプレビューする（ファイル更新なし）
   */
  async preview(
    path: string,
    options: Partial<SyncOptions> = {},
  ): Promise<Result<SyncResult, SyncError>> {
    return this.sync(path, { ...options, dryRun: true });
  }

  /**
   * 検出結果をエンティティタイプ別にグループ化
   */
  private groupMatchesByType(
    matches: PositionedMatch[],
    targetTypes: BindableEntityType[],
  ): Map<BindableEntityType, string[]> {
    const result = new Map<BindableEntityType, string[]>();

    for (const match of matches) {
      const entityType = this.kindToEntityType(match.kind);
      if (!entityType || !targetTypes.includes(entityType)) continue;

      const ids = result.get(entityType) ?? [];
      if (!ids.includes(match.id)) {
        ids.push(match.id);
      }
      result.set(entityType, ids);
    }

    return result;
  }

  /**
   * DetectableEntity.kind を BindableEntityType に変換
   */
  private kindToEntityType(
    kind: "character" | "setting" | "foreshadowing",
  ): BindableEntityType | null {
    switch (kind) {
      case "character":
        return "characters";
      case "setting":
        return "settings";
      case "foreshadowing":
        return "foreshadowings";
      default:
        return null;
    }
  }
}
