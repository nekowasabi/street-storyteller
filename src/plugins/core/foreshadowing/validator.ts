/**
 * Foreshadowing要素のバリデーター
 */

import type {
  Foreshadowing,
  ForeshadowingStatus,
  ForeshadowingType,
  ResolutionInfo,
} from "@storyteller/types/v2/foreshadowing.ts";
import type {
  ValidationError,
  ValidationResult,
} from "@storyteller/core/plugin_system.ts";

/**
 * 有効なタイプ
 */
const validTypes: ForeshadowingType[] = [
  "hint",
  "prophecy",
  "mystery",
  "symbol",
  "chekhov",
  "red_herring",
];

/**
 * 有効なステータス
 */
const validStatuses: ForeshadowingStatus[] = [
  "planted",
  "partially_resolved",
  "resolved",
  "abandoned",
];

/**
 * Foreshadowingを検証する
 *
 * @param element 検証対象の要素
 * @returns 検証結果
 */
export function validateForeshadowing(element: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof element !== "object" || element === null) {
    return {
      valid: false,
      errors: [{ field: "root", message: "Foreshadowing must be an object" }],
    };
  }

  const foreshadowing = element as Partial<Foreshadowing>;

  // id検証
  if (
    !foreshadowing.id || typeof foreshadowing.id !== "string" ||
    foreshadowing.id.trim() === ""
  ) {
    errors.push({
      field: "id",
      message: "id is required and must be a non-empty string",
    });
  }

  // name検証
  if (
    !foreshadowing.name || typeof foreshadowing.name !== "string" ||
    foreshadowing.name.trim() === ""
  ) {
    errors.push({
      field: "name",
      message: "name is required and must be a non-empty string",
    });
  }

  // type検証
  if (
    !foreshadowing.type ||
    !validTypes.includes(foreshadowing.type as ForeshadowingType)
  ) {
    errors.push({
      field: "type",
      message: `type must be one of: ${validTypes.join(", ")}`,
    });
  }

  // summary検証
  if (
    !foreshadowing.summary || typeof foreshadowing.summary !== "string" ||
    foreshadowing.summary.trim() === ""
  ) {
    errors.push({
      field: "summary",
      message: "summary is required and must be a non-empty string",
    });
  }

  // planting検証
  if (!foreshadowing.planting || typeof foreshadowing.planting !== "object") {
    errors.push({
      field: "planting",
      message: "planting is required and must be an object",
    });
  } else {
    // planting.chapter検証
    if (
      !foreshadowing.planting.chapter ||
      typeof foreshadowing.planting.chapter !== "string" ||
      foreshadowing.planting.chapter.trim() === ""
    ) {
      errors.push({
        field: "planting.chapter",
        message: "planting.chapter is required and must be a non-empty string",
      });
    }

    // planting.description検証
    if (
      !foreshadowing.planting.description ||
      typeof foreshadowing.planting.description !== "string" ||
      foreshadowing.planting.description.trim() === ""
    ) {
      errors.push({
        field: "planting.description",
        message:
          "planting.description is required and must be a non-empty string",
      });
    }
  }

  // status検証
  if (
    !foreshadowing.status ||
    !validStatuses.includes(foreshadowing.status as ForeshadowingStatus)
  ) {
    errors.push({
      field: "status",
      message: `status must be one of: ${validStatuses.join(", ")}`,
    });
  }

  // resolved/partially_resolvedの場合、resolutionsが必要
  if (
    foreshadowing.status === "resolved" ||
    foreshadowing.status === "partially_resolved"
  ) {
    if (
      !foreshadowing.resolutions || !Array.isArray(foreshadowing.resolutions) ||
      foreshadowing.resolutions.length === 0
    ) {
      errors.push({
        field: "resolutions",
        message:
          `resolutions is required when status is ${foreshadowing.status}`,
      });
    } else {
      // 各resolutionを検証
      foreshadowing.resolutions.forEach((resolution, index) => {
        const resolutionErrors = validateResolutionInfo(resolution, index);
        errors.push(...resolutionErrors);
      });
    }
  }

  // resolutionsが存在する場合は検証（statusがplantedでも）
  if (foreshadowing.resolutions && Array.isArray(foreshadowing.resolutions)) {
    foreshadowing.resolutions.forEach((resolution, index) => {
      // 重複チェックを避ける（上で既に検証済みの場合）
      if (
        foreshadowing.status !== "resolved" &&
        foreshadowing.status !== "partially_resolved"
      ) {
        const resolutionErrors = validateResolutionInfo(resolution, index);
        errors.push(...resolutionErrors);
      }
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * ResolutionInfoを検証する
 *
 * @param resolution 検証対象の回収情報
 * @param index 回収情報のインデックス（エラーメッセージ用）
 * @returns 検証エラーのリスト
 */
function validateResolutionInfo(
  resolution: unknown,
  index: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `resolutions[${index}]`;

  if (typeof resolution !== "object" || resolution === null) {
    return [{ field: prefix, message: `${prefix} must be an object` }];
  }

  const res = resolution as Partial<ResolutionInfo>;

  // chapter検証
  if (
    !res.chapter || typeof res.chapter !== "string" || res.chapter.trim() === ""
  ) {
    errors.push({
      field: `${prefix}.chapter`,
      message: `${prefix}.chapter is required and must be a non-empty string`,
    });
  }

  // description検証
  if (
    !res.description || typeof res.description !== "string" ||
    res.description.trim() === ""
  ) {
    errors.push({
      field: `${prefix}.description`,
      message:
        `${prefix}.description is required and must be a non-empty string`,
    });
  }

  // completeness検証
  if (typeof res.completeness !== "number") {
    errors.push({
      field: `${prefix}.completeness`,
      message: `${prefix}.completeness is required and must be a number`,
    });
  } else if (res.completeness < 0.0 || res.completeness > 1.0) {
    errors.push({
      field: `${prefix}.completeness`,
      message: `${prefix}.completeness must be between 0.0 and 1.0`,
    });
  }

  return errors;
}
