import { dirname, join, relative } from "@std/path";
import { err, ok, type Result } from "../../shared/result.ts";

export type EmitError =
  | { type: "project_root_not_found"; message: string }
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
  lines.push(...importLines);
  lines.push("");

  const exportName = `${meta.id}Meta`;

  lines.push(`export const ${exportName}: ChapterMeta = {`);
  lines.push(`  id: ${JSON.stringify(meta.id)},`);
  lines.push(`  title: ${JSON.stringify(meta.title)},`);
  lines.push(`  order: ${meta.order},`);
  lines.push(
    `  characters: [${meta.characters.map((c) => c.exportName).join(", ")}],`,
  );
  lines.push(
    `  settings: [${meta.settings.map((s) => s.exportName).join(", ")}],`,
  );

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

  if (meta.references && Object.keys(meta.references).length > 0) {
    lines.push("");
    lines.push("  references: {");
    const sortedKeys = Object.keys(meta.references).sort((a, b) =>
      a.localeCompare(b)
    );
    for (const word of sortedKeys) {
      const ref = meta.references[word];
      lines.push(`    ${JSON.stringify(word)}: ${ref.exportName},`);
    }
    lines.push("  },");
  }

  lines.push("};");
  lines.push("");

  return lines.join("\n");
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
