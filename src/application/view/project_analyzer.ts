/**
 * プロジェクト解析サービス
 * 物語プロジェクトの構造を解析し、HTML可視化用のデータを生成する
 */
import { join, relative, toFileUrl } from "@std/path";
import { err, ok, type Result } from "../../shared/result.ts";

/**
 * キャラクターサマリー
 */
export interface CharacterSummary {
  readonly id: string;
  readonly name: string;
  readonly displayNames: readonly string[];
  readonly role?: string;
  readonly summary?: string;
  readonly filePath: string;
}

/**
 * 設定サマリー
 */
export interface SettingSummary {
  readonly id: string;
  readonly name: string;
  readonly displayNames: readonly string[];
  readonly summary?: string;
  readonly filePath: string;
}

/**
 * イベントサマリー
 */
export interface EventSummary {
  readonly id: string;
  readonly title: string;
  readonly category: string;
  readonly order: number;
  readonly label?: string;
  readonly summary?: string;
  readonly characters: readonly string[];
  readonly settings: readonly string[];
  readonly chapters: readonly string[];
  readonly causedBy?: readonly string[];
  readonly causes?: readonly string[];
}

/**
 * タイムラインサマリー
 */
export interface TimelineSummary {
  readonly id: string;
  readonly name: string;
  readonly scope: string;
  readonly summary?: string;
  readonly events: readonly EventSummary[];
  readonly parentTimeline?: string;
  readonly relatedCharacter?: string;
  readonly filePath: string;
}

/**
 * エンティティ参照
 */
export interface EntityReference {
  readonly id: string;
  readonly kind: "character" | "setting";
  readonly occurrences: number;
}

/**
 * 原稿サマリー
 */
export interface ManuscriptSummary {
  readonly path: string;
  readonly title?: string;
  readonly referencedEntities: readonly EntityReference[];
}

/**
 * プロジェクト解析結果
 */
export interface ProjectAnalysis {
  readonly characters: readonly CharacterSummary[];
  readonly settings: readonly SettingSummary[];
  readonly timelines: readonly TimelineSummary[];
  readonly manuscripts: readonly ManuscriptSummary[];
}

/**
 * 解析エラー
 */
export interface AnalysisError {
  readonly code: string;
  readonly message: string;
}

/**
 * プロジェクト解析クラス
 */
export class ProjectAnalyzer {
  /**
   * プロジェクトを解析
   */
  async analyzeProject(
    projectPath: string,
  ): Promise<Result<ProjectAnalysis, AnalysisError>> {
    try {
      // キャラクターをロード
      const characters = await this.loadCharacters(projectPath);

      // 設定をロード
      const settings = await this.loadSettings(projectPath);

      // タイムラインをロード
      const timelines = await this.loadTimelines(projectPath);

      // 原稿を解析
      const manuscripts = await this.analyzeManuscripts(
        projectPath,
        characters,
        settings,
      );

      return ok({
        characters,
        settings,
        timelines,
        manuscripts,
      });
    } catch (error) {
      return err({
        code: "analysis_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * キャラクターをロード
   */
  private async loadCharacters(
    projectPath: string,
  ): Promise<CharacterSummary[]> {
    const charactersDir = join(projectPath, "src/characters");
    const characters: CharacterSummary[] = [];

    try {
      for await (const entry of Deno.readDir(charactersDir)) {
        if (!entry.isFile || !entry.name.endsWith(".ts")) continue;

        const absPath = join(charactersDir, entry.name);
        try {
          const mod = await import(toFileUrl(absPath).href);
          for (const [, value] of Object.entries(mod)) {
            const parsed = this.parseEntity(value);
            if (parsed) {
              const relPath = relative(projectPath, absPath).replaceAll(
                "\\",
                "/",
              );
              characters.push({
                id: parsed.id,
                name: parsed.name,
                displayNames: parsed.displayNames ?? [parsed.name],
                role: parsed.role,
                summary: parsed.summary,
                filePath: relPath,
              });
            }
          }
        } catch {
          // スキップ
        }
      }
    } catch {
      // ディレクトリが存在しない場合はスキップ
    }

    return characters;
  }

  /**
   * 設定をロード
   */
  private async loadSettings(projectPath: string): Promise<SettingSummary[]> {
    const settingsDir = join(projectPath, "src/settings");
    const settings: SettingSummary[] = [];

    try {
      for await (const entry of Deno.readDir(settingsDir)) {
        if (!entry.isFile || !entry.name.endsWith(".ts")) continue;

        const absPath = join(settingsDir, entry.name);
        try {
          const mod = await import(toFileUrl(absPath).href);
          for (const [, value] of Object.entries(mod)) {
            const parsed = this.parseEntity(value);
            if (parsed) {
              const relPath = relative(projectPath, absPath).replaceAll(
                "\\",
                "/",
              );
              settings.push({
                id: parsed.id,
                name: parsed.name,
                displayNames: parsed.displayNames ?? [parsed.name],
                summary: parsed.summary,
                filePath: relPath,
              });
            }
          }
        } catch {
          // スキップ
        }
      }
    } catch {
      // ディレクトリが存在しない場合はスキップ
    }

    return settings;
  }

  /**
   * タイムラインをロード
   */
  private async loadTimelines(
    projectPath: string,
  ): Promise<TimelineSummary[]> {
    const timelinesDir = join(projectPath, "src/timelines");
    const timelines: TimelineSummary[] = [];

    try {
      for await (const entry of Deno.readDir(timelinesDir)) {
        if (!entry.isFile || !entry.name.endsWith(".ts")) continue;

        const absPath = join(timelinesDir, entry.name);
        try {
          const mod = await import(toFileUrl(absPath).href);
          for (const [, value] of Object.entries(mod)) {
            const parsed = this.parseTimeline(value);
            if (parsed) {
              const relPath = relative(projectPath, absPath).replaceAll(
                "\\",
                "/",
              );
              timelines.push({
                ...parsed,
                filePath: relPath,
              });
            }
          }
        } catch {
          // スキップ
        }
      }
    } catch {
      // ディレクトリが存在しない場合はスキップ
    }

    return timelines;
  }

  /**
   * エンティティをパース
   */
  private parseEntity(value: unknown): {
    id: string;
    name: string;
    displayNames?: string[];
    role?: string;
    summary?: string;
  } | null {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    const id = record.id;
    const name = record.name;
    if (typeof id !== "string" || typeof name !== "string") return null;

    const displayNames = Array.isArray(record.displayNames)
      ? record.displayNames.filter((v): v is string => typeof v === "string")
      : undefined;

    const role = typeof record.role === "string" ? record.role : undefined;
    const summary = typeof record.summary === "string"
      ? record.summary
      : undefined;

    return { id, name, displayNames, role, summary };
  }

  /**
   * タイムラインをパース
   */
  private parseTimeline(value: unknown): Omit<TimelineSummary, "filePath"> | null {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;

    const id = record.id;
    const name = record.name;
    const scope = record.scope;

    if (
      typeof id !== "string" ||
      typeof name !== "string" ||
      typeof scope !== "string"
    ) {
      return null;
    }

    const summary = typeof record.summary === "string"
      ? record.summary
      : undefined;

    const events: EventSummary[] = [];
    if (Array.isArray(record.events)) {
      for (const evt of record.events) {
        const parsed = this.parseEvent(evt);
        if (parsed) {
          events.push(parsed);
        }
      }
    }

    const parentTimeline = typeof record.parentTimeline === "string"
      ? record.parentTimeline
      : undefined;

    const relatedCharacter = typeof record.relatedCharacter === "string"
      ? record.relatedCharacter
      : undefined;

    return {
      id,
      name,
      scope,
      summary,
      events,
      parentTimeline,
      relatedCharacter,
    };
  }

  /**
   * イベントをパース
   */
  private parseEvent(value: unknown): EventSummary | null {
    if (!value || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;

    const id = record.id;
    const title = record.title;
    const category = record.category;
    const time = record.time;

    if (
      typeof id !== "string" ||
      typeof title !== "string" ||
      typeof category !== "string" ||
      !time || typeof time !== "object"
    ) {
      return null;
    }

    const timeRecord = time as Record<string, unknown>;
    const order = typeof timeRecord.order === "number" ? timeRecord.order : 0;
    const label = typeof timeRecord.label === "string"
      ? timeRecord.label
      : undefined;

    const summary = typeof record.summary === "string"
      ? record.summary
      : undefined;

    const characters = Array.isArray(record.characters)
      ? record.characters.filter((v): v is string => typeof v === "string")
      : [];

    const settings = Array.isArray(record.settings)
      ? record.settings.filter((v): v is string => typeof v === "string")
      : [];

    const chapters = Array.isArray(record.chapters)
      ? record.chapters.filter((v): v is string => typeof v === "string")
      : [];

    const causedBy = Array.isArray(record.causedBy)
      ? record.causedBy.filter((v): v is string => typeof v === "string")
      : undefined;

    const causes = Array.isArray(record.causes)
      ? record.causes.filter((v): v is string => typeof v === "string")
      : undefined;

    return {
      id,
      title,
      category,
      order,
      label,
      summary,
      characters,
      settings,
      chapters,
      causedBy,
      causes,
    };
  }

  /**
   * 原稿を解析
   */
  private async analyzeManuscripts(
    projectPath: string,
    characters: readonly CharacterSummary[],
    settings: readonly SettingSummary[],
  ): Promise<ManuscriptSummary[]> {
    const manuscriptsDir = join(projectPath, "manuscripts");
    const manuscripts: ManuscriptSummary[] = [];

    try {
      for await (const entry of Deno.readDir(manuscriptsDir)) {
        if (!entry.isFile || !entry.name.endsWith(".md")) continue;

        const absPath = join(manuscriptsDir, entry.name);
        try {
          const content = await Deno.readTextFile(absPath);
          const relPath = relative(projectPath, absPath).replaceAll("\\", "/");

          // フロントマターからタイトルを抽出
          const title = this.extractTitle(content);

          // エンティティ参照を検出
          const referencedEntities = this.detectReferences(
            content,
            characters,
            settings,
          );

          manuscripts.push({
            path: relPath,
            title,
            referencedEntities,
          });
        } catch {
          // スキップ
        }
      }
    } catch {
      // ディレクトリが存在しない場合はスキップ
    }

    return manuscripts;
  }

  /**
   * フロントマターからタイトルを抽出
   */
  private extractTitle(content: string): string | undefined {
    const match = content.match(/^---\n[\s\S]*?title:\s*(.+)\n[\s\S]*?---/);
    if (match && match[1]) {
      return match[1].trim();
    }
    return undefined;
  }

  /**
   * コンテンツ内のエンティティ参照を検出
   */
  private detectReferences(
    content: string,
    characters: readonly CharacterSummary[],
    settings: readonly SettingSummary[],
  ): EntityReference[] {
    const references: EntityReference[] = [];

    // フロントマターを除去
    const body = this.stripFrontmatter(content);

    // キャラクター参照を検出
    for (const char of characters) {
      const patterns = [char.name, ...char.displayNames];
      let totalOccurrences = 0;

      for (const pattern of patterns) {
        if (!pattern) continue;
        totalOccurrences += this.countOccurrences(body, pattern);
      }

      if (totalOccurrences > 0) {
        references.push({
          id: char.id,
          kind: "character",
          occurrences: totalOccurrences,
        });
      }
    }

    // 設定参照を検出
    for (const setting of settings) {
      const patterns = [setting.name, ...setting.displayNames];
      let totalOccurrences = 0;

      for (const pattern of patterns) {
        if (!pattern) continue;
        totalOccurrences += this.countOccurrences(body, pattern);
      }

      if (totalOccurrences > 0) {
        references.push({
          id: setting.id,
          kind: "setting",
          occurrences: totalOccurrences,
        });
      }
    }

    return references;
  }

  /**
   * フロントマターを除去
   */
  private stripFrontmatter(content: string): string {
    const trimmed = content.trimStart();
    if (!trimmed.startsWith("---")) {
      return content;
    }

    const lines = content.split("\n");
    if (lines.length === 0 || lines[0]?.trim() !== "---") {
      return content;
    }

    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
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

  /**
   * パターンの出現回数をカウント
   */
  private countOccurrences(haystack: string, needle: string): number {
    if (!needle) return 0;
    let count = 0;
    let index = 0;
    while (true) {
      const found = haystack.indexOf(needle, index);
      if (found === -1) break;
      count++;
      index = found + needle.length;
    }
    return count;
  }
}
