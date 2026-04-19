/**
 * Subplot（サブプロット）型定義
 *
 * メインプロットとサブプロットを管理し、物語の構造を表現する。
 *
 * @module
 */

// ========================================
// 基本型
// ========================================

/**
 * プロットタイプ
 * - main: メインプロット（物語の中心）
 * - subplot: サブプロット（メインを補完）
 * - parallel: 並行プロット（メインと独立して進行）
 * - background: 背景プロット（世界観を補強）
 */
export type SubplotType = "main" | "subplot" | "parallel" | "background";

/**
 * プロットの状態
 * - active: 進行中
 * - completed: 完了
 */
export type SubplotStatus = "active" | "completed";

/**
 * プロットの重要度
 * - major: 主要
 * - minor: 補助的
 */
export type SubplotImportance = "major" | "minor";

// ========================================
// ビート構造位置
// ========================================

/**
 * ビートの構造位置
 * 物語の起承転結における位置を表す
 */
export type BeatStructurePosition =
  | "setup"
  | "rising"
  | "climax"
  | "falling"
  | "resolution";

// ========================================
// 影響・交差関連型
// ========================================

/**
 * 影響方向
 * - forward: 元プロットから対象プロットへ影響
 * - backward: 対象プロットから元プロットへ影響
 * - mutual: 双方向の影響
 */
export type IntersectionInfluenceDirection = "forward" | "backward" | "mutual";

/**
 * 影響レベル
 */
export type IntersectionInfluenceLevel = "high" | "medium" | "low";

// ========================================
// フォーカスキャラクター
// ========================================

/**
 * フォーカスキャラクターの重み
 * - primary: 主役
 * - secondary: 副次的
 */
export type SubplotFocusCharacterWeight = "primary" | "secondary";

// ========================================
// プロットビート
// ========================================

/**
 * プロットビート（起承転結の各ポイント）
 */
export type PlotBeat = {
  // 必須フィールド
  /** 一意なID */
  id: string;
  /** ビートタイトル */
  title: string;
  /** 短い概要 */
  summary: string;

  // 関連エンティティ
  /** 関連チャプター */
  chapter?: string;
  /** 関連キャラクターIDリスト */
  characters?: string[];
  /** 関連設定IDリスト */
  settings?: string[];

  // オプション: 構造情報
  /** 構造位置 */
  structurePosition?: BeatStructurePosition;

  // オプション: 因果関係（片方向のみ）
  /** このビートの原因となるビートID（前提条件） */
  preconditionBeatIds?: string[];

  // オプション: TimelineEventとのリンク
  /** 関連するTimelineEventのID */
  timelineEventId?: string;
};

// ========================================
// プロット交差
// ========================================

/**
 * プロット交差
 * 異なるプロット間でビート同士がどのように影響し合うかを定義
 */
export type PlotIntersection = {
  // 必須: 交差元
  /** 交差元プロットID */
  sourceSubplotId: string;
  /** 交差元ビートID */
  sourceBeatId: string;

  // 必須: 交差先
  /** 交差先プロットID */
  targetSubplotId: string;
  /** 交差先ビートID */
  targetBeatId: string;

  // 交差の性質
  /** 交差の説明 */
  summary: string;
  /** 影響方向 */
  influenceDirection: IntersectionInfluenceDirection;
  /** 影響レベル */
  influenceLevel?: IntersectionInfluenceLevel;
};

// ========================================
// サブプロット詳細情報
// ========================================

/**
 * サブプロット詳細情報
 * ハイブリッドパターン: string | { file: string }
 */
export type SubplotDetails = {
  /** 詳細説明 */
  description?: string | { file: string };
  /** このプロットの動機 */
  motivation?: string | { file: string };
  /** 結末の詳細 */
  resolution?: string | { file: string };
};

// ========================================
// サブプロット関連エンティティ
// ========================================

/**
 * サブプロットの関連エンティティ
 */
export type SubplotRelations = {
  /** 関連キャラクターIDリスト（必須） */
  characters: string[];
  /** 関連設定IDリスト（必須） */
  settings: string[];
  /** 関連伏線IDリスト（オプション） */
  foreshadowings?: string[];
  /** 関連サブプロットIDリスト（オプション） */
  relatedSubplots?: string[];
};

// ========================================
// サブプロット型（メイン）
// ========================================

/**
 * サブプロット型
 */
export type Subplot = {
  // ========================================
  // 必須メタデータ
  // ========================================

  /** 一意なID */
  id: string;

  /** プロット名 */
  name: string;

  /** プロットタイプ */
  type: SubplotType;

  /** プロットの状態 */
  status: SubplotStatus;

  /** 短い概要 */
  summary: string;

  /** プロットのビート構成 */
  beats: PlotBeat[];

  // ========================================
  // オプションフィールド
  // ========================================

  /** フォーカスキャラクターと重み */
  focusCharacters?: {
    characterId: string;
    weight: SubplotFocusCharacterWeight;
  }[];

  /** プロット間の交差 */
  intersections?: PlotIntersection[];

  /** 重要度 */
  importance?: SubplotImportance;

  /** 親プロットID */
  parentSubplotId?: string;

  /** 表示名のバリエーション */
  displayNames?: string[];

  /** 詳細情報 */
  details?: SubplotDetails;

  /** 関連エンティティ */
  relations?: SubplotRelations;
};
