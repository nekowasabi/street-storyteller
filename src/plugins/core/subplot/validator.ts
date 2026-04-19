/**
 * Subplot要素のバリデーター
 *
 * Subplot型の検証ロジックを提供する。
 * 必須フィールド、値ドメイン、ビート間因果関係の整合性を検証する。
 */

import type {
  FocusCharacter,
  PlotBeat,
  PlotImportance,
  PlotType,
  Subplot,
} from "@storyteller/types/v2/subplot.ts";
import type {
  ValidationError,
  ValidationResult,
} from "@storyteller/core/plugin_system.ts";

/**
 * 有効なプロットタイプ
 */
const validPlotTypes: PlotType[] = [
  "main",
  "subplot",
  "parallel",
  "background",
];

/**
 * 有効な重要度
 */
const validImportances: PlotImportance[] = [
  "major",
  "minor",
  "supporting",
];

/**
 * 有効な構造位置
 */
const validStructurePositions = [
  "setup",
  "inciting_incident",
  "rising",
  "climax",
  "falling",
  "resolution",
];

/**
 * 有効なフォーカスキャラクター重み
 */
const validWeights: FocusCharacter["weight"][] = [
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
    !validPlotTypes.includes(subplot.type as PlotType)
  ) {
    errors.push({
      field: "type",
      message: `type must be one of: ${validPlotTypes.join(", ")}`,
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

  // focusCharacters検証
  if (!Array.isArray(subplot.focusCharacters)) {
    errors.push({
      field: "focusCharacters",
      message: "focusCharacters is required and must be an array",
    });
  } else if (subplot.focusCharacters.length === 0) {
    errors.push({
      field: "focusCharacters",
      message: "focusCharacters must contain at least one character",
    });
  } else {
    subplot.focusCharacters.forEach((fc, index) => {
      const fcErrors = validateFocusCharacter(fc, index);
      errors.push(...fcErrors);
    });
  }

  // importance検証（オプション）
  if (
    subplot.importance !== undefined &&
    !validImportances.includes(subplot.importance as PlotImportance)
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

  // chapter検証
  if (!b.chapter || typeof b.chapter !== "string" || b.chapter.trim() === "") {
    errors.push({
      field: `${prefix}.chapter`,
      message: `${prefix}.chapter is required and must be a non-empty string`,
    });
  }

  // characters検証
  if (!Array.isArray(b.characters)) {
    errors.push({
      field: `${prefix}.characters`,
      message: `${prefix}.characters is required and must be an array`,
    });
  }

  // settings検証
  if (!Array.isArray(b.settings)) {
    errors.push({
      field: `${prefix}.settings`,
      message: `${prefix}.settings is required and must be an array`,
    });
  }

  // structurePosition検証（オプション）
  if (
    b.structurePosition !== undefined &&
    typeof b.structurePosition === "string" &&
    b.structurePosition.trim() !== "" &&
    !validStructurePositions.includes(b.structurePosition)
  ) {
    errors.push({
      field: `${prefix}.structurePosition`,
      message: `${prefix}.structurePosition must be one of: ${
        validStructurePositions.join(", ")
      }`,
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
 * FocusCharacterを検証する
 *
 * @param fc 検証対象のフォーカスキャラクター
 * @param index インデックス（エラーメッセージ用）
 * @returns 検証エラーのリスト
 */
function validateFocusCharacter(
  fc: unknown,
  index: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `focusCharacters[${index}]`;

  if (typeof fc !== "object" || fc === null) {
    return [{ field: prefix, message: `${prefix} must be an object` }];
  }

  const f = fc as Partial<FocusCharacter>;

  // characterId検証
  if (
    !f.characterId || typeof f.characterId !== "string" ||
    f.characterId.trim() === ""
  ) {
    errors.push({
      field: `${prefix}.characterId`,
      message:
        `${prefix}.characterId is required and must be a non-empty string`,
    });
  }

  // weight検証
  if (
    !f.weight || !validWeights.includes(f.weight as FocusCharacter["weight"])
  ) {
    errors.push({
      field: `${prefix}.weight`,
      message: `${prefix}.weight must be one of: ${validWeights.join(", ")}`,
    });
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
