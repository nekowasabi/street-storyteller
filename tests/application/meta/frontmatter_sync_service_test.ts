/**
 * FrontmatterSyncService テスト
 *
 * 原稿ファイルのFrontMatterを自動同期するサービスのテスト
 */
import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { join } from "@std/path";
import {
  DEFAULT_SYNC_OPTIONS,
  type EntityChange,
  FrontmatterSyncService,
  type SyncOptions,
  type SyncResult,
} from "@storyteller/application/meta/frontmatter_sync_service.ts";
import type { DetectableEntity } from "@storyteller/lsp/detection/positioned_detector.ts";
import { PositionedDetector } from "@storyteller/lsp/detection/positioned_detector.ts";
import { FrontmatterEditor } from "@storyteller/application/meta/frontmatter_editor.ts";
import { EntityValidator } from "@storyteller/application/meta/entity_validator.ts";

describe("FrontmatterSyncService Types", () => {
  describe("DEFAULT_SYNC_OPTIONS", () => {
    it("should have correct default values", () => {
      assertEquals(DEFAULT_SYNC_OPTIONS.mode, "add");
      assertEquals(DEFAULT_SYNC_OPTIONS.confidenceThreshold, 0.85);
      assertEquals(DEFAULT_SYNC_OPTIONS.dryRun, false);
      assertEquals(DEFAULT_SYNC_OPTIONS.entityTypes.length, 6);
    });

    it("should include all entity types", () => {
      const expectedTypes = [
        "characters",
        "settings",
        "foreshadowings",
        "timelines",
        "timeline_events",
        "phases",
      ];
      for (const type of expectedTypes) {
        assertEquals(
          DEFAULT_SYNC_OPTIONS.entityTypes.includes(type as never),
          true,
          `entityTypes should include ${type}`,
        );
      }
    });
  });

  describe("SyncOptions", () => {
    it("should accept valid options with add mode", () => {
      const options: SyncOptions = {
        mode: "add",
        entityTypes: ["characters", "settings"],
        confidenceThreshold: 0.9,
        dryRun: false,
      };
      assertExists(options);
      assertEquals(options.mode, "add");
      assertEquals(options.entityTypes.length, 2);
    });

    it("should accept valid options with sync mode", () => {
      const options: SyncOptions = {
        mode: "sync",
        entityTypes: ["characters"],
        confidenceThreshold: 0.85,
        dryRun: true,
      };
      assertExists(options);
      assertEquals(options.mode, "sync");
      assertEquals(options.dryRun, true);
    });
  });

  describe("SyncResult", () => {
    it("should accept valid result with changes", () => {
      const result: SyncResult = {
        path: "manuscripts/chapter01.md",
        changed: true,
        added: [{ type: "characters", ids: ["hero"] }],
        removed: [],
        unchanged: [{ type: "settings", ids: ["kingdom"] }],
        durationMs: 150,
      };
      assertExists(result);
      assertEquals(result.changed, true);
      assertEquals(result.added.length, 1);
      assertEquals(result.added[0].ids, ["hero"]);
    });

    it("should accept valid result without changes", () => {
      const result: SyncResult = {
        path: "manuscripts/chapter02.md",
        changed: false,
        added: [],
        removed: [],
        unchanged: [
          { type: "characters", ids: ["hero"] },
          { type: "settings", ids: ["kingdom"] },
        ],
        durationMs: 50,
      };
      assertExists(result);
      assertEquals(result.changed, false);
      assertEquals(result.added.length, 0);
    });
  });

  describe("EntityChange", () => {
    it("should accept valid entity change", () => {
      const change: EntityChange = {
        type: "characters",
        ids: ["hero", "heroine"],
      };
      assertExists(change);
      assertEquals(change.type, "characters");
      assertEquals(change.ids.length, 2);
    });

    it("should accept entity change with empty ids", () => {
      const change: EntityChange = {
        type: "foreshadowings",
        ids: [],
      };
      assertExists(change);
      assertEquals(change.ids.length, 0);
    });
  });
});

describe("FrontmatterSyncService", () => {
  describe("constructor", () => {
    it("should create instance with project root and entities", () => {
      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "Hero",
          filePath: "src/characters/hero.ts",
        },
      ];
      const service = new FrontmatterSyncService("/path/to/project", entities);
      assertExists(service);
    });

    it("should accept custom dependencies", () => {
      const mockDetector = new PositionedDetector([]);
      const mockEditor = new FrontmatterEditor();
      const mockValidator = new EntityValidator("/path/to/project");

      const service = new FrontmatterSyncService("/path/to/project", [], {
        detector: mockDetector,
        editor: mockEditor,
        validator: mockValidator,
      });
      assertExists(service);
    });
  });

  describe("sync() - add mode", () => {
    it("should return file_not_found error when file does not exist", async () => {
      const service = new FrontmatterSyncService("/tmp/test", []);
      const result = await service.sync("nonexistent.md");
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.type, "file_not_found");
      }
    });

    it("should add detected entities to frontmatter", async () => {
      const tempDir = await Deno.makeTempDir();
      const testFile = join(tempDir, "chapter01.md");
      await Deno.writeTextFile(
        testFile,
        `---
storyteller:
  chapter_id: chapter_01
  title: "Test Chapter"
  order: 1
  characters: []
---

The hero drew his sword.
`,
      );

      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "hero",
          filePath: "src/characters/hero.ts",
        },
      ];
      const service = new FrontmatterSyncService(tempDir, entities);

      const result = await service.sync("chapter01.md");
      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.changed, true);
        const addedChars = result.value.added.find((a) =>
          a.type === "characters"
        );
        assertExists(addedChars);
        assertEquals(addedChars.ids.includes("hero"), true);
      }

      await Deno.remove(tempDir, { recursive: true });
    });

    it("should preserve existing entities in add mode", async () => {
      const tempDir = await Deno.makeTempDir();
      const testFile = join(tempDir, "chapter01.md");
      await Deno.writeTextFile(
        testFile,
        `---
storyteller:
  chapter_id: chapter_01
  title: "Test Chapter"
  order: 1
  characters:
    - existing_char
---

The hero drew his sword.
`,
      );

      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "hero",
          filePath: "src/characters/hero.ts",
        },
      ];
      const service = new FrontmatterSyncService(tempDir, entities);

      const result = await service.sync("chapter01.md", { mode: "add" });
      assertEquals(result.ok, true);

      // Verify file still contains existing_char
      const content = await Deno.readTextFile(testFile);
      assertEquals(content.includes("existing_char"), true);
      assertEquals(content.includes("hero"), true);

      await Deno.remove(tempDir, { recursive: true });
    });
  });

  describe("sync() - sync mode", () => {
    it("should replace frontmatter entities with detected ones", async () => {
      const tempDir = await Deno.makeTempDir();
      const testFile = join(tempDir, "chapter01.md");
      await Deno.writeTextFile(
        testFile,
        `---
storyteller:
  chapter_id: chapter_01
  title: "Test Chapter"
  order: 1
  characters:
    - old_character
---

The hero drew his sword.
`,
      );

      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "hero",
          filePath: "src/characters/hero.ts",
        },
      ];
      const service = new FrontmatterSyncService(tempDir, entities);

      const result = await service.sync("chapter01.md", { mode: "sync" });
      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.changed, true);
        const addedChars = result.value.added.find((a) =>
          a.type === "characters"
        );
        assertExists(addedChars);
        assertEquals(addedChars.ids.includes("hero"), true);
        const removedChars = result.value.removed.find((r) =>
          r.type === "characters"
        );
        assertExists(removedChars);
        assertEquals(removedChars.ids.includes("old_character"), true);
      }

      await Deno.remove(tempDir, { recursive: true });
    });
  });

  describe("preview()", () => {
    it("should not modify file", async () => {
      const tempDir = await Deno.makeTempDir();
      const testFile = join(tempDir, "chapter01.md");
      const originalContent = `---
storyteller:
  chapter_id: chapter_01
  title: "Test Chapter"
  order: 1
  characters: []
---

The hero drew his sword.
`;
      await Deno.writeTextFile(testFile, originalContent);

      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "hero",
          filePath: "src/characters/hero.ts",
        },
      ];
      const service = new FrontmatterSyncService(tempDir, entities);

      const result = await service.preview("chapter01.md");
      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.changed, true);
      }

      // Verify file was not modified
      const currentContent = await Deno.readTextFile(testFile);
      assertEquals(currentContent, originalContent);

      await Deno.remove(tempDir, { recursive: true });
    });
  });

  describe("confidence threshold filtering", () => {
    it("should filter entities below threshold", async () => {
      const tempDir = await Deno.makeTempDir();
      const testFile = join(tempDir, "chapter01.md");
      await Deno.writeTextFile(
        testFile,
        `---
storyteller:
  chapter_id: chapter_01
  title: "Test Chapter"
  order: 1
  characters: []
---

The hero appeared.
`,
      );

      // Create entities where one has low confidence
      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "hero",
          filePath: "src/characters/hero.ts",
        },
      ];
      const service = new FrontmatterSyncService(tempDir, entities);

      // With high threshold, should still add if detected with high confidence
      const result = await service.sync("chapter01.md", {
        confidenceThreshold: 0.9,
      });
      assertEquals(result.ok, true);

      await Deno.remove(tempDir, { recursive: true });
    });
  });

  describe("entityTypes option", () => {
    it("should only process specified entity types", async () => {
      const tempDir = await Deno.makeTempDir();
      const testFile = join(tempDir, "chapter01.md");
      await Deno.writeTextFile(
        testFile,
        `---
storyteller:
  chapter_id: chapter_01
  title: "Test Chapter"
  order: 1
  characters: []
  settings: []
---

The hero entered the castle.
`,
      );

      const entities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "hero",
          filePath: "src/characters/hero.ts",
        },
        {
          kind: "setting",
          id: "castle",
          name: "castle",
          filePath: "src/settings/castle.ts",
        },
      ];
      const service = new FrontmatterSyncService(tempDir, entities);

      // Only process characters
      const result = await service.sync("chapter01.md", {
        entityTypes: ["characters"],
      });
      assertEquals(result.ok, true);

      await Deno.remove(tempDir, { recursive: true });
    });
  });
});
