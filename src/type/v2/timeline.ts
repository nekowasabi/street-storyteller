/**
 * Timeline型定義（v2）
 *
 * 物語の時系列を管理するための型定義
 * ハイブリッド詳細管理（インライン + ファイル参照）に対応
 */

/**
 * イベントのカテゴリ
 *
 * - `plot_point`: プロットの転換点
 * - `character_event`: キャラクター関連イベント
 * - `world_event`: 世界観に関するイベント
 * - `backstory`: 過去の出来事
 * - `foreshadow`: 伏線となるイベント
 * - `climax`: クライマックス
 * - `resolution`: 解決・結末
 */
export type EventCategory =
  | "plot_point"
  | "character_event"
  | "world_event"
  | "backstory"
  | "foreshadow"
  | "climax"
  | "resolution";

/**
 * イベントの重要度
 *
 * - `major`: 物語の主要イベント
 * - `minor`: 補助的なイベント
 * - `background`: 背景イベント
 */
export type EventImportance = "major" | "minor" | "background";

/**
 * タイムラインのスコープ
 *
 * - `story`: 物語全体のタイムライン
 * - `world`: 世界観のタイムライン
 * - `character`: キャラクター個別のタイムライン
 * - `arc`: ストーリーアーク単位のタイムライン
 */
export type TimelineScope = "story" | "world" | "character" | "arc";

/**
 * 時間点（TimePoint）
 *
 * イベントの発生時点を表現する
 */
export type TimePoint = {
  /** 順序（必須）：タイムライン内での相対的な順序 */
  order: number;
  /** ラベル（オプショナル）：表示用の時間表記 */
  label?: string;
  /** 日付（オプショナル）：物語内での日付表記 */
  date?: string;
  /** チャプター（オプショナル）：関連するチャプターID */
  chapter?: string;
};

/**
 * イベントの詳細情報（オプショナル）
 */
export type TimelineEventDetails = {
  /** 詳細説明 */
  description?: string | { file: string };
  /** イベントの影響 */
  impact?: string | { file: string };
  /** メモ */
  notes?: string | { file: string };
};

/**
 * イベントによるキャラクターフェーズ変化
 * このイベントをきっかけにキャラクターがフェーズ遷移する情報
 */
export type PhaseChangeInfo = {
  /** キャラクターID */
  characterId: string;
  /** 遷移先フェーズID */
  toPhaseId: string;
  /** 遷移元フェーズID（オプション） */
  fromPhaseId?: string;
  /** 説明（オプション） */
  description?: string;
};

/**
 * LSP用の検出ヒント（イベント用）
 */
export type TimelineEventDetectionHints = {
  /** よく使われるパターン */
  commonPatterns: string[];
  /** 除外すべきパターン */
  excludePatterns: string[];
  /** 検出の信頼度（0.0～1.0） */
  confidence: number;
};

/**
 * タイムラインイベント型
 *
 * 物語内で発生する個別のイベントを表現
 */
export type TimelineEvent = {
  // ========================================
  // 必須メタデータ
  // ========================================

  /** 一意なID（プログラム的な識別子） */
  id: string;

  /** イベントタイトル */
  title: string;

  /** イベントカテゴリ */
  category: EventCategory;

  /** 発生時点 */
  time: TimePoint;

  /** 短い概要（必須） */
  summary: string;

  /** 関連するキャラクターのIDリスト */
  characters: string[];

  /** 関連する設定（場所など）のIDリスト */
  settings: string[];

  /** 関連するチャプターのIDリスト */
  chapters: string[];

  // ========================================
  // オプショナル情報
  // ========================================

  /** このイベントの原因となったイベントのIDリスト */
  causedBy?: string[];

  /** このイベントが引き起こすイベントのIDリスト */
  causes?: string[];

  /** イベントの重要度 */
  importance?: EventImportance;

  /** イベント終了時点（期間があるイベントの場合） */
  endTime?: TimePoint;

  /** 表示名のバリエーション */
  displayNames?: string[];

  /** 詳細情報 */
  details?: TimelineEventDetails;

  /** LSP用の検出ヒント */
  detectionHints?: TimelineEventDetectionHints;

  /**
   * このイベントによるキャラクターフェーズ変化
   * イベントをフェーズ遷移のトリガーとしてリンクする
   */
  phaseChanges?: PhaseChangeInfo[];
};

/**
 * タイムラインの詳細情報（オプショナル）
 */
export type TimelineDetails = {
  /** 背景説明 */
  background?: string | { file: string };
  /** メモ */
  notes?: string | { file: string };
};

/**
 * LSP用の検出ヒント（タイムライン用）
 */
export type TimelineDetectionHints = {
  /** よく使われるパターン */
  commonPatterns: string[];
  /** 除外すべきパターン */
  excludePatterns: string[];
  /** 検出の信頼度（0.0～1.0） */
  confidence: number;
};

/**
 * タイムラインの表示オプション
 */
export type TimelineDisplayOptions = {
  /** 関連を表示するか */
  showRelations?: boolean;
  /** カラースキーム */
  colorScheme?: string;
  /** 折りたたみ状態 */
  collapsed?: boolean;
};

/**
 * タイムライン型
 *
 * 物語の時系列全体を管理するコンテナ
 */
export type Timeline = {
  // ========================================
  // 必須メタデータ
  // ========================================

  /** 一意なID（プログラム的な識別子） */
  id: string;

  /** タイムライン名 */
  name: string;

  /** タイムラインのスコープ */
  scope: TimelineScope;

  /** 短い概要（必須） */
  summary: string;

  /** イベントリスト */
  events: TimelineEvent[];

  // ========================================
  // オプショナル情報
  // ========================================

  /** 親タイムラインのID */
  parentTimeline?: string;

  /** 子タイムラインのIDリスト */
  childTimelines?: string[];

  /** 関連するキャラクターのID（character scopeの場合） */
  relatedCharacter?: string;

  /** 表示名のバリエーション */
  displayNames?: string[];

  /** 表示オプション */
  displayOptions?: TimelineDisplayOptions;

  /** 詳細情報 */
  details?: TimelineDetails;
};
