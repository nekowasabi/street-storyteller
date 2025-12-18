/**
 * EntityValidator - エンティティIDの存在確認バリデーター
 * 原稿ファイルのFrontmatterに記載されるエンティティIDが
 * 実際にプロジェクト内に存在するかを検証する
 */
import { ProjectAnalyzer } from "../view/project_analyzer.ts";
import type {
  CharacterSummary,
  ForeshadowingSummary,
  SettingSummary,
  TimelineSummary,
} from "../view/project_analyzer.ts";

/**
 * バリデーション対象のエンティティタイプ
 */
export type ValidatableEntityType =
  | "characters"
  | "settings"
  | "foreshadowings"
  | "timelines"
  | "timeline_events"
  | "phases";

/**
 * バリデーション結果
 */
export interface ValidationResult {
  /** すべてのIDが有効な場合true */
  valid: boolean;
  /** 有効なIDリスト */
  validIds: string[];
  /** 無効なIDリスト（存在しないID） */
  invalidIds: string[];
}

/**
 * エンティティIDの存在確認バリデーター
 */
export class EntityValidator {
  private readonly projectPath: string;
  private readonly projectAnalyzer: ProjectAnalyzer;

  // キャッシュ
  private charactersCache: CharacterSummary[] | null = null;
  private settingsCache: SettingSummary[] | null = null;
  private foreshadowingsCache: ForeshadowingSummary[] | null = null;
  private timelinesCache: TimelineSummary[] | null = null;

  /**
   * @param projectPath プロジェクトのルートパス
   */
  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.projectAnalyzer = new ProjectAnalyzer();
  }

  /**
   * エンティティIDリストを検証する
   * @param entityType エンティティタイプ
   * @param ids 検証するIDリスト
   * @returns バリデーション結果
   */
  async validateIds(
    entityType: ValidatableEntityType,
    ids: string[],
  ): Promise<ValidationResult> {
    // 空リストは有効
    if (ids.length === 0) {
      return {
        valid: true,
        validIds: [],
        invalidIds: [],
      };
    }

    // エンティティタイプごとに検証
    switch (entityType) {
      case "characters":
        return await this.validateCharacterIds(ids);
      case "settings":
        return await this.validateSettingIds(ids);
      case "foreshadowings":
        return await this.validateForeshadowingIds(ids);
      case "timelines":
        return await this.validateTimelineIds(ids);
      case "timeline_events":
        return await this.validateTimelineEventIds(ids);
      case "phases":
        return await this.validatePhaseIds(ids);
    }
  }

  /**
   * キャラクターIDを検証
   */
  private async validateCharacterIds(ids: string[]): Promise<ValidationResult> {
    const existingIds = await this.getExistingCharacterIds();
    return this.validateAgainstExisting(ids, existingIds);
  }

  /**
   * 設定IDを検証
   */
  private async validateSettingIds(ids: string[]): Promise<ValidationResult> {
    const existingIds = await this.getExistingSettingIds();
    return this.validateAgainstExisting(ids, existingIds);
  }

  /**
   * 伏線IDを検証
   */
  private async validateForeshadowingIds(
    ids: string[],
  ): Promise<ValidationResult> {
    const existingIds = await this.getExistingForeshadowingIds();
    return this.validateAgainstExisting(ids, existingIds);
  }

  /**
   * タイムラインIDを検証
   */
  private async validateTimelineIds(ids: string[]): Promise<ValidationResult> {
    const existingIds = await this.getExistingTimelineIds();
    return this.validateAgainstExisting(ids, existingIds);
  }

  /**
   * タイムラインイベントIDを検証
   */
  private async validateTimelineEventIds(
    ids: string[],
  ): Promise<ValidationResult> {
    const existingIds = await this.getExistingTimelineEventIds();
    return this.validateAgainstExisting(ids, existingIds);
  }

  /**
   * フェーズIDを検証
   */
  private async validatePhaseIds(ids: string[]): Promise<ValidationResult> {
    const existingIds = await this.getExistingPhaseIds();
    return this.validateAgainstExisting(ids, existingIds);
  }

  /**
   * IDリストを既存IDセットと比較して検証
   */
  private validateAgainstExisting(
    ids: string[],
    existingIds: Set<string>,
  ): ValidationResult {
    const validIds: string[] = [];
    const invalidIds: string[] = [];

    for (const id of ids) {
      if (existingIds.has(id)) {
        validIds.push(id);
      } else {
        invalidIds.push(id);
      }
    }

    return {
      valid: invalidIds.length === 0,
      validIds,
      invalidIds,
    };
  }

  /**
   * 既存のキャラクターIDを取得
   */
  private async getExistingCharacterIds(): Promise<Set<string>> {
    if (!this.charactersCache) {
      this.charactersCache = await this.loadCharacters();
    }
    return new Set(this.charactersCache.map((c) => c.id));
  }

  /**
   * 既存の設定IDを取得
   */
  private async getExistingSettingIds(): Promise<Set<string>> {
    if (!this.settingsCache) {
      this.settingsCache = await this.loadSettings();
    }
    return new Set(this.settingsCache.map((s) => s.id));
  }

  /**
   * 既存の伏線IDを取得
   */
  private async getExistingForeshadowingIds(): Promise<Set<string>> {
    if (!this.foreshadowingsCache) {
      this.foreshadowingsCache = await this.loadForeshadowings();
    }
    return new Set(this.foreshadowingsCache.map((f) => f.id));
  }

  /**
   * 既存のタイムラインIDを取得
   */
  private async getExistingTimelineIds(): Promise<Set<string>> {
    if (!this.timelinesCache) {
      this.timelinesCache = await this.loadTimelines();
    }
    return new Set(this.timelinesCache.map((t) => t.id));
  }

  /**
   * 既存のタイムラインイベントIDを取得
   */
  private async getExistingTimelineEventIds(): Promise<Set<string>> {
    if (!this.timelinesCache) {
      this.timelinesCache = await this.loadTimelines();
    }
    const eventIds = new Set<string>();
    for (const timeline of this.timelinesCache) {
      for (const event of timeline.events) {
        eventIds.add(event.id);
      }
    }
    return eventIds;
  }

  /**
   * 既存のフェーズIDを取得
   */
  private async getExistingPhaseIds(): Promise<Set<string>> {
    if (!this.charactersCache) {
      this.charactersCache = await this.loadCharacters();
    }
    const phaseIds = new Set<string>();
    for (const character of this.charactersCache) {
      if (character.phases) {
        for (const phase of character.phases) {
          phaseIds.add(phase.id);
        }
      }
    }
    return phaseIds;
  }

  /**
   * キャラクターをロード
   * ProjectAnalyzerを使用してキャラクター情報を取得
   */
  private async loadCharacters(): Promise<CharacterSummary[]> {
    const result = await this.projectAnalyzer.analyzeProject(this.projectPath);
    if (!result.ok) {
      return [];
    }
    return [...result.value.characters];
  }

  /**
   * 設定をロード
   */
  private async loadSettings(): Promise<SettingSummary[]> {
    const result = await this.projectAnalyzer.analyzeProject(this.projectPath);
    if (!result.ok) {
      return [];
    }
    return [...result.value.settings];
  }

  /**
   * 伏線をロード
   */
  private async loadForeshadowings(): Promise<ForeshadowingSummary[]> {
    const result = await this.projectAnalyzer.analyzeProject(this.projectPath);
    if (!result.ok) {
      return [];
    }
    return [...result.value.foreshadowings];
  }

  /**
   * タイムラインをロード
   */
  private async loadTimelines(): Promise<TimelineSummary[]> {
    const result = await this.projectAnalyzer.analyzeProject(this.projectPath);
    if (!result.ok) {
      return [];
    }
    return [...result.value.timelines];
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.charactersCache = null;
    this.settingsCache = null;
    this.foreshadowingsCache = null;
    this.timelinesCache = null;
  }
}
