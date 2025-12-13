// Character型定義（拡張版）
export type RelationType =
  | "ally"
  | "enemy"
  | "neutral"
  | "romantic"
  | "respect"
  | "competitive"
  | "mentor";

export type CharacterRole =
  | "protagonist"
  | "antagonist"
  | "supporting"
  | "guest";

export type CharacterDevelopment = {
  initial: string;
  goal: string;
  obstacle: string;
  resolution?: string;
  arc_notes?: string | { file: string };
};

export type CharacterDetails = {
  appearance?: string | { $ref: string };
  personality?: string | { $ref: string };
  backstory?: string | { $ref: string };
  relationships_detail?: string | { $ref: string };
  goals?: string | { $ref: string };
  development?: CharacterDevelopment;
};

export type DetectionHints = {
  commonPatterns: string[];
  excludePatterns: string[];
  requiresContext: boolean;
  confidence: number;
};

export type Character = {
  // 必須メタデータ（型安全性重視）
  id: string;
  name: string;
  displayNames?: string[];
  aliases?: string[];
  pronouns?: string[];
  role: CharacterRole;
  traits: string[];
  relationships: { [characterId: string]: RelationType };
  appearingChapters: string[];

  // 必須概要（短文）
  summary: string;

  // オプショナルな詳細情報（ハイブリッド）
  details?: CharacterDetails;

  // 検出ヒント（LSP用）
  detectionHints?: DetectionHints;
};
