/**
 * CharacterStateSnapshot型定義（v2）
 *
 * 特定のフェーズにおけるキャラクターの完全な状態を表現する
 * CharacterPhaseResolverによって生成される
 */

import type { CharacterRole, RelationType } from "./character.ts";
import type { StatusDelta } from "./character_phase.ts";

/**
 * キャラクターの完全な状態スナップショット
 * 特定のフェーズにおけるキャラクターの全属性を表現
 */
export type CharacterStateSnapshot = {
  /** キャラクターID */
  characterId: string;

  /** フェーズID（nullの場合は初期状態） */
  phaseId: string | null;

  /** フェーズ名 */
  phaseName: string;

  /** 解決されたタイムスタンプ */
  resolvedAt: string;

  // ========================================
  // 解決された状態
  // ========================================

  /** 特性 */
  traits: string[];

  /** 信条 */
  beliefs: string[];

  /** 能力 */
  abilities: string[];

  /** 関係性 */
  relationships: Record<string, RelationType>;

  /** 外見 */
  appearance: string[];

  /** 状態 */
  status: StatusDelta;

  /** 目標 */
  goals: string[];

  /** このフェーズでの概要 */
  summary: string;

  // ========================================
  // 基本Character情報への参照
  // ========================================

  /** 基本キャラクター情報 */
  baseCharacter: {
    id: string;
    name: string;
    role: CharacterRole;
  };
};

/**
 * フェーズ間の差分比較結果
 */
export type PhaseDiffResult = {
  /** 比較元フェーズID */
  fromPhaseId: string | null;

  /** 比較先フェーズID */
  toPhaseId: string;

  /** 比較元フェーズ名 */
  fromPhaseName: string;

  /** 比較先フェーズ名 */
  toPhaseName: string;

  /** 差分の詳細 */
  changes: {
    traits: {
      added: string[];
      removed: string[];
    };
    beliefs: {
      added: string[];
      removed: string[];
    };
    abilities: {
      added: string[];
      removed: string[];
    };
    relationships: {
      added: Record<string, RelationType>;
      removed: string[];
      changed: Record<string, { from: RelationType; to: RelationType }>;
    };
    appearance: {
      added: string[];
      removed: string[];
    };
    status: {
      physical?: { from?: string; to?: string };
      mental?: { from?: string; to?: string };
      social?: { from?: string; to?: string };
    };
    goals: {
      added: string[];
      removed: string[];
    };
    summary?: {
      from: string;
      to: string;
    };
  };
};

/**
 * フェーズタイムライン表示用の型
 */
export type PhaseTimelineEntry = {
  /** フェーズID */
  phaseId: string | null;

  /** フェーズ名 */
  phaseName: string;

  /** 順序 */
  order: number;

  /** 概要 */
  summary: string;

  /** 遷移タイプ */
  transitionType?: string;

  /** 重要度 */
  importance?: string;

  /** 開始チャプター */
  startChapter?: string;

  /** トリガーイベントID */
  triggerEventId?: string;

  /** このフェーズでの主な変化（サマリー用） */
  keyChanges: string[];
};
