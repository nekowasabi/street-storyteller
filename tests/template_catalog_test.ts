import { assert, assertEquals } from "./asserts.ts";
import { StaticTemplateCatalog } from "../src/domain/project_blueprint.ts";

Deno.test("StaticTemplateCatalog provides base directories and files", () => {
  const catalog = new StaticTemplateCatalog();
  const result = catalog.getBlueprint("basic");

  assert(result.ok, "blueprint should be provided");
  if (!result.ok) return;

  const blueprint = result.value;
  assertEquals(blueprint.directories.includes("src/characters"), true);
  assertEquals(blueprint.directories.includes("tests"), true);

  const filePaths = blueprint.files.map((file) => file.path);
  assertEquals(filePaths.includes("tests/story_test.ts"), true);
  assertEquals(filePaths.includes("README.md"), true);
});
