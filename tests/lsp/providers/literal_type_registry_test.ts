/**
 * LiteralTypeRegistry テスト
 * リテラル型定義のレジストリをテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  type FieldContext,
  type LiteralTypeDefinition,
  LiteralTypeRegistry,
} from "@storyteller/lsp/providers/literal_type_registry.ts";

Deno.test("LiteralTypeRegistry - returns all 10 definitions", () => {
  const registry = new LiteralTypeRegistry();
  const definitions = registry.getDefinitions();

  // 10種類のリテラル型が定義されていること
  assertEquals(definitions.length, 10);

  // 各定義名を確認
  const typeNames = definitions.map((d) => d.typeName);
  assertEquals(typeNames.includes("ForeshadowingType"), true);
  assertEquals(typeNames.includes("ForeshadowingStatus"), true);
  assertEquals(typeNames.includes("ForeshadowingImportance"), true);
  assertEquals(typeNames.includes("EventCategory"), true);
  assertEquals(typeNames.includes("EventImportance"), true);
  assertEquals(typeNames.includes("TimelineScope"), true);
  assertEquals(typeNames.includes("CharacterRole"), true);
  assertEquals(typeNames.includes("RelationType"), true);
  assertEquals(typeNames.includes("SettingType"), true);
  assertEquals(typeNames.includes("TransitionType"), true);
});

Deno.test("LiteralTypeRegistry - ForeshadowingType has correct values", () => {
  const registry = new LiteralTypeRegistry();
  const def = registry
    .getDefinitions()
    .find((d) => d.typeName === "ForeshadowingType");

  assertExists(def);
  assertEquals(def.values, [
    "hint",
    "prophecy",
    "mystery",
    "symbol",
    "chekhov",
    "red_herring",
  ]);
});

Deno.test("LiteralTypeRegistry - ForeshadowingStatus has correct values", () => {
  const registry = new LiteralTypeRegistry();
  const def = registry
    .getDefinitions()
    .find((d) => d.typeName === "ForeshadowingStatus");

  assertExists(def);
  assertEquals(def.values, [
    "planted",
    "partially_resolved",
    "resolved",
    "abandoned",
  ]);
});

Deno.test("LiteralTypeRegistry - CharacterRole has correct values", () => {
  const registry = new LiteralTypeRegistry();
  const def = registry
    .getDefinitions()
    .find((d) => d.typeName === "CharacterRole");

  assertExists(def);
  assertEquals(def.values, [
    "protagonist",
    "antagonist",
    "supporting",
    "guest",
  ]);
});

Deno.test("LiteralTypeRegistry - RelationType has correct values", () => {
  const registry = new LiteralTypeRegistry();
  const def = registry
    .getDefinitions()
    .find((d) => d.typeName === "RelationType");

  assertExists(def);
  assertEquals(def.values, [
    "ally",
    "enemy",
    "neutral",
    "romantic",
    "respect",
    "competitive",
    "mentor",
  ]);
});

Deno.test("LiteralTypeRegistry - SettingType has correct values", () => {
  const registry = new LiteralTypeRegistry();
  const def = registry
    .getDefinitions()
    .find((d) => d.typeName === "SettingType");

  assertExists(def);
  assertEquals(def.values, ["location", "world", "culture", "organization"]);
});

Deno.test("LiteralTypeRegistry - EventCategory has correct values", () => {
  const registry = new LiteralTypeRegistry();
  const def = registry
    .getDefinitions()
    .find((d) => d.typeName === "EventCategory");

  assertExists(def);
  assertEquals(def.values, [
    "plot_point",
    "character_event",
    "world_event",
    "backstory",
    "foreshadow",
    "climax",
    "resolution",
  ]);
});

Deno.test("LiteralTypeRegistry - TimelineScope has correct values", () => {
  const registry = new LiteralTypeRegistry();
  const def = registry
    .getDefinitions()
    .find((d) => d.typeName === "TimelineScope");

  assertExists(def);
  assertEquals(def.values, ["story", "world", "character", "arc"]);
});

Deno.test("LiteralTypeRegistry - TransitionType has correct values", () => {
  const registry = new LiteralTypeRegistry();
  const def = registry
    .getDefinitions()
    .find((d) => d.typeName === "TransitionType");

  assertExists(def);
  assertEquals(def.values, [
    "gradual",
    "turning_point",
    "revelation",
    "regression",
    "transformation",
  ]);
});

// findByFieldContext テスト
Deno.test("LiteralTypeRegistry - finds ForeshadowingType by type field with Foreshadowing parent", () => {
  const registry = new LiteralTypeRegistry();
  const context: FieldContext = {
    fieldName: "type",
    parentType: "Foreshadowing",
    objectPath: [],
    inStringLiteral: true,
    stringStart: 8,
    stringEnd: -1,
  };

  const def = registry.findByFieldContext(context);
  assertExists(def);
  assertEquals(def.typeName, "ForeshadowingType");
});

Deno.test("LiteralTypeRegistry - finds SettingType by type field with Setting parent", () => {
  const registry = new LiteralTypeRegistry();
  const context: FieldContext = {
    fieldName: "type",
    parentType: "Setting",
    objectPath: [],
    inStringLiteral: true,
    stringStart: 0,
    stringEnd: -1,
  };

  const def = registry.findByFieldContext(context);
  assertExists(def);
  assertEquals(def.typeName, "SettingType");
});

Deno.test("LiteralTypeRegistry - finds CharacterRole by role field", () => {
  const registry = new LiteralTypeRegistry();
  const context: FieldContext = {
    fieldName: "role",
    parentType: "Character",
    objectPath: [],
    inStringLiteral: true,
    stringStart: 0,
    stringEnd: -1,
  };

  const def = registry.findByFieldContext(context);
  assertExists(def);
  assertEquals(def.typeName, "CharacterRole");
});

Deno.test("LiteralTypeRegistry - finds ForeshadowingStatus by status field", () => {
  const registry = new LiteralTypeRegistry();
  const context: FieldContext = {
    fieldName: "status",
    parentType: "Foreshadowing",
    objectPath: [],
    inStringLiteral: true,
    stringStart: 0,
    stringEnd: -1,
  };

  const def = registry.findByFieldContext(context);
  assertExists(def);
  assertEquals(def.typeName, "ForeshadowingStatus");
});

Deno.test("LiteralTypeRegistry - finds EventCategory by category field", () => {
  const registry = new LiteralTypeRegistry();
  const context: FieldContext = {
    fieldName: "category",
    parentType: "TimelineEvent",
    objectPath: [],
    inStringLiteral: true,
    stringStart: 0,
    stringEnd: -1,
  };

  const def = registry.findByFieldContext(context);
  assertExists(def);
  assertEquals(def.typeName, "EventCategory");
});

Deno.test("LiteralTypeRegistry - finds TimelineScope by scope field", () => {
  const registry = new LiteralTypeRegistry();
  const context: FieldContext = {
    fieldName: "scope",
    parentType: "Timeline",
    objectPath: [],
    inStringLiteral: true,
    stringStart: 0,
    stringEnd: -1,
  };

  const def = registry.findByFieldContext(context);
  assertExists(def);
  assertEquals(def.typeName, "TimelineScope");
});

Deno.test("LiteralTypeRegistry - finds RelationType for relationships field value", () => {
  const registry = new LiteralTypeRegistry();
  const context: FieldContext = {
    fieldName: "prince", // relationshipsオブジェクト内のキー
    parentType: "Character",
    objectPath: ["relationships"],
    inStringLiteral: true,
    stringStart: 0,
    stringEnd: -1,
  };

  const def = registry.findByFieldContext(context);
  assertExists(def);
  assertEquals(def.typeName, "RelationType");
});

Deno.test("LiteralTypeRegistry - finds TransitionType by transitionType field", () => {
  const registry = new LiteralTypeRegistry();
  const context: FieldContext = {
    fieldName: "transitionType",
    parentType: "CharacterPhase",
    objectPath: [],
    inStringLiteral: true,
    stringStart: 0,
    stringEnd: -1,
  };

  const def = registry.findByFieldContext(context);
  assertExists(def);
  assertEquals(def.typeName, "TransitionType");
});

Deno.test("LiteralTypeRegistry - returns null for unknown field", () => {
  const registry = new LiteralTypeRegistry();
  const context: FieldContext = {
    fieldName: "unknownField",
    parentType: "Character",
    objectPath: [],
    inStringLiteral: true,
    stringStart: 0,
    stringEnd: -1,
  };

  const def = registry.findByFieldContext(context);
  assertEquals(def, null);
});

Deno.test("LiteralTypeRegistry - returns null when not in string literal", () => {
  const registry = new LiteralTypeRegistry();
  const context: FieldContext = {
    fieldName: "type",
    parentType: "Foreshadowing",
    objectPath: [],
    inStringLiteral: false, // 文字列リテラル外
    stringStart: -1,
    stringEnd: -1,
  };

  const def = registry.findByFieldContext(context);
  assertEquals(def, null);
});

Deno.test("LiteralTypeRegistry - has documentation for ForeshadowingType values", () => {
  const registry = new LiteralTypeRegistry();
  const def = registry
    .getDefinitions()
    .find((d) => d.typeName === "ForeshadowingType");

  assertExists(def);
  assertExists(def.documentation);
  assertExists(def.documentation["chekhov"]);
  assertEquals(
    def.documentation["chekhov"].includes("チェーホフ"),
    true,
  );
});

Deno.test("LiteralTypeRegistry - distinguishes importance by parent type (Foreshadowing vs Event)", () => {
  const registry = new LiteralTypeRegistry();

  // Foreshadowing.importance
  const fContext: FieldContext = {
    fieldName: "importance",
    parentType: "Foreshadowing",
    objectPath: [],
    inStringLiteral: true,
    stringStart: 0,
    stringEnd: -1,
  };
  const fDef = registry.findByFieldContext(fContext);
  assertExists(fDef);
  assertEquals(fDef.typeName, "ForeshadowingImportance");
  assertEquals(fDef.values, ["major", "minor", "subtle"]);

  // TimelineEvent.importance
  const eContext: FieldContext = {
    fieldName: "importance",
    parentType: "TimelineEvent",
    objectPath: [],
    inStringLiteral: true,
    stringStart: 0,
    stringEnd: -1,
  };
  const eDef = registry.findByFieldContext(eContext);
  assertExists(eDef);
  assertEquals(eDef.typeName, "EventImportance");
  assertEquals(eDef.values, ["major", "minor", "background"]);
});
