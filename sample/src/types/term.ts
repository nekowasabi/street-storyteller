// Term型定義（用語・概念管理用）
export type TermCategory = 
  | "magic"           // 魔法・呪文
  | "skill"           // 技能・必殺技
  | "item"            // アイテム・道具
  | "concept"         // 概念・世界観用語
  | "title"           // 称号・階級
  | "organization"    // 組織・団体
  | "creature"        // 生物・モンスター
  | "technology"      // 技術・発明
  | "language"        // 言語・方言
  | "custom";         // その他

export type TermDetails = {
  description?: string | { $ref: string };
  origin?: string | { $ref: string };
  usage?: string | { $ref: string };
  limitations?: string | { $ref: string };
  variations?: string[] | { $ref: string };
  relatedTerms?: string[];
};

export type Term = {
  // 必須メタデータ
  id: string;
  name: string;
  displayNames?: string[];      // 表記ゆれ（「炎の剣」「フレイムソード」）
  category: TermCategory;
  
  // 必須概要
  summary: string;
  
  // オプショナル詳細
  details?: TermDetails;
  
  // 使用制約
  constraints?: {
    usableBy?: string[];         // 使用可能キャラクター
    requiresCondition?: string;  // 使用条件
    appearingChapters?: string[];
  };
  
  // 検出ヒント（LSP用）
  detectionHints?: {
    commonPatterns: string[];
    contextRequired: boolean;
    confidence: number;
  };
};

// 魔法呪文の例
export type MagicSpell = Term & {
  category: "magic";
  magicProperties?: {
    element?: "fire" | "water" | "earth" | "wind" | "light" | "dark" | "neutral";
    manaCost?: number;
    castTime?: string;
    range?: string;
    effect?: string;
    incantation?: string;  // 詠唱文
  };
};

// アイテムの例
export type Item = Term & {
  category: "item";
  itemProperties?: {
    rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary";
    value?: number;
    weight?: number;
    durability?: number;
    effects?: string[];
  };
};