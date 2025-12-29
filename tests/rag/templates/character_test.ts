/**
 * キャラクタードキュメントテンプレートテスト
 * Process 2: キャラクタードキュメントテンプレート
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { generateCharacterDocument } from "@storyteller/rag/templates/character.ts";
import type { Character } from "@storyteller/types/v2/character.ts";

Deno.test("generateCharacterDocument - 基本的なキャラクター", () => {
  const character: Character = {
    id: "cinderella",
    name: "シンデレラ",
    role: "protagonist",
    traits: ["優しい", "忍耐強い", "美しい"],
    relationships: { prince: "romantic", stepmother: "enemy" },
    appearingChapters: ["chapter01", "chapter02"],
    summary: "継母にいじめられながらも優しさを失わない少女",
  };

  const doc = generateCharacterDocument(character);

  // digrag互換タイトル形式確認
  assertStringIncludes(doc.title, "Character:");
  assertStringIncludes(doc.title, "シンデレラ");
  assertEquals(doc.id, "character_cinderella");

  // タグ確認
  assertEquals(doc.tags.includes("character"), true);
  assertEquals(doc.tags.includes("protagonist"), true);
  assertEquals(doc.tags.includes("chapter01"), true);
  assertEquals(doc.tags.includes("chapter02"), true);

  // コンテンツ確認
  assertStringIncludes(doc.content, "## 基本情報");
  assertStringIncludes(doc.content, "役割: protagonist");
  assertStringIncludes(doc.content, "## 関係性");
  assertStringIncludes(doc.content, "prince");
  assertStringIncludes(doc.content, "romantic");
});

Deno.test("generateCharacterDocument - 成長フェーズ付きキャラクター", () => {
  const character: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["勇敢"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "王国を救う勇者",
    phases: [
      {
        id: "phase1",
        name: "出発前",
        order: 1,
        summary: "平凡な日常",
        startChapter: "chapter01",
        delta: {},
      },
      {
        id: "phase2",
        name: "旅立ち",
        order: 2,
        summary: "冒険の始まり",
        startChapter: "chapter02",
        delta: { traits: { add: ["決意"] } },
      },
    ],
  };

  const doc = generateCharacterDocument(character);

  assertStringIncludes(doc.content, "## 成長フェーズ");
  assertStringIncludes(doc.content, "Phase 1");
  assertStringIncludes(doc.content, "出発前");
  assertStringIncludes(doc.content, "平凡な日常");
});

Deno.test("generateCharacterDocument - displayNames付きキャラクター", () => {
  const character: Character = {
    id: "prince",
    name: "王子",
    role: "supporting",
    traits: ["誠実", "高貴"],
    relationships: {},
    appearingChapters: ["chapter02", "chapter03"],
    summary: "国の王子で舞踏会の主催者",
    displayNames: ["殿下", "若君"],
    aliases: ["チャーミング王子"],
  };

  const doc = generateCharacterDocument(character);

  // displayNamesがタグに含まれること
  assertEquals(doc.tags.includes("殿下"), true);
  assertEquals(doc.tags.includes("若君"), true);

  // コンテンツにdisplayNamesとaliasesが含まれること
  assertStringIncludes(doc.content, "## 別名・表記");
  assertStringIncludes(doc.content, "殿下");
  assertStringIncludes(doc.content, "チャーミング王子");
});

Deno.test("generateCharacterDocument - 関係性なしキャラクター", () => {
  const character: Character = {
    id: "minor_char",
    name: "通行人A",
    role: "guest",
    traits: ["目立たない"],
    relationships: {},
    appearingChapters: ["chapter05"],
    summary: "一度だけ登場する通行人",
  };

  const doc = generateCharacterDocument(character);

  // 関係性セクションがない（または空）であること
  // 空の関係性の場合はセクション自体を省略
  assertEquals(doc.content.includes("## 関係性"), false);
});

Deno.test("generateCharacterDocument - 日付形式確認", () => {
  const character: Character = {
    id: "test",
    name: "テスト",
    role: "guest",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "テスト用",
  };

  const doc = generateCharacterDocument(character);

  // 日付がYYYY-MM-DD形式であること
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  assertEquals(datePattern.test(doc.date), true);
});
