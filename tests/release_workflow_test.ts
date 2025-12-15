import { assert } from "./asserts.ts";

Deno.test("release_workflow exists and triggers on version tags", async () => {
  const stat = await Deno.stat(".github/workflows/release.yml");
  assert(stat.isFile, "release.yml must be a file");

  const workflow = await Deno.readTextFile(".github/workflows/release.yml");
  assert(
    /tags:\s*\n\s*-\s*['"]v\*\.\*\.\*['"]/.test(workflow),
    "release.yml must trigger on tags like v*.*.*",
  );
});

Deno.test("release_workflow runs cli packaging", async () => {
  const workflow = await Deno.readTextFile(".github/workflows/release.yml");
  assert(
    workflow.includes("deno task cli:package"),
    "release.yml must run deno task cli:package",
  );
});
