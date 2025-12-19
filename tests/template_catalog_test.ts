import { assert, assertEquals } from "./asserts.ts";
import { StaticTemplateCatalog } from "@storyteller/domain/project_blueprint.ts";

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

Deno.test("StaticTemplateCatalog provides novel template", () => {
  const catalog = new StaticTemplateCatalog();
  const result = catalog.getBlueprint("novel");

  assert(result.ok, "novel blueprint should be provided");
  if (!result.ok) return;

  const filePaths = result.value.files.map((file) => file.path);
  assertEquals(filePaths.includes("story.config.ts"), true);
  assertEquals(filePaths.includes("README.md"), true);
});

Deno.test("StaticTemplateCatalog provides screenplay template", () => {
  const catalog = new StaticTemplateCatalog();
  const result = catalog.getBlueprint("screenplay");

  assert(result.ok, "screenplay blueprint should be provided");
  if (!result.ok) return;

  const filePaths = result.value.files.map((file) => file.path);
  assertEquals(filePaths.includes("story.config.ts"), true);
});

Deno.test("StaticTemplateCatalog returns error for unknown template", () => {
  const catalog = new StaticTemplateCatalog();
  // Use type assertion to test invalid template
  const result = catalog.getBlueprint("invalid" as "basic");

  assert(!result.ok, "invalid template should return error");
  if (result.ok) return;

  assertEquals(result.error.code, "template_not_found");
  assertEquals(result.error.message.includes("invalid"), true);
});
