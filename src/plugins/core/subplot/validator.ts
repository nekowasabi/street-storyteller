/**
 * Subplot要素のバリデーター
 *
 * Subplot型の検証ロジックを提供する。
 * 必須フィールド、値ドメイン、ビート間因果関係の整合性を検証する。
 */

import type {
  BeatStructurePosition,
  PlotBeat,
  Subplot,
  SubplotFocusCharacterWeight,
  SubplotImportance,
  SubplotStatus,
  SubplotType,
} from "@storyteller/types/v2/subplot.ts";
import type {
  ValidationError,
  ValidationResult,
} from "@storyteller/core/plugin_system.ts";

/**
 * 有効なプロットタイプ
 */
const validPlotTypes: SubplotType[] = [
  "main",
  "subplot",
  "parallel",
  "background",
];

/**
 * 有効な重要度
 */
const validImportances: SubplotImportance[] = [
  "major",
  "minor",
];

/**
 * 有効なステータス
 */
const validStatuses: SubplotStatus[] = [
  "active",
  "completed",
];

/**
 * 有効な構造位置
 */
const validStructurePositions: BeatStructurePosition[] = [
  "setup",
  "rising",
  "climax",
  "falling",
  "resolution",
];

/**
 * 有効なフォーカスキャラクター重み
 */
const validWeights: SubplotFocusCharacterWeight[] = [
  "primary",
  "secondary",
];

/**
 * Subplotを検証する
 *
 * @param element 検証対象の要素
 * @returns 検証結果
 */
export function validateSubplot(element: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof element !== "object" || element === null) {
    return {
      valid: false,
      errors: [{ field: "root", message: "Subplot must be an object" }],
    };
  }

  const subplot = element as Partial<Subplot>;

  // id検証
  if (
    !subplot.id || typeof subplot.id !== "string" ||
    subplot.id.trim() === ""
  ) {
    errors.push({
      field: "id",
      message: "id is required and must be a non-empty string",
    });
  }

  // name検証
  if (
    !subplot.name || typeof subplot.name !== "string" ||
    subplot.name.trim() === ""
  ) {
    errors.push({
      field: "name",
      message: "name is required and must be a non-empty string",
    });
  }

  // type検証
  if (
    !subplot.type ||
    !validPlotTypes.includes(subplot.type as SubplotType)
  ) {
    errors.push({
      field: "type",
      message: `type must be one of: ${validPlotTypes.join(", ")}`,
    });
  }

  // status検証
  if (
    !subplot.status ||
    !validStatuses.includes(subplot.status as SubplotStatus)
  ) {
    errors.push({
      field: "status",
      message: `status must be one of: ${validStatuses.join(", ")}`,
    });
  }

  // summary検証
  if (
    !subplot.summary || typeof subplot.summary !== "string" ||
    subplot.summary.trim() === ""
  ) {
    errors.push({
      field: "summary",
      message: "summary is required and must be a non-empty string",
    });
  }

  // beats検証
  if (!Array.isArray(subplot.beats)) {
    errors.push({
      field: "beats",
      message: "beats is required and must be an array",
    });
  } else {
    subplot.beats.forEach((beat, index) => {
      const beatErrors = validateBeat(beat, index, subplot.beats!);
      errors.push(...beatErrors);
    });

    // ビート間の循環参照検出
    if (detectBeatPreconditionCycles(subplot.beats)) {
      errors.push({
        field: "beats",
        message:
          "Circular precondition dependency detected among beats (preconditionBeatIds)",
      });
    }
  }

  // focusCharacters検証（オプション）
  // Why: focusCharacters is Record<string, SubplotFocusCharacterWeight>, not an array
  if (subplot.focusCharacters !== undefined) {
    if (
      typeof subplot.focusCharacters !== "object" ||
      subplot.focusCharacters === null ||
      Array.isArray(subplot.focusCharacters)
    ) {
      errors.push({
        field: "focusCharacters",
        message:
          "focusCharacters must be a Record<string, SubplotFocusCharacterWeight>",
      });
    } else {
      const fcErrors = validateFocusCharactersRecord(subplot.focusCharacters);
      errors.push(...fcErrors);
    }
  }

  // importance検証（オプション）
  if (
    subplot.importance !== undefined &&
    !validImportances.includes(subplot.importance as SubplotImportance)
  ) {
    errors.push({
      field: "importance",
      message: `importance must be one of: ${validImportances.join(", ")}`,
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * 単一のPlotBeatを検証する
 *
 * @param beat 検証対象のビート
 * @param index ビートのインデックス（エラーメッセージ用）
 * @param allBeats 全ビート（preconditionBeatIds存在確認用）
 * @returns 検証エラーのリスト
 */
function validateBeat(
  beat: unknown,
  index: number,
  allBeats: PlotBeat[],
): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `beats[${index}]`;

  if (typeof beat !== "object" || beat === null) {
    return [{ field: prefix, message: `${prefix} must be an object` }];
  }

  const b = beat as Partial<PlotBeat>;

  // id検証
  if (!b.id || typeof b.id !== "string" || b.id.trim() === "") {
    errors.push({
      field: `${prefix}.id`,
      message: `${prefix}.id is required and must be a non-empty string`,
    });
  }

  // title検証
  if (!b.title || typeof b.title !== "string" || b.title.trim() === "") {
    errors.push({
      field: `${prefix}.title`,
      message: `${prefix}.title is required and must be a non-empty string`,
    });
  }

  // summary検証
  if (
    !b.summary || typeof b.summary !== "string" || b.summary.trim() === ""
  ) {
    errors.push({
      field: `${prefix}.summary`,
      message: `${prefix}.summary is required and must be a non-empty string`,
    });
  }

  // structurePosition検証（必須）
  if (
    !b.structurePosition ||
    typeof b.structurePosition !== "string" ||
    !validStructurePositions.includes(
      b.structurePosition as BeatStructurePosition,
    )
  ) {
    errors.push({
      field: `${prefix}.structurePosition`,
      message: `${prefix}.structurePosition is required and must be one of: ${
        validStructurePositions.join(", ")
      }`,
    });
  }

  // chapter検証（オプション）
  if (
    b.chapter !== undefined &&
    (typeof b.chapter !== "string" || b.chapter.trim() === "")
  ) {
    errors.push({
      field: `${prefix}.chapter`,
      message: `${prefix}.chapter must be a non-empty string if provided`,
    });
  }

  // characters検証（オプション）
  if (
    b.characters !== undefined && !Array.isArray(b.characters)
  ) {
    errors.push({
      field: `${prefix}.characters`,
      message: `${prefix}.characters must be an array if provided`,
    });
  }

  // settings検証（オプション）
  if (
    b.settings !== undefined && !Array.isArray(b.settings)
  ) {
    errors.push({
      field: `${prefix}.settings`,
      message: `${prefix}.settings must be an array if provided`,
    });
  }

  // preconditionBeatIds検証（オプション）
  if (b.preconditionBeatIds !== undefined) {
    if (!Array.isArray(b.preconditionBeatIds)) {
      errors.push({
        field: `${prefix}.preconditionBeatIds`,
        message: `${prefix}.preconditionBeatIds must be an array`,
      });
    } else {
      const allBeatIds = new Set(allBeats.map((ab) => ab.id));
      b.preconditionBeatIds.forEach((pid, pidx) => {
        if (typeof pid !== "string" || pid.trim() === "") {
          errors.push({
            field: `${prefix}.preconditionBeatIds[${pidx}]`,
            message:
              `${prefix}.preconditionBeatIds[${pidx}] must be a non-empty string`,
          });
        } else if (!allBeatIds.has(pid)) {
          errors.push({
            field: `${prefix}.preconditionBeatIds[${pidx}]`,
            message:
              `${prefix}.preconditionBeatIds[${pidx}] references non-existent beat: "${pid}"`,
          });
        }
      });
    }
  }

  return errors;
}

/**
 * FocusCharacters Recordを検証する
 *
 * Why: focusCharacters is Record<string, SubplotFocusCharacterWeight>, not FocusCharacter[]
 *
 * @param fc Record<string, SubplotFocusCharacterWeight>
 * @returns 検証エラーのリスト
 */
function validateFocusCharactersRecord(
  fc: Record<string, unknown>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [characterId, weight] of Object.entries(fc)) {
    const prefix = `focusCharacters["${characterId}"]`;

    // characterId検証
    if (characterId.trim() === "") {
      errors.push({
        field: prefix,
        message: `focusCharacters key must be a non-empty string`,
      });
    }

    // weight検証
    if (
      typeof weight !== "string" ||
      !validWeights.includes(weight as SubplotFocusCharacterWeight)
    ) {
      errors.push({
        field: prefix,
        message: `${prefix} must be one of: ${validWeights.join(", ")}`,
      });
    }
  }

  return errors;
}

/**
 * ビート間の循環参照を検出する
 *
 * DFS（深さ優先探索）ベースの循環検出。
 * preconditionBeatIdsの依存関係グラフにサイクルが存在する場合にtrueを返す。
 *
 * 検出パターン:
 * - 自己参照 (A -> A)
 * - 直接循環 (A -> B -> A)
 * - 間接循環 (A -> B -> C -> A)
 *
 * @param beats ビートのリスト
 * @returns 循環が検出された場合true
 */
export function detectBeatPreconditionCycles(beats: PlotBeat[]): boolean {
  // ビートID -> ビートのマップを構築
  const beatMap = new Map<string, PlotBeat>();
  for (const beat of beats) {
    beatMap.set(beat.id, beat);
  }

  // 訪問状態: 0=未訪問, 1=訪問中(再帰スタック上), 2=訪問完了
  const visited = new Map<string, 0 | 1 | 2>();

  // 全ビートを未訪問に初期化
  for (const beat of beats) {
    visited.set(beat.id, 0);
  }

  /**
   * DFSでサイクルを検出する
   * @param beatId 現在のビートID
   * @returns サイクルが検出された場合true
   */
  function dfs(beatId: string): boolean {
    const state = visited.get(beatId);
    if (state === undefined) {
      // 存在しないビートIDへの参照 -- 循環ではない
      return false;
    }

    if (state === 1) {
      // 再帰スタック上に再遭遇 = サイクル検出
      return true;
    }

    if (state === 2) {
      // 既に完了したノード -- 再訪不要
      return false;
    }

    // 訪問中に設定
    visited.set(beatId, 1);

    const beat = beatMap.get(beatId);
    if (beat?.preconditionBeatIds) {
      for (const preconditionId of beat.preconditionBeatIds) {
        if (dfs(preconditionId)) {
          return true;
        }
      }
    }

    // 訪問完了
    visited.set(beatId, 2);
    return false;
  }

  // 全ビートを起点としてDFSを実行
  for (const beat of beats) {
    if (visited.get(beat.id) === 0) {
      if (dfs(beat.id)) {
        return true;
      }
    }
  }

  return false;
}
