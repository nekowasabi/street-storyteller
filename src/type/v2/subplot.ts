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
export type PlotType = "main" | "subplot" | "parallel" | "background";

/**
 * プロットの重要度
 */
export type PlotImportance = "major" | "minor" | "supporting";

/**
 * 影響レベル
 */
export type InfluenceLevel = "low" | "medium" | "high";

/**
 * 影響方向
 * - forward: 元プロットから対象プロットへ影響
 * - backward: 対象プロットから元プロットへ影響
 * - mutual: 双方向の影響
 */
export type InfluenceDirection = "forward" | "backward" | "mutual";

// ========================================
// フォーカスキャラクター
// ========================================

/**
 * フォーカスキャラクター
 * プロット内でのキャラクターの役割を定義
 */
export type FocusCharacter = {
  /** キャラクターID */
  characterId: string;
  /** 重み（primary: 主役、secondary: 副次的） */
  weight: "primary" | "secondary";
};

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
  /** 関連チャプター */
  chapter: string;

  // 関連エンティティ
  /** 関連キャラクターIDリスト */
  characters: string[];
  /** 関連設定IDリスト */
  settings: string[];

  // オプション: 構造情報
  /** 構造位置（"setup", "rising", "climax", "falling", "resolution" など） */
  structurePosition?: string;
  /** カスタムステータス */
  customStatus?: string;

  // オプション: 因果関係（片方向のみ）
  /** このビートの原因となるビートID（前提条件） */
  preconditionBeatIds?: string[];

  // オプション: TimelineEventとのリンク
  /** 関連するTimelineEventのID */
  timelineEventId?: string;

  // オプション: 表示名
  /** 表示名のバリエーション */
  displayNames?: string[];
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
  sourcePlotId: string;
  /** 交差元ビートID */
  sourceBeatId: string;

  // 必須: 交差先
  /** 交差先プロットID */
  targetPlotId: string;
  /** 交差先ビートID */
  targetBeatId: string;

  // 交差の性質
  /** 交差の説明 */
  description: string;
  /** 影響方向 */
  influenceDirection: InfluenceDirection;
  /** 影響レベル */
  influenceLevel: InfluenceLevel;

  // オプション: 関連チャプター
  /** 交差が発生するチャプター */
  chapter?: string;
};

// ========================================
// 構造テンプレート
// ========================================

/**
 * 構造テンプレート参照
 */
export type StructureTemplate = {
  /** テンプレートID */
  id: string;
  /** テンプレート名 */
  name: string;
  /** 構造位置リスト */
  positions: string[];
};

// ========================================
// サブプロット詳細情報
// ========================================

/**
 * サブプロット詳細情報
 */
export type SubplotDetails = {
  /** 詳細説明 */
  description?: string | { file: string };
  /** このプロットの動機 */
  motivation?: string | { file: string };
  /** 結末の詳細 */
  resolution?: string | { file: string };
};

/**
 * LSP用検出ヒント
 */
export type SubplotDetectionHints = {
  /** よく使われるパターン */
  commonPatterns?: string[];
  /** 除外パターン */
  excludePatterns?: string[];
  /** 信頼度 */
  confidence?: number;
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
  type: PlotType;

  /** 短い概要 */
  summary: string;

  /** プロットのビート構成 */
  beats: PlotBeat[];

  // ========================================
  // キャラクター関連
  // ========================================

  /** このプロットのフォーカスキャラクター */
  focusCharacters: FocusCharacter[];

  /** 関連キャラクター（フォーカス以外） */
  relatedCharacters?: string[];

  // ========================================
  // 構造・関係性
  // ========================================

  /** 構造テンプレートID（外部定義） */
  structureTemplateId?: string;

  /** 親プロットID（サブプロットの場合） */
  parentPlotId?: string;

  /** 子プロットIDリスト */
  childPlotIds?: string[];

  /** このプロットが扱うテーマ */
  themes?: string[];

  // ========================================
  // メタ情報
  // ========================================

  /** 重要度 */
  importance?: PlotImportance;

  /** 表示名のバリエーション */
  displayNames?: string[];

  /** 詳細情報 */
  details?: SubplotDetails;

  /** LSP用の検出ヒント */
  detectionHints?: SubplotDetectionHints;
};
