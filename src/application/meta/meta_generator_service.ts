import { dirname, join } from "@std/path";
import { err, ok, type Result } from "../../shared/result.ts";
import type { FrontmatterData, ParseError } from "./frontmatter_parser.ts";
import { FrontmatterParser } from "./frontmatter_parser.ts";
import { ReferenceDetector } from "./reference_detector.ts";
import type { DetectedEntity, DetectionResult } from "./reference_detector.ts";
import { ValidationGenerator } from "./validation_generator.ts";
import type { ValidationRule } from "./validation_generator.ts";
import { TypeScriptEmitter } from "./typescript_emitter.ts";
import {
  getPreset,
  type Preset,
  type PresetType,
} from "../../domain/meta/preset_templates.ts";

export interface MetaGenerateOptions {
  readonly projectPath?: string;
  readonly outputPath?: string;
  readonly dryRun?: boolean;
  readonly force?: boolean;
  readonly characters?: readonly string[];
  readonly settings?: readonly string[];
  readonly preset?: string;
}

export interface ChapterMeta {
  readonly id: string;
  readonly title: string;
  readonly order: number;
  readonly characters: readonly DetectedEntity[];
  readonly settings: readonly DetectedEntity[];
  readonly validations?: readonly ValidationRule[];
  readonly references?: Record<
    string,
    { exportName: string; filePath: string }
  >;
  readonly summary?: string;
}

export class MetaGeneratorService {
  constructor(
    private readonly frontmatterParser = new FrontmatterParser(),
    private readonly referenceDetector = new ReferenceDetector(),
    private readonly validationGenerator = new ValidationGenerator(),
    private readonly emitter = new TypeScriptEmitter(),
  ) {}

  async generateFromMarkdown(
    markdownPath: string,
    options: MetaGenerateOptions = {},
  ): Promise<Result<ChapterMeta, Error>> {
    let content: string;
    try {
      content = await Deno.readTextFile(markdownPath);
    } catch (cause) {
      return err(
        new Error(`Failed to read markdown: ${markdownPath}`, { cause }),
      );
    }

    const parsed = this.frontmatterParser.parse(content);
    if (!parsed.ok) {
      return err(new Error(formatFrontmatterError(parsed.error)));
    }

    const projectPath = options.projectPath ??
      await findProjectRoot(dirname(markdownPath));
    if (!projectPath) {
      return err(new Error(`Could not find project root for: ${markdownPath}`));
    }

    const frontmatter = applyOverrides(parsed.value, options);

    let detection;
    try {
      detection = await this.referenceDetector.detect(
        content,
        frontmatter,
        projectPath,
      );
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      return err(new Error(message, { cause }));
    }
    let validations = this.validationGenerator.generate(detection);

    const presetResult = resolvePreset(options.preset);
    if (!presetResult.ok) {
      return err(presetResult.error);
    }
    const preset = presetResult.value;
    if (preset) {
      validations = validations.filter((rule) =>
        rule.type !== "plot_advancement"
      );
      validations = [...validations, ...preset.validations];
    }
    const references = buildReferenceMap(detection);

    const meta: ChapterMeta = {
      id: frontmatter.chapter_id,
      title: frontmatter.title,
      order: frontmatter.order,
      characters: detection.characters,
      settings: detection.settings,
      validations,
      references,
      summary: frontmatter.summary,
    };

    const outputPath = options.outputPath ??
      defaultOutputPath(markdownPath, frontmatter.chapter_id);

    if (!options.dryRun) {
      const exists = await pathExists(outputPath);
      if (exists && !options.force) {
        return err(
          new Error(
            `Output already exists: ${outputPath} (use --force to overwrite)`,
          ),
        );
      }

      const emitted = await this.emitter.emit(meta, outputPath);
      if (!emitted.ok) {
        return err(new Error(emitted.error.message));
      }
    }

    return ok(meta);
  }
}

function resolvePreset(
  value: string | undefined,
): Result<Preset | null, Error> {
  if (!value) {
    return ok(null);
  }
  if (!isPresetType(value)) {
    return err(new Error(`Invalid preset: ${value}`));
  }
  return ok(getPreset(value));
}

function isPresetType(value: string): value is PresetType {
  return value === "battle-scene" ||
    value === "romance-scene" ||
    value === "dialogue" ||
    value === "exposition";
}

function applyOverrides(
  frontmatter: FrontmatterData,
  options: MetaGenerateOptions,
): FrontmatterData {
  return {
    ...frontmatter,
    characters: options.characters
      ? [...options.characters]
      : frontmatter.characters,
    settings: options.settings ? [...options.settings] : frontmatter.settings,
  };
}

function buildReferenceMap(
  detected: DetectionResult,
): Record<string, { exportName: string; filePath: string }> {
  const map: Record<string, { exportName: string; filePath: string }> = {};

  for (const entity of [...detected.characters, ...detected.settings]) {
    for (const pattern of entity.matchedPatterns ?? []) {
      if (!pattern) {
        continue;
      }
      map[pattern] = {
        exportName: entity.exportName,
        filePath: entity.filePath,
      };
    }
  }

  return map;
}

function defaultOutputPath(markdownPath: string, chapterId: string): string {
  if (markdownPath.endsWith(".md")) {
    return markdownPath.slice(0, -3) + ".meta.ts";
  }
  return join(dirname(markdownPath), `${chapterId}.meta.ts`);
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

async function findProjectRoot(startDir: string): Promise<string | null> {
  let current = startDir;
  while (true) {
    const srcPath = join(current, "src");
    if (await isDirectory(srcPath)) {
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

function formatFrontmatterError(error: ParseError): string {
  switch (error.type) {
    case "no_frontmatter":
    case "missing_storyteller_key":
    case "yaml_parse_error":
      return error.message;
    case "missing_required_field":
      return `${error.message} (field: ${error.field})`;
    default:
      return "Failed to parse frontmatter";
  }
}
