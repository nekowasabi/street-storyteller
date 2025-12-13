// Setting型定義（拡張版）
export type SettingType = "location" | "world" | "culture" | "organization";

export type SettingDetails = {
  geography?: string | { $ref: string };
  history?: string | { $ref: string };
  culture?: string | { $ref: string };
  politics?: string | { $ref: string };
  economy?: string | { $ref: string };
  inhabitants?: string | { $ref: string };
  landmarks?: string | { $ref: string };
};

export type Setting = {
  // 必須メタデータ
  id: string;
  name: string;
  displayNames?: string[];
  type: SettingType;
  appearingChapters: string[];

  // 必須概要
  summary: string;

  // オプショナル詳細
  details?: SettingDetails;

  // 関連設定
  relatedSettings?: string[];

  // 検出ヒント（LSP用）
  detectionHints?: {
    commonPatterns: string[];
    excludePatterns: string[];
    confidence: number;
  };
};
