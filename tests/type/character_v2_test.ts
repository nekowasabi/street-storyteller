import { assertEquals, assertExists } from "@std/assert";
import type {
  Character,
  CharacterRole,
  RelationType,
} from "../../src/type/v2/character.ts";
import {
  downgradeCharacterV2toV1,
  migrateCharacterV1toV2,
} from "../../src/type/compat.ts";
import type { Character as CharacterV1 } from "../../src/type/character.ts";

Deno.test("Character型v2 - 基本構造のテスト", () => {
  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave", "kind"],
    relationships: {
      "wizard": "ally",
    },
    appearingChapters: ["chapter01", "chapter02"],
    summary: "世界を救う運命を背負った若者",
  };

  assertExists(character);
  assertEquals(character.name, "勇者");
  assertEquals(character.role, "protagonist");
  assertEquals(character.traits.length, 2);
});

Deno.test("Character型v2 - 詳細情報を含む場合", () => {
  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
    details: {
      appearance: "金髪の青年",
      personality: "正義感が強い",
      backstory: "村で生まれ育った",
      development: {
        initial: "平凡な村人",
        goal: "世界を救う",
        obstacle: "経験不足",
        resolution: "仲間との絆で成長",
      },
    },
  };

  assertExists(character.details);
  assertEquals(character.details.appearance, "金髪の青年");
  assertEquals(character.details.development?.goal, "世界を救う");
});

Deno.test("Character型v2 - ファイル参照を含む詳細情報", () => {
  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
    details: {
      appearance: { file: "details/hero/appearance.md" },
      backstory: { file: "details/hero/backstory.md" },
    },
  };

  assertExists(character.details);
  assertEquals(
    typeof character.details.appearance === "object" &&
      "file" in character.details.appearance,
    true,
  );
});

Deno.test("Character型v2 - 検出ヒントを含む場合", () => {
  const character: Character = {
    id: "hero",
    name: "勇者",
    displayNames: ["勇者", "若者"],
    aliases: ["ヒーロー"],
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
    detectionHints: {
      commonPatterns: ["勇者は", "勇者が", "勇者の"],
      excludePatterns: ["伝説の勇者"],
      confidence: 0.95,
    },
  };

  assertExists(character.detectionHints);
  assertEquals(character.detectionHints.commonPatterns.length, 3);
  assertEquals(character.detectionHints.confidence, 0.95);
});

Deno.test("CharacterRole型 - すべての役割が有効", () => {
  const roles: CharacterRole[] = [
    "protagonist",
    "antagonist",
    "supporting",
    "guest",
  ];

  roles.forEach((role) => {
    const character: Character = {
      id: "test",
      name: "テスト",
      role,
      traits: [],
      relationships: {},
      appearingChapters: [],
      summary: "テスト用",
    };
    assertEquals(character.role, role);
  });
});

Deno.test("RelationType型 - すべての関係性が有効", () => {
  const relations: RelationType[] = [
    "ally",
    "enemy",
    "neutral",
    "romantic",
    "respect",
    "competitive",
    "mentor",
  ];

  relations.forEach((relation) => {
    const character: Character = {
      id: "test",
      name: "テスト",
      role: "protagonist",
      traits: [],
      relationships: { "other": relation },
      appearingChapters: [],
      summary: "テスト用",
    };
    assertEquals(character.relationships["other"], relation);
  });
});

Deno.test("compat - v1からv2へのマイグレーション", () => {
  const v1Character: CharacterV1 = {
    name: "勇者",
  };

  const v2Character = migrateCharacterV1toV2(v1Character);

  assertExists(v2Character);
  assertEquals(v2Character.name, "勇者");
  assertEquals(v2Character.id, "勇者"); // nameをidとして使用
  assertEquals(v2Character.role, "supporting"); // デフォルト役割
  assertEquals(v2Character.traits, []);
  assertEquals(Object.keys(v2Character.relationships).length, 0);
  assertEquals(v2Character.appearingChapters, []);
  assertExists(v2Character.summary);
});

Deno.test("compat - v2からv1へのダウングレード", () => {
  const v2Character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave", "kind"],
    relationships: { "wizard": "ally" },
    appearingChapters: ["chapter01"],
    summary: "世界を救う運命を背負った若者",
    details: {
      appearance: "金髪の青年",
    },
  };

  const v1Character = downgradeCharacterV2toV1(v2Character);

  assertExists(v1Character);
  assertEquals(v1Character.name, "勇者");
  // v1には他のフィールドがないため、nameのみチェック
});

Deno.test("compat - 複雑なv2→v1→v2のラウンドトリップ", () => {
  const original: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
  };

  const v1 = downgradeCharacterV2toV1(original);
  const migrated = migrateCharacterV1toV2(v1);

  assertEquals(migrated.name, original.name);
  // 完全な復元は期待できないが、nameは保持される
});
