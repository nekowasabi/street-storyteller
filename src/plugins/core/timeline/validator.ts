/**
 * Timeline要素のバリデーター
 */

import type {
  Timeline,
  TimelineScope,
  TimelineEvent,
  EventCategory,
} from "../../../type/v2/timeline.ts";
import type {
  ValidationError,
  ValidationResult,
} from "../../../core/plugin_system.ts";

/**
 * 有効なスコープ
 */
const validScopes: TimelineScope[] = ["story", "world", "character", "arc"];

/**
 * 有効なイベントカテゴリ
 */
const validCategories: EventCategory[] = [
  "plot_point",
  "character_event",
  "world_event",
  "backstory",
  "foreshadow",
  "climax",
  "resolution",
];

/**
 * Timelineを検証する
 *
 * @param element 検証対象の要素
 * @returns 検証結果
 */
export function validateTimeline(element: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (typeof element !== "object" || element === null) {
    return {
      valid: false,
      errors: [{ field: "root", message: "Timeline must be an object" }],
    };
  }

  const timeline = element as Partial<Timeline>;

  // id検証
  if (
    !timeline.id || typeof timeline.id !== "string" || timeline.id.trim() === ""
  ) {
    errors.push({
      field: "id",
      message: "id is required and must be a non-empty string",
    });
  }

  // name検証
  if (
    !timeline.name || typeof timeline.name !== "string" ||
    timeline.name.trim() === ""
  ) {
    errors.push({
      field: "name",
      message: "name is required and must be a non-empty string",
    });
  }

  // scope検証
  if (!timeline.scope || !validScopes.includes(timeline.scope)) {
    errors.push({
      field: "scope",
      message: `scope must be one of: ${validScopes.join(", ")}`,
    });
  }

  // summary検証
  if (
    !timeline.summary || typeof timeline.summary !== "string" ||
    timeline.summary.trim() === ""
  ) {
    errors.push({
      field: "summary",
      message: "summary is required and must be a non-empty string",
    });
  }

  // events検証
  if (!Array.isArray(timeline.events)) {
    errors.push({
      field: "events",
      message: "events must be an array",
    });
  } else {
    // 各イベントを検証
    timeline.events.forEach((event, index) => {
      const eventErrors = validateTimelineEvent(event, index);
      errors.push(...eventErrors);
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * TimelineEventを検証する
 *
 * @param event 検証対象のイベント
 * @param index イベントのインデックス（エラーメッセージ用）
 * @returns 検証エラーのリスト
 */
function validateTimelineEvent(
  event: unknown,
  index: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `events[${index}]`;

  if (typeof event !== "object" || event === null) {
    return [{ field: prefix, message: `${prefix} must be an object` }];
  }

  const ev = event as Partial<TimelineEvent>;

  // id検証
  if (!ev.id || typeof ev.id !== "string" || ev.id.trim() === "") {
    errors.push({
      field: `${prefix}.id`,
      message: `${prefix}.id is required and must be a non-empty string`,
    });
  }

  // title検証
  if (!ev.title || typeof ev.title !== "string" || ev.title.trim() === "") {
    errors.push({
      field: `${prefix}.title`,
      message: `${prefix}.title is required and must be a non-empty string`,
    });
  }

  // category検証
  if (!ev.category || !validCategories.includes(ev.category)) {
    errors.push({
      field: `${prefix}.category`,
      message: `${prefix}.category must be one of: ${validCategories.join(", ")}`,
    });
  }

  // time検証
  if (!ev.time || typeof ev.time !== "object") {
    errors.push({
      field: `${prefix}.time`,
      message: `${prefix}.time is required and must be an object`,
    });
  } else if (typeof ev.time.order !== "number") {
    errors.push({
      field: `${prefix}.time.order`,
      message: `${prefix}.time.order is required and must be a number`,
    });
  }

  // summary検証
  if (!ev.summary || typeof ev.summary !== "string" || ev.summary.trim() === "") {
    errors.push({
      field: `${prefix}.summary`,
      message: `${prefix}.summary is required and must be a non-empty string`,
    });
  }

  // characters検証
  if (!Array.isArray(ev.characters)) {
    errors.push({
      field: `${prefix}.characters`,
      message: `${prefix}.characters must be an array`,
    });
  }

  // settings検証
  if (!Array.isArray(ev.settings)) {
    errors.push({
      field: `${prefix}.settings`,
      message: `${prefix}.settings must be an array`,
    });
  }

  // chapters検証
  if (!Array.isArray(ev.chapters)) {
    errors.push({
      field: `${prefix}.chapters`,
      message: `${prefix}.chapters must be an array`,
    });
  }

  // オプショナルフィールドの検証
  if (ev.causedBy !== undefined && !Array.isArray(ev.causedBy)) {
    errors.push({
      field: `${prefix}.causedBy`,
      message: `${prefix}.causedBy must be an array if provided`,
    });
  }

  if (ev.causes !== undefined && !Array.isArray(ev.causes)) {
    errors.push({
      field: `${prefix}.causes`,
      message: `${prefix}.causes must be an array if provided`,
    });
  }

  return errors;
}
