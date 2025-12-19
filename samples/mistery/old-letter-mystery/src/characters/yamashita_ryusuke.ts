import type { Character } from "@storyteller/types/v2/character.ts";

/**
 * yamashita_ryusuke
 * 大学教授で歴史家。矢島家の手紙消失事件を調査する
 */
export const yamashita_ryusuke: Character = {
  // =============================================
  // 必須メタデータ
  // =============================================

  /** 一意なID（プログラム的な識別子） */
  id: "yamashita_ryusuke",

  /** キャラクター名（物語内での名前） */
  name: "yamashita_ryusuke",

  /** 役割: "protagonist" | "antagonist" | "supporting" | "guest" */
  role: "protagonist",

  /** 特徴・属性のリスト */
  traits: [],

  /** 他キャラクターとの関係性マップ { characterId: RelationType } */
  // RelationType: "ally" | "enemy" | "neutral" | "romantic" | "respect" | "competitive" | "mentor"
  relationships: {},

  /** 登場するチャプターのIDリスト */
  appearingChapters: [],

  /** 短い概要（必須） */
  summary: "大学教授で歴史家。矢島家の手紙消失事件を調査する",

  // =============================================
  // 表示・検出設定（オプショナル）
  // =============================================

  /** 表示名のバリエーション（例: ["勇者", "若者"]） - 原稿での検出に使用 */
  displayNames: [],

  /** 別名・愛称 */
  aliases: [],

  /** 人称代名詞（LSP用、例: ["彼", "彼女"]） */
  pronouns: [],

  // =============================================
  // 詳細情報（オプショナル）
  // =============================================

  /** 詳細情報 - 各フィールドは文字列 or { file: "path/to/file.md" } */
  details: {
    /** キャラクターの説明（summaryより詳細な紹介文） */
    description: "",
    /** 外見描写 */
    appearance: "",
    /** 性格 */
    personality: "",
    /** 背景ストーリー */
    backstory: "",
    /** 関係性の詳細 */
    relationships_detail: "",
    /** 目標・動機の詳細 */
    goals: "",
    /** キャラクター発展（成長アーク） */
    // development: {
    //   initial: "",    // 初期状態
    //   goal: "",       // 目標
    //   obstacle: "",   // 障害
    //   resolution: "", // 解決
    //   arc_notes: "",  // 成長アークのメモ
    // },
  },

  // =============================================
  // LSP検出ヒント（オプショナル）
  // =============================================

  /** LSP用の検出ヒント - 原稿からキャラクターを自動検出する際の設定 */
  detectionHints: {
    /** よく使われるパターン（例: ["勇者は", "勇者が"]） */
    commonPatterns: [],
    /** 除外すべきパターン（例: ["伝説の勇者"]） */
    excludePatterns: [],
    /** 検出の信頼度（0.0～1.0） */
    confidence: 1,
  },

  // =============================================
  // キャラクター成長・変化（Phase機能）（オプショナル）
  // =============================================

  /** 初期状態（差分計算のベースライン） - Phase機能を使用する場合に設定 */
  initialState: {
    /** 初期特性 */
    traits: [],
    /** 初期信条 */
    beliefs: [],
    /** 初期能力 */
    abilities: [],
    /** 初期関係性 */
    relationships: {},
    /** 初期外見 */
    appearance: [],
    /** 初期状態 { physical?, mental?, social? } */
    // status: {},
    /** 初期目標 */
    goals: [],
  },

  /** 成長フェーズのリスト - キャラクターの変化を段階的に定義 */
  // phases: [
  //   {
  //     id: "phase_01",
  //     name: "覚醒",
  //     order: 1,
  //     summary: "覚醒後の変化",
  //     delta: {
  //       traits: { add: ["勇敢"], remove: ["臆病"] },
  //       beliefs: { add: ["正義を信じる"] },
  //       abilities: { add: ["剣術"], improve: ["体力"] },
  //       relationships: { add: { mentor: "respect" } },
  //     },
  //     transitionType: "revelation",  // "gradual" | "turning_point" | "revelation" | "regression" | "transformation"
  //     importance: "major",           // "major" | "minor" | "subtle"
  //     triggerEventId: "",            // TimelineEventへの参照
  //     startChapter: "",
  //     endChapter: "",
  //   },
  // ],
  phases: [],

  /** 現在のフェーズID（執筆進行管理用） */
  currentPhaseId: "",
};
