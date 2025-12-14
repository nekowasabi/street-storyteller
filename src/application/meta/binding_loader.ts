import { parse } from "@std/yaml";

export type BindingPattern = {
  readonly text: string;
  readonly confidence: number;
};

export type BindingDefinition = {
  readonly patterns: readonly BindingPattern[];
  readonly excludePatterns: readonly string[];
};

function clampConfidence(value: number): number {
  if (Number.isNaN(value)) return 0.0;
  return Math.min(1.0, Math.max(0.0, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function parsePatterns(raw: unknown): BindingPattern[] {
  if (!Array.isArray(raw)) {
    throw new Error(`Invalid binding.yaml: patterns must be an array`);
  }

  const patterns: BindingPattern[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) {
      throw new Error(`Invalid binding.yaml: patterns entries must be objects`);
    }
    const text = entry.text;
    if (typeof text !== "string" || text.trim().length === 0) {
      throw new Error(`Invalid binding.yaml: patterns[].text must be a string`);
    }
    const confidenceRaw = entry.confidence;
    const confidence = typeof confidenceRaw === "number"
      ? clampConfidence(confidenceRaw)
      : 0.95;
    patterns.push({ text, confidence });
  }

  return patterns;
}

function parseLegacyReferences(raw: unknown): BindingPattern[] {
  if (!Array.isArray(raw)) {
    throw new Error(`Invalid binding.yaml: references must be an array`);
  }

  const patterns: BindingPattern[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) {
      continue;
    }
    const text = entry.pattern;
    if (typeof text !== "string" || text.trim().length === 0) {
      continue;
    }
    const confidenceRaw = entry.confidence;
    const confidence = typeof confidenceRaw === "number"
      ? clampConfidence(confidenceRaw)
      : 0.95;
    patterns.push({ text, confidence });
  }

  return patterns;
}

function parseExcludePatterns(raw: unknown): string[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    throw new Error(`Invalid binding.yaml: excludePatterns must be an array`);
  }
  const patterns: string[] = [];
  for (const entry of raw) {
    if (typeof entry === "string" && entry.trim().length > 0) {
      patterns.push(entry);
    }
  }
  return patterns;
}

/**
 * Loads a `*.binding.yaml` file.
 *
 * - Returns `null` when the file does not exist.
 * - Throws when the file exists but is invalid (YAML parse or schema error).
 */
export async function loadBindingFile(
  bindingPath: string,
): Promise<BindingDefinition | null> {
  let text: string;
  try {
    text = await Deno.readTextFile(bindingPath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }
    throw new Error(`Failed to read binding file: ${bindingPath}`, {
      cause: error,
    });
  }

  let data: unknown;
  try {
    data = parse(text);
  } catch (error) {
    throw new Error(`Failed to parse YAML: ${bindingPath}`, { cause: error });
  }

  if (!isRecord(data)) {
    throw new Error(`Invalid binding.yaml: expected a mapping at root`);
  }

  // Current (MVP) schema:
  //   version: 1
  //   patterns: [{ text, confidence? }]
  //   excludePatterns?: string[]
  //
  // Legacy sample schema (kept for backward compatibility):
  //   references: [{ pattern, confidence? }]
  const version = data.version;
  const hasNewSchema = version === 1 && data.patterns !== undefined;
  const hasLegacySchema = version === undefined &&
    data.references !== undefined;

  const patterns = hasNewSchema
    ? parsePatterns(data.patterns)
    : hasLegacySchema
    ? parseLegacyReferences(data.references)
    : null;

  if (!patterns) {
    throw new Error(
      `Invalid binding.yaml: unsupported schema in ${bindingPath} (expected version: 1 + patterns[], or legacy references[])`,
    );
  }

  const excludePatterns = parseExcludePatterns(data.excludePatterns);

  return { patterns, excludePatterns };
}
