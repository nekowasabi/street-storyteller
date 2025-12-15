import { assert } from "./asserts.ts";

Deno.test("version_constants are centralized and not duplicated", async () => {
  const core = await Deno.readTextFile("src/core/version.ts");
  assert(core.includes("export const STORYTELLER_VERSION"));
  assert(core.includes("export const PROJECT_SCHEMA_VERSION"));

  const versionModule = await Deno.readTextFile("src/cli/modules/version.ts");
  assert(
    versionModule.includes("STORYTELLER_VERSION"),
    "version command must reference STORYTELLER_VERSION",
  );
  assert(
    !versionModule.includes("0.3.0"),
    "version command must not hardcode storyteller version",
  );

  const updateModule = await Deno.readTextFile("src/cli/modules/update.ts");
  assert(
    updateModule.includes("STORYTELLER_VERSION"),
    "update command must reference STORYTELLER_VERSION",
  );
  assert(
    !updateModule.includes("0.3.0"),
    "update command must not hardcode storyteller version",
  );

  const migration = await Deno.readTextFile(
    "src/application/migration_facilitator.ts",
  );
  assert(
    migration.includes("PROJECT_SCHEMA_VERSION"),
    "migration facilitator must reference PROJECT_SCHEMA_VERSION",
  );
  assert(
    !migration.includes("export const CURRENT_VERSION ="),
    "migration facilitator must not export a separate CURRENT_VERSION constant",
  );
});
