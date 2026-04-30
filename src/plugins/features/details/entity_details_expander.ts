import { FileContentReader } from "./file_content_reader.ts";

export type DetailsExpansionResult =
  | { ok: true; value: Record<string, string | undefined> }
  | { ok: false; error: unknown };

export class EntityDetailsExpander {
  constructor(private readonly projectRoot: string) {}

  async expandFromFile(sourceFilePath: string, exportName: string): Promise<DetailsExpansionResult> {
    try {
      const moduleUrl = new URL(`${this.projectRoot}/${sourceFilePath}`, import.meta.url).href;
      const mod = await import(moduleUrl);
      const entity = mod[exportName] as { details?: Record<string, string | { file: string } | undefined> };
      const reader = new FileContentReader(this.projectRoot);
      const expanded: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(entity.details ?? {})) {
        const result = await reader.resolveHybridField(value, sourceFilePath);
        if (!result.ok) {
          return { ok: false, error: result.error };
        }
        expanded[key] = result.value;
      }
      return { ok: true, value: expanded };
    } catch (error) {
      return { ok: false, error };
    }
  }
}
