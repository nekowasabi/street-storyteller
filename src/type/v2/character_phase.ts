/**
 * CharacterPhase型定義（v2）

 * キャラクターの成長・変化を表現するための型定義
 * 差分管理方式により、変化した属性のみを記述し、変化しない属性は前フェーズから自動継承
 */

import type { RelationType } from "@storyteller/types/v2/character.ts";

/**
 * フェーズの重要度
 *
 * - `major`: 主要なフェーズ（物語の転換点）
 * - `minor`: 補助的なフェーズ
 * - `subtle`: 微細なフェーズ（細かな変化）
 */
export type PhaseImportance = "major" | "minor" | "subtle";

/**
 * フェーズの遷移タイプ
 *
 * - `gradual`: 緩やかな変化（段階的な成長）
 * - `turning_point`: 転換点（大きな変化のきっかけ）
 * - `revelation`: 真実の発覚（気づき・覚醒）
 * - `regression`: 後退・退行（失墜・堕落）
 * - `transformation`: 劇的な変容
 */
export type TransitionType =
  | "gradual"
  | "turning_point"
  | "revelation"
  | "regression"
  | "transformation";

/**
 * 配列属性の差分
 */
export type ArrayDelta = {
  /** 追加される項目 */
  add?: string[];
  /** 削除される項目 */
  remove?: string[];
  /** 変更される項目（old → new） */
  modify?: Record<string, string>;
};

/**
 * 能力・スキルの差分
 */
export type AbilitiesDelta = {
  /** 追加される能力 */
  add?: string[];
  /** 削除される能力 */
  remove?: string[];
  /** 向上する能力 */
  improve?: string[];
  /** 低下する能力 */
  degrade?: string[];
};

/**
 * 関係性の差分
 */
export type RelationshipsDelta = {
  /** 追加される関係性 */
  add?: Record<string, RelationType>;
  /** 削除される関係性（キャラクターIDのリスト） */
  remove?: string[];
  /** 変更される関係性 */
  change?: Record<string, RelationType>;
};

/**
 * 状態の差分
 */
export type StatusDelta = {
  /** 身体的状態 */
  physical?: string;
  /** 精神的状態 */
  mental?: string;
  /** 社会的立場 */
  social?: string;
};

/**
 * キャラクターの状態差分
 * 各フィールドはオプショナルで、指定されたものだけが変更される
 */
export type CharacterStateDelta = {
  /** 性格・特性の変化 */
  traits?: ArrayDelta;

  /** 信条・価値観の変化 */
  beliefs?: ArrayDelta;

  /** 能力・スキルの変化 */
  abilities?: AbilitiesDelta;

  /** 関係性の変化 */
  relationships?: RelationshipsDelta;

  /** 外見の変化 */
  appearance?: ArrayDelta;

  /** 状態の変化 */
  status?: StatusDelta;

  /** 目標の変化 */
  goals?: ArrayDelta;

  /** サマリーの上書き（フェーズ固有の概要） */
  summary?: string;
};

/**
 * フェーズの詳細情報
 */
export type PhaseDetails = {
  /** 詳細説明 */
  description?: string | { file: string };
  /** 内面の変化 */
  internalChange?: string | { file: string };
  /** 外面の変化 */
  externalChange?: string | { file: string };
  /** 変化のきっかけ */
  catalyst?: string | { file: string };
  /** メモ */
  notes?: string | { file: string };
};

/**
 * キャラクターフェーズ
 * キャラクターの成長段階を表現する
 */
export type CharacterPhase = {
  // ========================================
  // 必須メタデータ
  // ========================================

  /** フェーズID（例: "awakening", "phase_1"） */
  id: string;

  /** フェーズ名（例: "覚醒期", "闇堕ち"） */
  name: string;

  /** フェーズの順序（時系列） */
  order: number;

  /** フェーズの概要 */
  summary: string;

  /** 状態の差分（前フェーズからの変化） */
  delta: CharacterStateDelta;

  // ========================================
  // オプショナル情報
  // ========================================

  /** 遷移タイプ */
  transitionType?: TransitionType;

  /** 重要度 */
  importance?: PhaseImportance;

  /** トリガーイベントID（TimelineEventへの参照） */
  triggerEventId?: string;

  /** 関連するタイムラインID */
  timelineId?: string;

  /** 開始チャプター */
  startChapter?: string;

  /** 終了チャプター（次のフェーズまで） */
  endChapter?: string;

  /** 詳細情報 */
  details?: PhaseDetails;

  /** 表示名のバリエーション（このフェーズでの呼び名） */
  displayNames?: string[];
};

/**
 * キャラクターの初期状態
 * 差分計算のベースラインとなる
 */
export type CharacterInitialState = {
  /** 初期特性 */
  traits: string[];

  /** 初期信条 */
  beliefs?: string[];

  /** 初期能力 */
  abilities?: string[];

  /** 初期関係性 */
  relationships?: Record<string, RelationType>;

  /** 初期外見 */
  appearance?: string[];

  /** 初期状態 */
  status?: StatusDelta;

  /** 初期目標 */
  goals?: string[];
};
