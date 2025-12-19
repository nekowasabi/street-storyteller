/**
 * Foreshadowing型定義（v2）
 *
 * 物語の伏線を管理するための型定義
 * ハイブリッド詳細管理（インライン + ファイル参照）に対応
 */

/**
 * 伏線のステータス
 *
 * - `planted`: 設置済み（未回収）
 * - `partially_resolved`: 部分的に回収
 * - `resolved`: 完全に回収済み
 * - `abandoned`: 放棄（回収しない）
 */
export type ForeshadowingStatus =
  | "planted"
  | "partially_resolved"
  | "resolved"
  | "abandoned";

/**
 * 伏線のタイプ
 *
 * - `hint`: 後の展開を示唆するヒント
 * - `prophecy`: 予言・予告
 * - `mystery`: 謎・疑問
 * - `symbol`: 象徴的な要素
 * - `chekhov`: チェーホフの銃（物理的伏線）
 * - `red_herring`: レッドヘリング（ミスリード）
 */
export type ForeshadowingType =
  | "hint"
  | "prophecy"
  | "mystery"
  | "symbol"
  | "chekhov"
  | "red_herring";

/**
 * 伏線の重要度
 *
 * - `major`: 主要な伏線（物語の根幹に関わる）
 * - `minor`: 補助的な伏線
 * - `subtle`: 微細な伏線（注意深い読者向け）
 */
export type ForeshadowingImportance = "major" | "minor" | "subtle";

/**
 * 伏線設置情報
 *
 * 伏線がどこで、どのように設置されたかを表現
 */
export type PlantingInfo = {
  /** 設置されたチャプターID */
  chapter: string;
  /** 設置の説明 */
  description: string;
  /** 抜粋（インライン or ファイル参照） */
  excerpt?: string | { file: string };
  /** 関連するイベントID */
  eventId?: string;
};

/**
 * 伏線回収情報
 *
 * 伏線がどこで、どのように回収されたかを表現
 * 複数回の部分回収に対応
 */
export type ResolutionInfo = {
  /** 回収されたチャプターID */
  chapter: string;
  /** 回収の説明 */
  description: string;
  /** 抜粋（インライン or ファイル参照） */
  excerpt?: string | { file: string };
  /** 関連するイベントID */
  eventId?: string;
  /** 回収の完全性（0.0〜1.0） */
  completeness: number;
};

/**
 * 伏線の詳細情報（オプショナル）
 * 各フィールドは短文インラインまたはファイル参照を選択可能
 */
export type ForeshadowingDetails = {
  /** 伏線の意図・目的 */
  intent?: string | { file: string };
  /** 読者への期待される影響 */
  readerImpact?: string | { file: string };
  /** 回収のアイデア・計画 */
  resolutionIdea?: string | { file: string };
  /** メモ */
  notes?: string | { file: string };
};

/**
 * LSP用の検出ヒント
 */
export type ForeshadowingDetectionHints = {
  /** よく使われるパターン（例: "古びた剣", "謎の手紙"） */
  commonPatterns: string[];
  /** 除外すべきパターン */
  excludePatterns: string[];
  /** 検出の信頼度（0.0〜1.0） */
  confidence: number;
};

/**
 * 伏線の関連エンティティ
 */
export type ForeshadowingRelations = {
  /** 関連するキャラクターのIDリスト */
  characters: string[];
  /** 関連する設定（場所など）のIDリスト */
  settings: string[];
  /** 関連する他の伏線のIDリスト */
  relatedForeshadowings?: string[];
};

/**
 * Foreshadowing型
 *
 * 物語の伏線を管理するための型
 * 設置・回収の追跡と可視化に対応
 */
export type Foreshadowing = {
  // ========================================
  // 必須メタデータ
  // ========================================

  /** 一意なID（プログラム的な識別子） */
  id: string;

  /** 伏線の名前 */
  name: string;

  /** 伏線のタイプ */
  type: ForeshadowingType;

  /** 短い概要（必須） */
  summary: string;

  /** 伏線の設置情報 */
  planting: PlantingInfo;

  /** 現在のステータス */
  status: ForeshadowingStatus;

  // ========================================
  // オプショナル情報
  // ========================================

  /** 伏線の重要度 */
  importance?: ForeshadowingImportance;

  /** 回収情報のリスト（複数回の部分回収に対応） */
  resolutions?: ResolutionInfo[];

  /** 計画されている回収チャプター */
  plannedResolutionChapter?: string;

  /** 関連エンティティ */
  relations?: ForeshadowingRelations;

  /** 表示名のバリエーション */
  displayNames?: string[];

  /** 詳細情報 */
  details?: ForeshadowingDetails;

  /** LSP用の検出ヒント */
  detectionHints?: ForeshadowingDetectionHints;
};
