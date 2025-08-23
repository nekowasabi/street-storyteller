// Chapter型定義
import type { Character } from "./character.ts";
import type { Setting } from "./setting.ts";

export type ValidationRule = {
  type: "character_presence" | "setting_consistency" | "plot_advancement" | "custom";
  validate: (content: string, context?: any) => boolean | Promise<boolean>;
  message?: string;
};

export type ChapterMeta = {
  id: string;
  title: string;
  order: number;
  characters: Character[];
  settings: Setting[];
  
  // 章固有の検証ルール
  validations?: ValidationRule[];
  
  // 参照マッピング（LSP用）
  references?: { [word: string]: Character | Setting };
  
  // 概要
  summary?: string;
  
  // プロット進行
  plotPoints?: string[];
};