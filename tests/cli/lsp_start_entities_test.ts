import { assert, assertEquals } from "../asserts.ts";
import { loadEntities, parseEntity } from "../../src/cli/modules/lsp/start.ts";

Deno.test("LspStart helpers: parseEntity returns null for invalid inputs", () => {
  assertEquals(parseEntity(null), null);
  assertEquals(parseEntity("x"), null);
  assertEquals(parseEntity({}), null);
  assertEquals(parseEntity({ id: "hero" }), null);
  assertEquals(parseEntity({ name: "Hero" }), null);
});

Deno.test("LspStart helpers: parseEntity filters displayNames/aliases arrays", () => {
  const parsed = parseEntity({
    id: "hero",
    name: "Hero",
    displayNames: ["勇者", 1, null],
    aliases: ["勇", false],
  });
  assert(parsed !== null);
  assertEquals(parsed?.id, "hero");
  assertEquals(parsed?.name, "Hero");
  assertEquals(JSON.stringify(parsed?.displayNames), JSON.stringify(["勇者"]));
  assertEquals(JSON.stringify(parsed?.aliases), JSON.stringify(["勇"]));
});

Deno.test("LspStart helpers: loadEntities loads characters and settings", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-lsp-start-" });
  try {
    await Deno.mkdir(`${tmp}/src/characters`, { recursive: true });
    await Deno.mkdir(`${tmp}/src/settings`, { recursive: true });
    await Deno.writeTextFile(
      `${tmp}/src/characters/hero.ts`,
      [
        `export const hero = { id: "hero", name: "Hero", displayNames: ["勇者"], aliases: ["勇"] };`,
        `export const ignored = 123;`,
      ].join("\n"),
    );
    await Deno.writeTextFile(
      `${tmp}/src/settings/city.ts`,
      `export const city = { id: "city", name: "Capital" };`,
    );

    const entities = await loadEntities(tmp);
    assert(entities.length >= 2);

    const hero = entities.find((e) =>
      e.kind === "character" && e.id === "hero"
    );
    assert(hero !== undefined);
    assertEquals(hero?.filePath, "src/characters/hero.ts");
    assertEquals(JSON.stringify(hero?.displayNames), JSON.stringify(["勇者"]));

    const city = entities.find((e) => e.kind === "setting" && e.id === "city");
    assert(city !== undefined);
    assertEquals(city?.filePath, "src/settings/city.ts");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("LspStart helpers: loadEntities returns empty when directories are missing", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-lsp-start-" });
  try {
    const entities = await loadEntities(tmp);
    assertEquals(entities.length, 0);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
