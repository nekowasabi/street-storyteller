import { assertEquals } from "../asserts.ts";
import { FileReferenceValidator } from "@storyteller/plugins/features/details/validator.ts";

Deno.test("FileReferenceValidator treats missing details as valid", async () => {
  const validator = new FileReferenceValidator();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-details-" });
  try {
    const result = await validator.validate(
      {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: [],
        relationships: {},
        appearingChapters: [],
        summary: "test",
      } as any,
      tmp,
    );
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.valid, true);
      assertEquals(result.value.errors.length, 0);
    }
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("FileReferenceValidator reports missing referenced files", async () => {
  const validator = new FileReferenceValidator();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-details-" });
  try {
    const result = await validator.validate(
      {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: [],
        relationships: {},
        appearingChapters: [],
        summary: "test",
        details: {
          backstory: { file: "src/characters/details/hero-backstory.md" },
        },
      } as any,
      tmp,
    );
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.valid, false);
      assertEquals(result.value.errors.length, 1);
      assertEquals(result.value.errors[0]?.type, "file_not_found");
      assertEquals(result.value.errors[0]?.field, "backstory");
    }
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("FileReferenceValidator passes when referenced files exist", async () => {
  const validator = new FileReferenceValidator();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-details-" });
  try {
    const filePath = "src/characters/details/hero-backstory.md";
    const abs = `${tmp}/${filePath}`;
    await Deno.mkdir(`${tmp}/src/characters/details`, { recursive: true });
    await Deno.writeTextFile(abs, "backstory");

    const result = await validator.validate(
      {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: [],
        relationships: {},
        appearingChapters: [],
        summary: "test",
        details: {
          backstory: { file: filePath },
          development: {
            initial: "a",
            goal: "b",
            obstacle: "c",
            arc_notes: { file: filePath },
          },
        },
      } as any,
      tmp,
    );
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.valid, true);
      assertEquals(result.value.errors.length, 0);
    }
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("FileReferenceValidator validateMultiple returns per-character results", async () => {
  const validator = new FileReferenceValidator();
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-details-" });
  try {
    const result = await validator.validateMultiple(
      [
        {
          id: "a",
          name: "A",
          role: "supporting",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "x",
        },
        {
          id: "b",
          name: "B",
          role: "supporting",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "x",
          details: { appearance: { file: "missing.md" } },
        },
      ] as any,
      tmp,
    );

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.get("a")?.valid, true);
      assertEquals(result.value.get("b")?.valid, false);
    }
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
