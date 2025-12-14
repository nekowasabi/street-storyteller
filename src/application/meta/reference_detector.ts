import { join, relative, toFileUrl } from "@std/path";
import type { BindingDefinition } from "./binding_loader.ts";
import { loadBindingFile } from "./binding_loader.ts";

type FrontmatterLike = {
  readonly characters?: readonly string[];
  readonly settings?: readonly string[];
};

export interface DetectedEntity {
  readonly kind: "character" | "setting";
  readonly id: string;
  readonly exportName: string;
  readonly filePath: string;
  readonly matchedPatterns: readonly string[];
  readonly patternMatches?: Record<
    string,
    { occurrences: number; confidence: number }
  >;
  readonly occurrences: number;
  readonly confidence: number;
}

export interface DetectionResult {
  readonly characters: DetectedEntity[];
  readonly settings: DetectedEntity[];
  readonly confidence: number;
}

type LoadedEntity = {
  readonly kind: DetectedEntity["kind"];
  readonly id: string;
  readonly name: string;
  readonly exportName: string;
  readonly filePath: string;
  readonly displayNames?: readonly string[];
  readonly aliases?: readonly string[];
  readonly pronouns?: readonly string[];
  readonly detectionHints?: {
    readonly commonPatterns?: readonly string[];
    readonly excludePatterns?: readonly string[];
    readonly confidence?: number;
  };
  readonly binding?: BindingDefinition;
};

export class ReferenceDetector {
  async detect(
    content: string,
    frontmatter: FrontmatterLike,
    projectPath: string,
  ): Promise<DetectionResult> {
    const [characters, settings] = await Promise.all([
      loadEntities(
        join(projectPath, "src/characters"),
        projectPath,
        "character",
      ),
      loadEntities(join(projectPath, "src/settings"), projectPath, "setting"),
    ]);

    const byCharacterId = new Map<string, LoadedEntity>();
    for (const entity of characters) {
      byCharacterId.set(entity.id, entity);
    }
    const bySettingId = new Map<string, LoadedEntity>();
    for (const entity of settings) {
      bySettingId.set(entity.id, entity);
    }

    const missingCharacters = (frontmatter.characters ?? []).filter((id) =>
      !byCharacterId.has(id)
    );
    const missingSettings = (frontmatter.settings ?? []).filter((id) =>
      !bySettingId.has(id)
    );

    if (missingCharacters.length > 0 || missingSettings.length > 0) {
      const parts: string[] = [];
      if (missingCharacters.length > 0) {
        parts.push(`characters: ${missingCharacters.join(", ")}`);
      }
      if (missingSettings.length > 0) {
        parts.push(`settings: ${missingSettings.join(", ")}`);
      }
      throw new Error(`Unknown frontmatter references: ${parts.join("; ")}`);
    }

    const body = stripFrontmatter(content);

    const detectedCharacters = mergeDetections(
      detectByPatterns(body, characters),
      detectFromFrontmatter(frontmatter.characters ?? [], byCharacterId),
    );

    const detectedSettings = mergeDetections(
      detectByPatterns(body, settings),
      detectFromFrontmatter(frontmatter.settings ?? [], bySettingId),
    );

    const confidence = calculateOverallConfidence([
      ...detectedCharacters,
      ...detectedSettings,
    ]);

    return {
      characters: detectedCharacters,
      settings: detectedSettings,
      confidence,
    };
  }
}

function stripFrontmatter(content: string): string {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return content;
  }

  const lines = content.split("\n");
  if (lines.length === 0 || lines[0]?.trim() !== "---") {
    return content;
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return content;
  }

  return lines.slice(endIndex + 1).join("\n");
}

function detectByPatterns(
  body: string,
  entities: readonly LoadedEntity[],
): DetectedEntity[] {
  const detected: DetectedEntity[] = [];

  for (const entity of entities) {
    const match = detectEntityMatches(body, entity);
    if (!match) {
      continue;
    }

    detected.push({
      kind: entity.kind,
      id: entity.id,
      exportName: entity.exportName,
      filePath: entity.filePath,
      matchedPatterns: match.matchedPatterns,
      patternMatches: match.patternMatches,
      occurrences: match.occurrences,
      confidence: match.confidence,
    });
  }

  return detected;
}

function detectFromFrontmatter(
  ids: readonly string[],
  registry: Map<string, LoadedEntity>,
): DetectedEntity[] {
  const detected: DetectedEntity[] = [];

  for (const id of ids) {
    const entity = registry.get(id);
    if (!entity) {
      continue;
    }
    const patterns = defaultPatternsForEntity(entity);
    detected.push({
      kind: entity.kind,
      id: entity.id,
      exportName: entity.exportName,
      filePath: entity.filePath,
      matchedPatterns: patterns,
      patternMatches: patternsToMatches(entity, patterns),
      occurrences: 0,
      confidence: 1.0,
    });
  }

  return detected;
}

function mergeDetections(
  bodyDetections: readonly DetectedEntity[],
  frontmatterDetections: readonly DetectedEntity[],
): DetectedEntity[] {
  const merged = new Map<string, DetectedEntity>();

  for (const entity of frontmatterDetections) {
    merged.set(entity.id, entity);
  }

  for (const entity of bodyDetections) {
    const existing = merged.get(entity.id);
    if (!existing) {
      merged.set(entity.id, entity);
      continue;
    }
    const mergedPatterns = Array.from(
      new Set([...existing.matchedPatterns, ...entity.matchedPatterns]),
    );
    const mergedPatternMatches = mergePatternMatches(
      existing.patternMatches,
      entity.patternMatches,
    );
    merged.set(entity.id, {
      ...existing,
      matchedPatterns: mergedPatterns,
      patternMatches: mergedPatternMatches,
      occurrences: existing.occurrences + entity.occurrences,
      confidence: Math.max(existing.confidence, entity.confidence),
    });
  }

  return Array.from(merged.values());
}

function calculateOverallConfidence(
  entities: readonly DetectedEntity[],
): number {
  if (entities.length === 0) {
    return 0;
  }
  const total = entities.reduce((sum, entity) => sum + entity.confidence, 0);
  return total / entities.length;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) {
    return 0;
  }
  let count = 0;
  let index = 0;
  while (true) {
    const found = haystack.indexOf(needle, index);
    if (found === -1) {
      break;
    }
    count += 1;
    index = found + needle.length;
  }
  return count;
}

function detectEntityMatches(
  body: string,
  entity: LoadedEntity,
): {
  matchedPatterns: string[];
  patternMatches: Record<string, { occurrences: number; confidence: number }>;
  occurrences: number;
  confidence: number;
} | null {
  const candidates: { pattern: string; confidence: number }[] = [];

  if (entity.name) {
    candidates.push({ pattern: entity.name, confidence: 1.0 });
  }

  for (const displayName of entity.displayNames ?? []) {
    candidates.push({ pattern: displayName, confidence: 0.9 });
  }

  for (const alias of entity.aliases ?? []) {
    candidates.push({ pattern: alias, confidence: 0.8 });
  }

  for (const pronoun of entity.pronouns ?? []) {
    candidates.push({ pattern: pronoun, confidence: 0.6 });
  }

  for (const hint of entity.detectionHints?.commonPatterns ?? []) {
    const confidence = typeof entity.detectionHints?.confidence === "number"
      ? entity.detectionHints.confidence
      : 0.9;
    candidates.push({
      pattern: hint,
      confidence: Math.min(1.0, Math.max(0.0, confidence)),
    });
  }

  for (const pattern of entity.binding?.patterns ?? []) {
    candidates.push({ pattern: pattern.text, confidence: pattern.confidence });
  }

  const excludePatterns = [
    ...(entity.detectionHints?.excludePatterns ?? []),
    ...(entity.binding?.excludePatterns ?? []),
  ];

  const candidateConfidence = new Map<string, number>();
  for (const candidate of candidates) {
    if (!candidate.pattern) {
      continue;
    }
    const existing = candidateConfidence.get(candidate.pattern) ?? 0;
    candidateConfidence.set(
      candidate.pattern,
      Math.max(existing, candidate.confidence),
    );
  }

  const patternMatches: Record<
    string,
    { occurrences: number; confidence: number }
  > = {};
  const matchedPatterns: string[] = [];
  let totalOccurrences = 0;
  let bestConfidence = 0;

  for (const [pattern, confidence] of candidateConfidence) {
    let occurrences = countOccurrences(body, pattern);
    if (occurrences <= 0) {
      continue;
    }

    for (const exclude of excludePatterns) {
      if (!exclude || !exclude.includes(pattern)) {
        continue;
      }
      occurrences -= countOccurrences(body, exclude);
    }

    if (occurrences <= 0) {
      continue;
    }

    matchedPatterns.push(pattern);
    patternMatches[pattern] = { occurrences, confidence };
    totalOccurrences += occurrences;
    bestConfidence = Math.max(bestConfidence, confidence);
  }

  if (matchedPatterns.length === 0) {
    return null;
  }

  return {
    matchedPatterns,
    patternMatches,
    occurrences: totalOccurrences,
    confidence: bestConfidence,
  };
}

function defaultPatternsForEntity(entity: LoadedEntity): string[] {
  const patterns: string[] = [];

  if (entity.displayNames && entity.displayNames.length > 0) {
    patterns.push(...entity.displayNames);
  } else if (entity.name) {
    patterns.push(entity.name);
  }

  if (entity.aliases && entity.aliases.length > 0) {
    patterns.push(...entity.aliases);
  }

  for (const pattern of entity.binding?.patterns ?? []) {
    patterns.push(pattern.text);
  }

  return Array.from(new Set(patterns)).filter((pattern) => pattern.length > 0);
}

function patternsToMatches(
  entity: LoadedEntity,
  patterns: readonly string[],
): Record<string, { occurrences: number; confidence: number }> {
  const matches: Record<string, { occurrences: number; confidence: number }> =
    {};
  const confidenceByPattern = new Map<string, number>();

  if (entity.name) {
    confidenceByPattern.set(entity.name, 1.0);
  }
  for (const displayName of entity.displayNames ?? []) {
    confidenceByPattern.set(
      displayName,
      Math.max(confidenceByPattern.get(displayName) ?? 0, 0.9),
    );
  }
  for (const alias of entity.aliases ?? []) {
    confidenceByPattern.set(
      alias,
      Math.max(confidenceByPattern.get(alias) ?? 0, 0.8),
    );
  }

  for (const pattern of entity.binding?.patterns ?? []) {
    confidenceByPattern.set(
      pattern.text,
      Math.max(confidenceByPattern.get(pattern.text) ?? 0, pattern.confidence),
    );
  }

  for (const pattern of patterns) {
    matches[pattern] = {
      occurrences: 0,
      confidence: confidenceByPattern.get(pattern) ?? 1.0,
    };
  }

  return matches;
}

function mergePatternMatches(
  a: Record<string, { occurrences: number; confidence: number }> | undefined,
  b: Record<string, { occurrences: number; confidence: number }> | undefined,
): Record<string, { occurrences: number; confidence: number }> | undefined {
  if (!a && !b) {
    return undefined;
  }
  const merged: Record<string, { occurrences: number; confidence: number }> =
    {};

  for (const [pattern, match] of Object.entries(a ?? {})) {
    merged[pattern] = { ...match };
  }
  for (const [pattern, match] of Object.entries(b ?? {})) {
    const existing = merged[pattern];
    if (!existing) {
      merged[pattern] = { ...match };
      continue;
    }
    merged[pattern] = {
      occurrences: existing.occurrences + match.occurrences,
      confidence: Math.max(existing.confidence, match.confidence),
    };
  }

  return merged;
}

async function loadEntities(
  dirPath: string,
  projectRoot: string,
  kind: LoadedEntity["kind"],
): Promise<LoadedEntity[]> {
  const entities: LoadedEntity[] = [];
  try {
    for await (const entry of Deno.readDir(dirPath)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) {
        continue;
      }
      const absPath = join(dirPath, entry.name);
      const mod = await import(toFileUrl(absPath).href);
      for (const [exportName, value] of Object.entries(mod)) {
        const parsed = parseEntity(value);
        if (!parsed) {
          continue;
        }
        const bindingPath = join(dirPath, `${parsed.id}.binding.yaml`);
        const binding = await loadBindingFile(bindingPath);
        entities.push({
          kind,
          id: parsed.id,
          name: parsed.name,
          exportName,
          filePath: toProjectRelativePath(projectRoot, absPath),
          displayNames: parsed.displayNames,
          aliases: parsed.aliases,
          pronouns: parsed.pronouns,
          detectionHints: parsed.detectionHints,
          binding: binding ?? undefined,
        });
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return [];
    }
    throw error;
  }

  return entities;
}

function parseEntity(value: unknown): {
  readonly id: string;
  readonly name: string;
  readonly displayNames?: readonly string[];
  readonly aliases?: readonly string[];
  readonly pronouns?: readonly string[];
  readonly detectionHints?: {
    readonly commonPatterns?: readonly string[];
    readonly excludePatterns?: readonly string[];
    readonly confidence?: number;
  };
} | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const id = record.id;
  const name = record.name;
  if (typeof id !== "string" || typeof name !== "string") {
    return null;
  }

  const displayNames = arrayOfStrings(record.displayNames);
  const aliases = arrayOfStrings(record.aliases);
  const pronouns = arrayOfStrings(record.pronouns);

  const detectionHintsRaw = record.detectionHints;
  const detectionHintsRecord = detectionHintsRaw &&
      typeof detectionHintsRaw === "object"
    ? (detectionHintsRaw as Record<string, unknown>)
    : null;
  const detectionHints = detectionHintsRecord
    ? {
      commonPatterns: arrayOfStrings(detectionHintsRecord["commonPatterns"]) ??
        undefined,
      excludePatterns:
        arrayOfStrings(detectionHintsRecord["excludePatterns"]) ?? undefined,
      confidence: typeof detectionHintsRecord["confidence"] === "number"
        ? detectionHintsRecord["confidence"]
        : undefined,
    }
    : undefined;

  return {
    id,
    name,
    displayNames: displayNames ?? undefined,
    aliases: aliases ?? undefined,
    pronouns: pronouns ?? undefined,
    detectionHints,
  };
}

function arrayOfStrings(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string") {
      result.push(entry);
    }
  }
  return result;
}

function toProjectRelativePath(projectRoot: string, absPath: string): string {
  let relPath = relative(projectRoot, absPath);
  relPath = relPath.replaceAll("\\", "/");
  return relPath;
}
