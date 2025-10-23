import { assertEquals, assert } from "../../asserts.ts";
import {
  ProjectMetadataSchema,
  parseProjectMetadata,
} from "../../../src/shared/config/schema.ts";
import { z } from "npm:zod";

Deno.test("ProjectMetadataSchema - 基本的な解析", () => {
  const input = {
    version: {
      version: "2.0.0",
      storytellerVersion: "0.3.0",
      created: "2025-01-01T00:00:00.000Z",
      lastUpdated: "2025-01-02T00:00:00.000Z",
    },
    features: {
      character_details: true,
      migration_support: false,
    },
    compatibility: "strict",
  };

  const result = parseProjectMetadata(input);

  assertEquals(result.version.version, "2.0.0");
  assertEquals(result.version.storytellerVersion, "0.3.0");
  assert(result.version.created instanceof Date);
  assert(result.version.lastUpdated instanceof Date);
  assertEquals(result.features.character_details, true);
  assertEquals(result.features.migration_support, false);
  assertEquals(result.compatibility, "strict");
});

Deno.test("ProjectMetadataSchema - デフォルト値", () => {
  const input = {
    version: {
      version: "2.0.0",
      storytellerVersion: "0.3.0",
      created: "2025-01-01T00:00:00.000Z",
      lastUpdated: "2025-01-02T00:00:00.000Z",
    },
    features: {},
    // compatibility省略
  };

  const result = parseProjectMetadata(input);

  assertEquals(result.compatibility, "strict");
  assertEquals(Object.keys(result.features).length, 0);
});

Deno.test("ProjectMetadataSchema - looseモード", () => {
  const input = {
    version: {
      version: "2.0.0",
      storytellerVersion: "0.3.0",
      created: "2025-01-01T00:00:00.000Z",
      lastUpdated: "2025-01-02T00:00:00.000Z",
    },
    features: {},
    compatibility: "loose",
  };

  const result = parseProjectMetadata(input);

  assertEquals(result.compatibility, "loose");
});

Deno.test("ProjectMetadataSchema - 日付型の強制変換", () => {
  const input = {
    version: {
      version: "2.0.0",
      storytellerVersion: "0.3.0",
      created: new Date("2025-01-01"),
      lastUpdated: new Date("2025-01-02"),
    },
    features: {},
    compatibility: "strict",
  };

  const result = parseProjectMetadata(input);

  assert(result.version.created instanceof Date);
  assert(result.version.lastUpdated instanceof Date);
  assertEquals(result.version.created.toISOString().substring(0, 10), "2025-01-01");
});

Deno.test("ProjectMetadataSchema - 検証エラー", () => {
  const invalidInput = {
    version: {
      version: "2.0.0",
      // storytellerVersion省略
      created: "2025-01-01T00:00:00.000Z",
      lastUpdated: "2025-01-02T00:00:00.000Z",
    },
    features: {},
  };

  try {
    parseProjectMetadata(invalidInput);
    assert(false, "Should throw validation error");
  } catch (error) {
    assert(error instanceof z.ZodError);
  }
});

Deno.test("ProjectMetadataSchema - 無効なcompatibilityモード", () => {
  const invalidInput = {
    version: {
      version: "2.0.0",
      storytellerVersion: "0.3.0",
      created: "2025-01-01T00:00:00.000Z",
      lastUpdated: "2025-01-02T00:00:00.000Z",
    },
    features: {},
    compatibility: "invalid",
  };

  try {
    parseProjectMetadata(invalidInput);
    assert(false, "Should throw validation error");
  } catch (error) {
    assert(error instanceof z.ZodError);
  }
});
