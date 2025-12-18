/**
 * Setting型定義（v2）
 *
 * ハイブリッド詳細管理（インライン + ファイル参照）に対応した拡張型定義
 */

/**
 * 設定の種類
 */
export type SettingType = "location" | "world" | "culture" | "organization";

/**
 * 設定の詳細情報（オプショナル）
 * 各フィールドは短文インラインまたはファイル参照を選択可能
 */
export type SettingDetails = {
  /** 設定の説明（概要より詳細な説明） */
  description?: string | { file: string };
  /** 地理情報 */
  geography?: string | { file: string };
  /** 歴史 */
  history?: string | { file: string };
  /** 文化 */
  culture?: string | { file: string };
  /** 政治 */
  politics?: string | { file: string };
  /** 経済 */
  economy?: string | { file: string };
  /** 住民 */
  inhabitants?: string | { file: string };
  /** ランドマーク */
  landmarks?: string | { file: string };
};

/**
 * LSP用の検出ヒント
 */
export type SettingDetectionHints = {
  /** よく使われるパターン（例: "王都の", "王都で"） */
  commonPatterns: string[];
  /** 除外すべきパターン */
  excludePatterns: string[];
  /** 検出の信頼度（0.0～1.0） */
  confidence: number;
};

/**
 * Setting型（v2）
 *
 * 必須メタデータは型安全に管理し、詳細情報は段階的に追加可能
 */
export type Setting = {
  // ========================================
  // 必須メタデータ
  // ========================================

  /** 一意なID（プログラム的な識別子） */
  id: string;

  /** 設定名（物語内での名前） */
  name: string;

  /** 設定の種類 */
  type: SettingType;

  /** 登場するチャプターのIDリスト */
  appearingChapters: string[];

  /** 短い概要（必須） */
  summary: string;

  // ========================================
  // オプショナル情報
  // ========================================

  /** 表示名のバリエーション（例: "王都", "首都"） */
  displayNames?: string[];

  /** 詳細情報（段階的に追加可能） */
  details?: SettingDetails;

  /** 関連する設定のID */
  relatedSettings?: string[];

  /** LSP用の検出ヒント */
  detectionHints?: SettingDetectionHints;
};
