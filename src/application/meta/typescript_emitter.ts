import { dirname, join, relative } from "@std/path";
import { err, ok, type Result } from "../../shared/result.ts";

export type EmitError =
  | { type: "project_root_not_found"; message: string }
  | { type: "update_not_supported"; message: string }
  | { type: "io_error"; message: string; cause?: unknown };

type EntityRef = {
  readonly exportName: string;
  readonly filePath: string;
};

type ChapterMetaLike = {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly characters: readonly EntityRef[];
  readonly settings: readonly EntityRef[];
  readonly validations?: readonly {
    readonly type: string;
    readonly validate: string;
    readonly message?: string;
  }[];
  readonly references?: Record<string, EntityRef>;
  readonly summary?: string;
  readonly plotPoints?: readonly string[];
};

export class TypeScriptEmitter {
  async emit(
    meta: ChapterMetaLike,
    outputPath: string,
  ): Promise<Result<void, EmitError>> {
    const context = await buildEmitContext(meta, outputPath);
    if (!context.ok) return err(context.error);

    const { outputDir, importLines } = context.value;
    const code = renderCode(meta, importLines);

    try {
      await Deno.mkdir(outputDir, { recursive: true });
      await Deno.writeTextFile(outputPath, code);
      return ok(undefined);
    } catch (cause) {
      return err({
        type: "io_error",
        message: `Failed to write output: ${outputPath}`,
        cause,
      });
    }
  }

  /**
   * Updates an existing `.meta.ts` by replacing only the marked auto blocks.
   * Falls back to `emit()` when the file does not exist.
   */
  async updateOrEmit(
    meta: ChapterMetaLike,
    outputPath: string,
  ): Promise<Result<void, EmitError>> {
    const exists = await pathExists(outputPath);
    if (!exists) {
      return await this.emit(meta, outputPath);
    }

    const context = await buildEmitContext(meta, outputPath);
    if (!context.ok) return err(context.error);

    const { outputDir, importLines } = context.value;

    let existing: string;
    try {
      existing = await Deno.readTextFile(outputPath);
    } catch (cause) {
      return err({
        type: "io_error",
        message: `Failed to read output: ${outputPath}`,
        cause,
      });
    }

    const updated = updateMarkedBlocks(existing, meta, importLines);
    if (!updated.ok) {
      return err({
        type: "update_not_supported",
        message: updated.error,
      });
    }

    try {
      await Deno.mkdir(outputDir, { recursive: true });
      await Deno.writeTextFile(outputPath, updated.value);
      return ok(undefined);
    } catch (cause) {
      return err({
        type: "io_error",
        message: `Failed to write output: ${outputPath}`,
        cause,
      });
    }
  }
}

type ImportEntry = {
  readonly kind: "character" | "setting";
  readonly exportName: string;
  readonly filePath: string;
};

function collectEntityImports(meta: ChapterMetaLike): ImportEntry[] {
  const seen = new Set<string>();
  const entries: ImportEntry[] = [];

  for (const character of meta.characters ?? []) {
    const key = `character:${character.exportName}:${character.filePath}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    entries.push({
      kind: "character",
      exportName: character.exportName,
      filePath: character.filePath,
    });
  }

  for (const setting of meta.settings ?? []) {
    const key = `setting:${setting.exportName}:${setting.filePath}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    entries.push({
      kind: "setting",
      exportName: setting.exportName,
      filePath: setting.filePath,
    });
  }

  for (const ref of Object.values(meta.references ?? {})) {
    const isCharacter = meta.characters?.some((c) =>
      c.exportName === ref.exportName
    );
    const kind: ImportEntry["kind"] = isCharacter ? "character" : "setting";
    const key = `${kind}:${ref.exportName}:${ref.filePath}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    entries.push({ kind, exportName: ref.exportName, filePath: ref.filePath });
  }

  return entries;
}

function renderCode(
  meta: ChapterMetaLike,
  importLines: readonly string[],
): string {
  const lines: string[] = [];
  lines.push(`// 自動生成: storyteller meta generate`);
  lines.push(`// 生成日時: ${formatTimestamp(new Date())}`);
  lines.push("");
  lines.push(...renderImportsBlock(importLines));
  lines.push("");

  const exportName = `${meta.id}Meta`;

  lines.push(`export const ${exportName}: ChapterMeta = {`);
  lines.push(`  id: ${JSON.stringify(meta.id)},`);
  lines.push(...renderCoreBlock(meta, "  "));
  lines.push(...renderEntitiesBlock(meta, "  "));

  if (meta.summary) {
    lines.push("");
    lines.push(`  summary: ${JSON.stringify(meta.summary)},`);
  }

  if (meta.plotPoints && meta.plotPoints.length > 0) {
    lines.push("");
    lines.push("  plotPoints: [");
    for (const point of meta.plotPoints) {
      lines.push(`    ${JSON.stringify(point)},`);
    }
    lines.push("  ],");
  }

  if (meta.validations && meta.validations.length > 0) {
    lines.push("");
    lines.push("  validations: [");
    for (const validation of meta.validations) {
      lines.push("    {");
      lines.push(`      type: ${JSON.stringify(validation.type)},`);
      lines.push(`      validate: ${validation.validate},`);
      if (validation.message) {
        lines.push(`      message: ${JSON.stringify(validation.message)},`);
      }
      lines.push("    },");
    }
    lines.push("  ],");
  }

  lines.push("");
  lines.push(...renderReferencesBlock(meta, "  "));

  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

const MARKER_IMPORTS_START = "// storyteller:auto:imports:start";
const MARKER_IMPORTS_END = "// storyteller:auto:imports:end";
const MARKER_CORE_START = "// storyteller:auto:core:start";
const MARKER_CORE_END = "// storyteller:auto:core:end";
const MARKER_ENTITIES_START = "// storyteller:auto:entities:start";
const MARKER_ENTITIES_END = "// storyteller:auto:entities:end";
const MARKER_REFERENCES_START = "// storyteller:auto:references:start";
const MARKER_REFERENCES_END = "// storyteller:auto:references:end";

function renderImportsBlock(importLines: readonly string[]): string[] {
  return [
    MARKER_IMPORTS_START,
    ...importLines,
    MARKER_IMPORTS_END,
  ];
}

function renderCoreBlock(meta: ChapterMetaLike, indent: string): string[] {
  return [
    `${indent}${MARKER_CORE_START}`,
    `${indent}title: ${JSON.stringify(meta.title)},`,
    `${indent}order: ${meta.order},`,
    `${indent}${MARKER_CORE_END}`,
  ];
}

function renderEntitiesBlock(meta: ChapterMetaLike, indent: string): string[] {
  const characters = meta.characters.map((c) => c.exportName).join(", ");
  const settings = meta.settings.map((s) => s.exportName).join(", ");
  return [
    `${indent}${MARKER_ENTITIES_START}`,
    `${indent}characters: [${characters}],`,
    `${indent}settings: [${settings}],`,
    `${indent}${MARKER_ENTITIES_END}`,
  ];
}

function renderReferencesBlock(
  meta: ChapterMetaLike,
  indent: string,
): string[] {
  const references = meta.references ?? {};
  const keys = Object.keys(references);
  return [
    `${indent}${MARKER_REFERENCES_START}`,
    `${indent}references: {`,
    ...keys.sort((a, b) => a.localeCompare(b)).map((word) => {
      const ref = references[word];
      return `${indent}  ${JSON.stringify(word)}: ${ref.exportName},`;
    }),
    `${indent}},`,
    `${indent}${MARKER_REFERENCES_END}`,
  ];
}

function toImportSpecifier(fromDir: string, targetFile: string): string {
  let relPath = relative(fromDir, targetFile);
  relPath = relPath.replaceAll("\\", "/");
  if (!relPath.startsWith(".")) {
    relPath = `./${relPath}`;
  }
  return relPath;
}

async function findProjectRoot(startDir: string): Promise<string | null> {
  let current = startDir;
  while (true) {
    const srcDir = join(current, "src");
    if (await isDirectory(srcDir)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch {
    return false;
  }
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

async function buildEmitContext(
  meta: ChapterMetaLike,
  outputPath: string,
): Promise<Result<{ outputDir: string; importLines: string[] }, EmitError>> {
  const outputDir = dirname(outputPath);
  const projectRoot = await findProjectRoot(outputDir);
  if (!projectRoot) {
    return err({
      type: "project_root_not_found",
      message: `Could not find project root from: ${outputDir}`,
    });
  }

  const importLines: string[] = [];
  const chapterMetaTypePath = join(projectRoot, "src/types/chapter.ts");
  importLines.push(
    `import type { ChapterMeta } from "${
      toImportSpecifier(outputDir, chapterMetaTypePath)
    }";`,
  );

  const entityImports = collectEntityImports(meta);

  const characterImports = entityImports
    .filter((entry) => entry.kind === "character")
    .sort((a, b) => a.exportName.localeCompare(b.exportName));
  const settingImports = entityImports
    .filter((entry) => entry.kind === "setting")
    .sort((a, b) => a.exportName.localeCompare(b.exportName));

  for (const entry of [...characterImports, ...settingImports]) {
    const absPath = join(projectRoot, entry.filePath);
    importLines.push(
      `import { ${entry.exportName} } from "${
        toImportSpecifier(outputDir, absPath)
      }";`,
    );
  }

  return ok({ outputDir, importLines });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

type BlockReplacement = {
  readonly marker: "imports" | "core" | "entities" | "references";
  readonly lines: string[];
};

function updateMarkedBlocks(
  existing: string,
  meta: ChapterMetaLike,
  importLines: readonly string[],
): Result<string, string> {
  const replacements: BlockReplacement[] = [
    { marker: "imports", lines: renderImportsBlock(importLines) },
    { marker: "core", lines: renderCoreBlock(meta, "") },
    { marker: "entities", lines: renderEntitiesBlock(meta, "") },
    { marker: "references", lines: renderReferencesBlock(meta, "") },
  ];

  let updated = existing;

  for (const replacement of replacements) {
    const replaced = replaceMarkedBlock(
      updated,
      replacement.marker,
      replacement.lines,
    );
    if (!replaced.ok) {
      return err(replaced.error);
    }
    updated = replaced.value;
  }

  return ok(updated);
}

function replaceMarkedBlock(
  source: string,
  blockName: "imports" | "core" | "entities" | "references",
  newLinesWithoutIndent: readonly string[],
): Result<string, string> {
  const startToken = `// storyteller:auto:${blockName}:start`;
  const endToken = `// storyteller:auto:${blockName}:end`;

  const startRe = new RegExp(
    `^(?<indent>[\\t ]*)${escapeRegExp(startToken)}[\\t ]*$`,
    "m",
  );
  const startMatch = source.match(startRe);
  if (!startMatch) {
    return err(
      `Cannot update: missing marker block (${startToken}). Re-run with --force, or re-generate to add markers.`,
    );
  }
  const indent = startMatch.groups?.indent ?? "";

  const endRe = new RegExp(
    `^${escapeRegExp(indent)}${escapeRegExp(endToken)}[\\t ]*$`,
    "m",
  );
  const endMatch = source.match(endRe);
  if (!endMatch || endMatch.index === undefined) {
    return err(
      `Cannot update: missing marker block (${endToken}). Re-run with --force, or re-generate to add markers.`,
    );
  }

  const startIndex = startMatch.index ?? -1;
  const endIndex = endMatch.index ?? -1;
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    return err(
      `Cannot update: invalid marker ordering for (${blockName}). Re-run with --force.`,
    );
  }

  const endLineEnd = source.indexOf("\n", endIndex);
  const sliceEnd = endLineEnd === -1 ? source.length : endLineEnd + 1;

  const newBlock =
    newLinesWithoutIndent.map((line) =>
      line.startsWith("// storyteller:auto:")
        ? `${indent}${line}`
        : `${indent}${line}`
    ).join("\n") + "\n";

  return ok(source.slice(0, startIndex) + newBlock + source.slice(sliceEnd));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
