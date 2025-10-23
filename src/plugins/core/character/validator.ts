/**
 * Character要素のバリデーター
 */

import type { Character, CharacterRole } from "../../../type/v2/character.ts";
import type { ValidationError, ValidationResult } from "../../../core/plugin_system.ts";

/**
 * Characterを検証する
 *
 * @param element 検証対象の要素
 * @returns 検証結果
 */
export function validateCharacter(element: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof element !== "object" || element === null) {
    return {
      valid: false,
      errors: [{ field: "root", message: "Character must be an object" }],
    };
  }

  const char = element as Partial<Character>;

  // id検証
  if (!char.id || typeof char.id !== "string" || char.id.trim() === "") {
    errors.push({ field: "id", message: "id is required and must be a non-empty string" });
  }

  // name検証
  if (!char.name || typeof char.name !== "string" || char.name.trim() === "") {
    errors.push({ field: "name", message: "name is required and must be a non-empty string" });
  }

  // role検証
  const validRoles: CharacterRole[] = ["protagonist", "antagonist", "supporting", "guest"];
  if (!char.role || !validRoles.includes(char.role)) {
    errors.push({
      field: "role",
      message: `role must be one of: ${validRoles.join(", ")}`,
    });
  }

  // traits検証
  if (!Array.isArray(char.traits)) {
    errors.push({ field: "traits", message: "traits must be an array" });
  }

  // relationships検証
  if (typeof char.relationships !== "object" || char.relationships === null) {
    errors.push({ field: "relationships", message: "relationships must be an object" });
  }

  // appearingChapters検証
  if (!Array.isArray(char.appearingChapters)) {
    errors.push({ field: "appearingChapters", message: "appearingChapters must be an array" });
  }

  // summary検証
  if (!char.summary || typeof char.summary !== "string" || char.summary.trim() === "") {
    errors.push({ field: "summary", message: "summary is required and must be a non-empty string" });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
