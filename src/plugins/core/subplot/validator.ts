/**
 * Subplot要素のバリデーター
 */

import type { PlotType, Subplot } from "@storyteller/types/v2/subplot.ts";
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
    !subplot.id || typeof subplot.id !== "string" || subplot.id.trim() === ""
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
      message: "beats must be an array",
    });
  }

  // focusCharacters検証
  if (!Array.isArray(subplot.focusCharacters)) {
    errors.push({
      field: "focusCharacters",
      message: "focusCharacters must be an array",
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * ビート間の前提条件の循環参照を検出する
 *
 * @param beats ビートのリスト
 * @returns 循環参照がある場合、エラーのリストを返す
 */
export function detectBeatPreconditionCycles(
  beats: { id: string; preconditionBeatIds?: string[] }[],
): ValidationError[] {
  const errors: ValidationError[] = [];
  const beatMap = new Map(beats.map((b) => [b.id, b]));

  /**
   * 深さ優先探索でサイクルを検出する
   * visiting: 現在のDFSパス上にあるノード（循環検出用）
   * visited: 探索完了したノード（再計算防止用）
   */
  function hasCycleFrom(
    beatId: string,
    visiting: Set<string>,
    visited: Set<string>,
  ): boolean {
    if (visited.has(beatId)) return false;
    if (visiting.has(beatId)) return true;

    visiting.add(beatId);
    const beat = beatMap.get(beatId);
    if (beat?.preconditionBeatIds) {
      for (const preId of beat.preconditionBeatIds) {
        if (beatMap.has(preId) && hasCycleFrom(preId, visiting, visited)) {
          return true;
        }
      }
    }
    visiting.delete(beatId);
    visited.add(beatId);
    return false;
  }

  const visited = new Set<string>();
  for (const beat of beats) {
    if (hasCycleFrom(beat.id, new Set(), visited)) {
      errors.push({
        field: `beats[${beat.id}].preconditionBeatIds`,
        message:
          `Circular precondition dependency detected involving beat: ${beat.id}`,
      });
      break;
    }
  }

  return errors;
}
