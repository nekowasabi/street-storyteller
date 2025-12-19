/**
 * CharacterPhaseResolver テスト
 * TDD Red-Green-Refactorサイクルに従って作成
 */

import { assertEquals, assertThrows } from "@std/assert";
import { CharacterPhaseResolver } from "@storyteller/application/character_phase_resolver.ts";
import type { Character } from "@storyteller/types/v2/character.ts";

// テスト用キャラクターデータ
function createTestCharacter(): Character {
  return {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["臆病", "優しい"],
    relationships: { mentor: "respect" },
    appearingChapters: ["chapter1", "chapter2"],
    summary: "平凡な村人",
    initialState: {
      traits: ["臆病", "優しい"],
      beliefs: ["平和が一番"],
      abilities: [],
      relationships: { mentor: "respect" },
      appearance: ["黒髪", "普通の体格"],
      goals: ["平穏な生活"],
    },
    phases: [
      {
        id: "awakening",
        name: "覚醒期",
        order: 1,
        summary: "真実を知り、力に目覚める",
        transitionType: "turning_point",
        triggerEventId: "discovery_of_truth",
        delta: {
          traits: { add: ["勇敢"], remove: ["臆病"] },
          abilities: { add: ["魔法"] },
          beliefs: { add: ["正義を貫く"] },
          status: { mental: "覚悟を決めた" },
        },
      },
      {
        id: "growth",
        name: "成長期",
        order: 2,
        summary: "仲間と共に成長する",
        transitionType: "gradual",
        delta: {
          traits: { add: ["リーダーシップ"] },
          abilities: { add: ["剣術"], improve: ["魔法"] },
          relationships: { add: { companion: "ally" } },
          goals: { add: ["魔王を倒す"], remove: ["平穏な生活"] },
        },
      },
    ],
    currentPhaseId: "awakening",
  };
}

Deno.test("CharacterPhaseResolver", async (t) => {
  await t.step("resolveInitialState - 初期状態を取得する", () => {
    const character = createTestCharacter();
    const resolver = new CharacterPhaseResolver();

    const snapshot = resolver.resolveInitialState(character);

    assertEquals(snapshot.characterId, "hero");
    assertEquals(snapshot.phaseId, null);
    assertEquals(snapshot.phaseName, "初期状態");
    assertEquals(snapshot.traits, ["臆病", "優しい"]);
    assertEquals(snapshot.beliefs, ["平和が一番"]);
    assertEquals(snapshot.abilities, []);
    assertEquals(snapshot.relationships, { mentor: "respect" });
    assertEquals(snapshot.appearance, ["黒髪", "普通の体格"]);
    assertEquals(snapshot.goals, ["平穏な生活"]);
    assertEquals(snapshot.baseCharacter.id, "hero");
    assertEquals(snapshot.baseCharacter.name, "勇者");
    assertEquals(snapshot.baseCharacter.role, "protagonist");
  });

  await t.step(
    "resolveInitialState - initialStateがない場合はtraitsから推論する",
    () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["臆病", "優しい"],
        relationships: { mentor: "respect" },
        appearingChapters: ["chapter1"],
        summary: "平凡な村人",
      };
      const resolver = new CharacterPhaseResolver();

      const snapshot = resolver.resolveInitialState(character);

      assertEquals(snapshot.traits, ["臆病", "優しい"]);
      assertEquals(snapshot.relationships, { mentor: "respect" });
      assertEquals(snapshot.beliefs, []);
      assertEquals(snapshot.abilities, []);
    },
  );

  await t.step("resolveAtPhase - 指定フェーズまでの差分を適用する", () => {
    const character = createTestCharacter();
    const resolver = new CharacterPhaseResolver();

    const snapshot = resolver.resolveAtPhase(character, "awakening");

    assertEquals(snapshot.phaseId, "awakening");
    assertEquals(snapshot.phaseName, "覚醒期");
    // "臆病"が削除され"勇敢"が追加
    assertEquals(snapshot.traits.includes("勇敢"), true);
    assertEquals(snapshot.traits.includes("臆病"), false);
    assertEquals(snapshot.traits.includes("優しい"), true);
    // 能力が追加
    assertEquals(snapshot.abilities.includes("魔法"), true);
    // 信条が追加
    assertEquals(snapshot.beliefs.includes("正義を貫く"), true);
    assertEquals(snapshot.beliefs.includes("平和が一番"), true);
    // ステータス
    assertEquals(snapshot.status?.mental, "覚悟を決めた");
  });

  await t.step("resolveAtPhase - 複数フェーズを順次適用する", () => {
    const character = createTestCharacter();
    const resolver = new CharacterPhaseResolver();

    const snapshot = resolver.resolveAtPhase(character, "growth");

    assertEquals(snapshot.phaseId, "growth");
    assertEquals(snapshot.phaseName, "成長期");
    // Phase 1 + Phase 2の差分が適用される
    assertEquals(snapshot.traits.includes("勇敢"), true);
    assertEquals(snapshot.traits.includes("リーダーシップ"), true);
    assertEquals(snapshot.traits.includes("臆病"), false);
    assertEquals(snapshot.abilities.includes("魔法"), true);
    assertEquals(snapshot.abilities.includes("剣術"), true);
    assertEquals(snapshot.relationships.companion, "ally");
    assertEquals(snapshot.goals.includes("魔王を倒す"), true);
    assertEquals(snapshot.goals.includes("平穏な生活"), false);
  });

  await t.step(
    "resolveAtPhase - 存在しないフェーズIDでエラーを投げる",
    () => {
      const character = createTestCharacter();
      const resolver = new CharacterPhaseResolver();

      assertThrows(
        () => resolver.resolveAtPhase(character, "nonexistent"),
        Error,
        "Phase not found: nonexistent",
      );
    },
  );

  await t.step(
    "resolveAtPhase - phasesがない場合は初期状態を返す",
    () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["臆病"],
        relationships: {},
        appearingChapters: [],
        summary: "主人公",
      };
      const resolver = new CharacterPhaseResolver();

      // phasesがない場合、どのフェーズIDでもエラー
      assertThrows(
        () => resolver.resolveAtPhase(character, "awakening"),
        Error,
        "Character has no phases",
      );
    },
  );

  await t.step("resolveCurrentPhase - currentPhaseIdの状態を取得する", () => {
    const character = createTestCharacter();
    const resolver = new CharacterPhaseResolver();

    const snapshot = resolver.resolveCurrentPhase(character);

    assertEquals(snapshot.phaseId, "awakening");
    assertEquals(snapshot.phaseName, "覚醒期");
  });

  await t.step(
    "resolveCurrentPhase - currentPhaseIdがない場合は初期状態を返す",
    () => {
      const character: Character = {
        ...createTestCharacter(),
        currentPhaseId: undefined,
      };
      const resolver = new CharacterPhaseResolver();

      const snapshot = resolver.resolveCurrentPhase(character);

      assertEquals(snapshot.phaseId, null);
      assertEquals(snapshot.phaseName, "初期状態");
    },
  );

  await t.step(
    "resolveAllPhases - すべてのフェーズのスナップショットを取得する",
    () => {
      const character = createTestCharacter();
      const resolver = new CharacterPhaseResolver();

      const snapshots = resolver.resolveAllPhases(character);

      // 初期状態 + 2フェーズ = 3つのスナップショット
      assertEquals(snapshots.length, 3);
      assertEquals(snapshots[0].phaseId, null);
      assertEquals(snapshots[0].phaseName, "初期状態");
      assertEquals(snapshots[1].phaseId, "awakening");
      assertEquals(snapshots[2].phaseId, "growth");
    },
  );

  await t.step(
    "comparePhaseDiff - 2つのフェーズ間の差分を取得する",
    () => {
      const character = createTestCharacter();
      const resolver = new CharacterPhaseResolver();

      const diff = resolver.comparePhaseDiff(character, null, "awakening");

      assertEquals(diff.fromPhaseId, null);
      assertEquals(diff.toPhaseId, "awakening");
      assertEquals(diff.fromPhaseName, "初期状態");
      assertEquals(diff.toPhaseName, "覚醒期");
      assertEquals(diff.changes.traits.added.includes("勇敢"), true);
      assertEquals(diff.changes.traits.removed.includes("臆病"), true);
      assertEquals(diff.changes.abilities.added.includes("魔法"), true);
    },
  );

  await t.step(
    "comparePhaseDiff - フェーズ間の差分を取得する",
    () => {
      const character = createTestCharacter();
      const resolver = new CharacterPhaseResolver();

      const diff = resolver.comparePhaseDiff(character, "awakening", "growth");

      assertEquals(diff.fromPhaseId, "awakening");
      assertEquals(diff.toPhaseId, "growth");
      assertEquals(diff.changes.traits.added.includes("リーダーシップ"), true);
      assertEquals(diff.changes.abilities.added.includes("剣術"), true);
      assertEquals(diff.changes.relationships.added?.companion, "ally");
    },
  );

  await t.step(
    "getPhaseTimeline - フェーズタイムラインエントリを取得する",
    () => {
      const character = createTestCharacter();
      const resolver = new CharacterPhaseResolver();

      const timeline = resolver.getPhaseTimeline(character);

      assertEquals(timeline.length, 3);
      assertEquals(timeline[0].phaseId, null);
      assertEquals(timeline[0].order, 0);
      assertEquals(timeline[1].phaseId, "awakening");
      assertEquals(timeline[1].order, 1);
      assertEquals(timeline[1].transitionType, "turning_point");
      assertEquals(timeline[2].phaseId, "growth");
      assertEquals(timeline[2].order, 2);
    },
  );

  await t.step(
    "getPhaseTimeline - keyChangesが主な変化を含む",
    () => {
      const character = createTestCharacter();
      const resolver = new CharacterPhaseResolver();

      const timeline = resolver.getPhaseTimeline(character);

      // awakeningフェーズのkeyChanges
      assertEquals(timeline[1].keyChanges.length > 0, true);
      // 特性の追加・削除が含まれる
      const awakeningChanges = timeline[1].keyChanges.join(" ");
      assertEquals(
        awakeningChanges.includes("勇敢") || awakeningChanges.includes("臆病"),
        true,
      );
    },
  );
});
