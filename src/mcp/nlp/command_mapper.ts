/**
 * Command mapper (MVP)
 * インテントをMCPツール名にマッピングし、引数を正規化する
 */

import type { Intent } from "./intent_analyzer.ts";

const SUPPORTED_TOOLS: ReadonlySet<string> = new Set([
  "meta_check",
  "meta_generate",
  "element_create",
  "view_browser",
  "lsp_validate",
  "lsp_find_references",
]);

function toCamelCase(key: string): string {
  // snake_case / kebab-case を camelCase に変換
  return key.replace(/[-_]+([a-zA-Z0-9])/g, (_, c: string) => c.toUpperCase());
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      out[toCamelCase(k)] = normalizeValue(v);
    }
    return out;
  }
  return value;
}

export class CommandMapper {
  mapToTool(intent: Intent): string | null {
    return SUPPORTED_TOOLS.has(intent.action) ? intent.action : null;
  }

  normalizeParams(intent: Intent): Record<string, unknown> {
    const normalized = normalizeValue(intent.params);
    return (normalized && typeof normalized === "object")
      ? normalized as Record<string, unknown>
      : {};
  }
}
