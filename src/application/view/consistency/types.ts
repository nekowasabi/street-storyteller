// src/application/view/consistency/types.ts

/** 問題の重大度 */
export type IssueSeverity = "error" | "warning" | "info";

/** 問題の種類 */
export type IssueType =
  | "orphan_character" // 孤立キャラクター
  | "orphan_setting" // 孤立設定
  | "cyclic_causality" // 循環因果
  | "unresolved_foreshadowing" // 未回収伏線
  | "missing_reference" // 参照先不明
  | "timeline_inconsistency" // 時系列矛盾
  | "duplicate_id"; // ID重複

/** エンティティタイプ */
export type EntityType =
  | "character"
  | "setting"
  | "timeline"
  | "foreshadowing"
  | "event";

/** 整合性問題 */
export type ConsistencyIssue = {
  /** 問題の一意識別子 */
  readonly id: string;
  /** 問題の種類 */
  readonly type: IssueType;
  /** 重大度 */
  readonly severity: IssueSeverity;
  /** 問題の説明メッセージ */
  readonly message: string;
  /** 関連するエンティティのID */
  readonly entityId?: string;
  /** 関連するエンティティの種類 */
  readonly entityType?: EntityType;
  /** 修正提案 */
  readonly suggestion?: string;
};
