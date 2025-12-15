import { join } from "@std/path/join";
import { MetaGeneratorService } from "../src/application/meta/meta_generator_service.ts";

type BenchProject = {
  projectPath: string;
  markdownPath: string;
};

let project: Promise<BenchProject> | null = null;

async function ensureBenchProject(): Promise<BenchProject> {
  if (project) return project;

  project = (async () => {
    const root = await Deno.makeTempDir({ prefix: "storyteller-bench-" });

    await Deno.mkdir(join(root, "src/characters"), { recursive: true });
    await Deno.mkdir(join(root, "src/settings"), { recursive: true });
    await Deno.mkdir(join(root, "manuscripts"), { recursive: true });

    await Deno.writeTextFile(
      join(root, "src/characters/hero.ts"),
      [
        "export const hero = {",
        '  id: "hero",',
        '  name: "勇者",',
        '  displayNames: ["勇者"],',
        "};",
        "",
      ].join("\n"),
    );

    await Deno.writeTextFile(
      join(root, "src/settings/capital.ts"),
      [
        "export const capital = {",
        '  id: "capital",',
        '  name: "王都",',
        '  displayNames: ["王都"],',
        "};",
        "",
      ].join("\n"),
    );

    const markdownPath = join(root, "manuscripts/chapter01.md");
    await Deno.writeTextFile(
      markdownPath,
      [
        "---",
        "storyteller:",
        "  chapter_id: chapter01",
        "  title: ベンチマーク",
        "  order: 1",
        "  characters: []",
        "  settings: []",
        "---",
        "",
        "勇者は王都へ向かった。",
        "",
      ].join("\n"),
    );

    return { projectPath: root, markdownPath };
  })();

  return project;
}

const service = new MetaGeneratorService();

Deno.bench("meta_check_bench generateFromMarkdown(dryRun)", async () => {
  const { projectPath, markdownPath } = await ensureBenchProject();
  const result = await service.generateFromMarkdown(markdownPath, {
    projectPath,
    dryRun: true,
  });
  if (!result.ok) {
    throw result.error;
  }
});
