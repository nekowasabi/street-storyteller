/**
 * Markdown file listing utility
 *
 * Shared utility for listing markdown files from a project directory.
 * // TODO: 将来的に lsp_shared.ts 側もこちらを参照するよう統一予定
 */

import { isAbsolute, join } from "@std/path";
import { walk } from "@std/fs";

export function resolvePath(projectRoot: string, userPath: string): string {
  return isAbsolute(userPath) ? userPath : join(projectRoot, userPath);
}

// TODO: 将来的に lsp_shared.ts 側もこちらを参照するよう統一予定
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
