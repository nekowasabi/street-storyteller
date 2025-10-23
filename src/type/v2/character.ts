/**
 * Character型定義（v2）
 *
 * ハイブリッド詳細管理（インライン + ファイル参照）に対応した拡張型定義
 */

/**
 * キャラクターの役割
 */
export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "guest";

/**
 * キャラクター間の関係性の種類
 */
export type RelationType =
  | "ally"
  | "enemy"
  | "neutral"
  | "romantic"
  | "respect"
  | "competitive"
  | "mentor";

/**
 * キャラクターの成長・発展
 */
export type CharacterDevelopment = {
  /** 初期状態 */
  initial: string;
  /** 目標 */
  goal: string;
  /** 障害 */
  obstacle: string;
  /** 解決（オプショナル） */
  resolution?: string;
  /** 成長アークのメモ（インライン or ファイル参照） */
  arc_notes?: string | { file: string };
};

/**
 * キャラクターの詳細情報（オプショナル）
 * 各フィールドは短文インラインまたはファイル参照を選択可能
 */
export type CharacterDetails = {
  /** 外見描写 */
  appearance?: string | { file: string };
  /** 性格 */
  personality?: string | { file: string };
  /** 背景ストーリー */
  backstory?: string | { file: string };
  /** 関係性の詳細 */
  relationships_detail?: string | { file: string };
  /** 目標・動機の詳細 */
  goals?: string | { file: string };
  /** キャラクター発展 */
  development?: CharacterDevelopment;
};

/**
 * LSP用の検出ヒント
 */
export type DetectionHints = {
  /** よく使われるパターン（例: "勇者は", "勇者が"） */
  commonPatterns: string[];
  /** 除外すべきパターン（例: "伝説の勇者"） */
  excludePatterns: string[];
  /** 検出の信頼度（0.0～1.0） */
  confidence: number;
};

/**
 * キャラクター型（v2）
 *
 * 必須メタデータは型安全に管理し、詳細情報は段階的に追加可能
 */
export type Character = {
  // ========================================
  // 必須メタデータ
  // ========================================

  /** 一意なID（プログラム的な識別子） */
  id: string;

  /** キャラクター名（物語内での名前） */
  name: string;

  /** 役割 */
  role: CharacterRole;

  /** 特徴・属性のリスト */
  traits: string[];

  /** 他キャラクターとの関係性マップ */
  relationships: Record<string, RelationType>;

  /** 登場するチャプターのIDリスト */
  appearingChapters: string[];

  /** 短い概要（必須） */
  summary: string;

  // ========================================
  // オプショナル情報
  // ========================================

  /** 表示名のバリエーション（例: "勇者", "若者"） */
  displayNames?: string[];

  /** 別名・愛称 */
  aliases?: string[];

  /** 人称代名詞（LSP用、例: ["彼", "彼女"]） */
  pronouns?: string[];

  /** 詳細情報（段階的に追加可能） */
  details?: CharacterDetails;

  /** LSP用の検出ヒント */
  detectionHints?: DetectionHints;
};
