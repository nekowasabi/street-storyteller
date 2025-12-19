import { assertEquals } from "@std/assert";
import { createDocumentationEmitter } from "@storyteller/application/documentation_emitter.ts";

Deno.test("DocumentationEmitter - emitTddGuide generates 3 TDD step messages", () => {
  const emitter = createDocumentationEmitter();
  const guide = emitter.emitTddGuide({ template: "basic" });

  assertEquals(guide.length, 3);
  assertEquals(guide[0].includes("RED"), true);
  assertEquals(guide[1].includes("GREEN"), true);
  assertEquals(guide[1].includes("basic"), true);
  assertEquals(guide[2].includes("REFACTOR"), true);
});

Deno.test("DocumentationEmitter - emitTddGuide includes template name", () => {
  const emitter = createDocumentationEmitter();

  const novelGuide = emitter.emitTddGuide({ template: "novel" });
  assertEquals(novelGuide[1].includes("novel"), true);

  const screenplayGuide = emitter.emitTddGuide({ template: "screenplay" });
  assertEquals(screenplayGuide[1].includes("screenplay"), true);
});

Deno.test("DocumentationEmitter - emitMigrationGuide returns empty for empty report", () => {
  const emitter = createDocumentationEmitter();
  const guide = emitter.emitMigrationGuide({
    status: "fresh",
    messages: [],
  });

  assertEquals(guide.length, 0);
});

Deno.test("DocumentationEmitter - emitMigrationGuide includes report messages", () => {
  const emitter = createDocumentationEmitter();
  const guide = emitter.emitMigrationGuide({
    status: "upgrade",
    messages: ["Action: Update manifest", "Warning: Check compatibility"],
  });

  assertEquals(guide.length, 3);
  assertEquals(guide[0].includes("マイグレーション"), true);
  assertEquals(guide[1], "Action: Update manifest");
  assertEquals(guide[2], "Warning: Check compatibility");
});
