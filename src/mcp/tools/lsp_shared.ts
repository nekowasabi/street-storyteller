/**
 * MCP LSP tool shared utilities
 */

import { isAbsolute, join, relative, toFileUrl } from "@std/path";
import { walk } from "@std/fs";
import type { DetectableEntity } from "@storyteller/lsp/detection/positioned_detector.ts";

export function resolvePath(projectRoot: string, userPath: string): string {
  return isAbsolute(userPath) ? userPath : join(projectRoot, userPath);
}

export function toProjectRelative(
  projectRoot: string,
  absPath: string,
): string {
  return relative(projectRoot, absPath).replaceAll("\\", "/");
}

function parseEntity(value: unknown): {
  readonly id: string;
  readonly name: string;
  readonly displayNames?: readonly string[];
  readonly aliases?: readonly string[];
} | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = record.id;
  const name = record.name;
  if (typeof id !== "string" || typeof name !== "string") return null;

  const displayNames = Array.isArray(record.displayNames)
    ? record.displayNames.filter((v): v is string => typeof v === "string")
    : undefined;
  const aliases = Array.isArray(record.aliases)
    ? record.aliases.filter((v): v is string => typeof v === "string")
    : undefined;

  return { id, name, displayNames, aliases };
}

async function loadEntitiesFromDir(
  projectRoot: string,
  dirAbsPath: string,
  kind: DetectableEntity["kind"],
): Promise<DetectableEntity[]> {
  const entities: DetectableEntity[] = [];
  try {
    for await (const entry of Deno.readDir(dirAbsPath)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
      const absPath = join(dirAbsPath, entry.name);
      try {
        const mod = await import(toFileUrl(absPath).href);
        for (const [, value] of Object.entries(mod)) {
          const parsed = parseEntity(value);
          if (!parsed) continue;
          entities.push({
            kind,
            id: parsed.id,
            name: parsed.name,
            displayNames: parsed.displayNames,
            aliases: parsed.aliases,
            filePath: toProjectRelative(projectRoot, absPath),
          });
        }
      } catch {
        // import失敗はスキップ
      }
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return [];
    throw error;
  }

  return entities;
}

export async function loadDetectableEntities(
  projectRoot: string,
): Promise<DetectableEntity[]> {
  const charactersDir = join(projectRoot, "src/characters");
  const settingsDir = join(projectRoot, "src/settings");
  const [characters, settings] = await Promise.all([
    loadEntitiesFromDir(projectRoot, charactersDir, "character"),
    loadEntitiesFromDir(projectRoot, settingsDir, "setting"),
  ]);
  return [...characters, ...settings];
}

export async function listMarkdownFiles(
  projectRoot: string,
  dirOrFile: { path?: string; dir?: string; recursive?: boolean },
): Promise<string[]> {
  if (dirOrFile.path) {
    return [resolvePath(projectRoot, dirOrFile.path)];
  }

  const dir = dirOrFile.dir;
  if (!dir) return [];
  const absDir = resolvePath(projectRoot, dir);

  const files: string[] = [];
  if (dirOrFile.recursive) {
    for await (
      const entry of walk(absDir, { includeDirs: false, exts: [".md"] })
    ) {
      files.push(entry.path);
    }
    return files;
  }

  for await (const entry of Deno.readDir(absDir)) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      files.push(join(absDir, entry.name));
    }
  }
  return files;
}
