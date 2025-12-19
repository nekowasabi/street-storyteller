/**
 * Setting Validator
 *
 * Setting要素の検証を行う
 */

import type {
  ValidationError,
  ValidationResult,
} from "@storyteller/core/plugin_system.ts";
import type { SettingType } from "@storyteller/types/v2/setting.ts";

const VALID_SETTING_TYPES: SettingType[] = [
  "location",
  "world",
  "culture",
  "organization",
];

/**
 * Setting要素を検証する
 *
 * @param element 検証対象
 * @returns 検証結果
 */
export function validateSetting(element: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // null/undefinedチェック
  if (
    element === null || element === undefined || typeof element !== "object"
  ) {
    return {
      valid: false,
      errors: [{ field: "root", message: "Setting must be an object" }],
    };
  }

  const setting = element as Record<string, unknown>;

  // 必須フィールドのチェック
  if (!setting.id || typeof setting.id !== "string") {
    errors.push({
      field: "id",
      message: "id is required and must be a string",
    });
  }

  if (!setting.name || typeof setting.name !== "string") {
    errors.push({
      field: "name",
      message: "name is required and must be a string",
    });
  }

  if (!setting.type || typeof setting.type !== "string") {
    errors.push({
      field: "type",
      message: "type is required and must be a string",
    });
  } else if (!VALID_SETTING_TYPES.includes(setting.type as SettingType)) {
    errors.push({
      field: "type",
      message: `type must be one of: ${VALID_SETTING_TYPES.join(", ")}`,
    });
  }

  if (!setting.summary || typeof setting.summary !== "string") {
    errors.push({
      field: "summary",
      message: "summary is required and must be a string",
    });
  }

  if (!Array.isArray(setting.appearingChapters)) {
    errors.push({
      field: "appearingChapters",
      message: "appearingChapters is required and must be an array",
    });
  }

  // オプショナルフィールドの検証（存在する場合のみ）
  if (
    setting.displayNames !== undefined && !Array.isArray(setting.displayNames)
  ) {
    errors.push({
      field: "displayNames",
      message: "displayNames must be an array of strings",
    });
  }

  if (
    setting.relatedSettings !== undefined &&
    !Array.isArray(setting.relatedSettings)
  ) {
    errors.push({
      field: "relatedSettings",
      message: "relatedSettings must be an array of strings",
    });
  }

  if (setting.details !== undefined && typeof setting.details !== "object") {
    errors.push({
      field: "details",
      message: "details must be an object",
    });
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
