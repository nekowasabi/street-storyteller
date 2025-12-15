import { assert } from "./asserts.ts";

Deno.test("version_release_ready build_cli defaults to STORYTELLER_VERSION", async () => {
  const script = await Deno.readTextFile("scripts/build_cli.ts");
  assert(
    script.includes("STORYTELLER_VERSION"),
    "build_cli.ts must default to STORYTELLER_VERSION when --version is not provided",
  );
  assert(
    !script.includes("0.0.0-dev"),
    "build_cli.ts must not default to a dev placeholder version",
  );
});

Deno.test("version_release_ready release workflow stamps manifest version from tag", async () => {
  const workflow = await Deno.readTextFile(".github/workflows/release.yml");
  assert(
    workflow.includes("GITHUB_REF_NAME#v"),
    "release.yml must derive manifest version from tag name",
  );
  assert(
    workflow.includes("scripts/build_cli.ts --version"),
    "release.yml must pass --version to build_cli.ts",
  );
});
