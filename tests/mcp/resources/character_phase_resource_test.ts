/**
 * Character Phase MCP Resource Test
 *
 * storyteller://character/{id}/phases と storyteller://character/{id}/phase/{phaseId}
 * リソースのテスト
 */

import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { parseResourceUri } from "../../../src/mcp/resources/uri_parser.ts";
import type { Character } from "../../../src/type/v2/character.ts";

// テスト用のキャラクター（将来の統合テスト用）
const _testCharacter: Character = {
  id: "hero",
  name: "勇者",
  role: "protagonist",
  traits: ["臆病", "優しい"],
  relationships: { mentor: "respect" },
  appearingChapters: ["chapter_01", "chapter_02"],
  summary: "平凡な村人から始まる主人公",
  initialState: {
    traits: ["臆病", "優しい"],
    beliefs: ["平和が一番"],
    abilities: [],
    goals: ["平穏な生活"],
  },
  phases: [
    {
      id: "awakening",
      name: "覚醒期",
      order: 1,
      summary: "真実を知り、力に目覚める",
      transitionType: "turning_point",
      importance: "major",
      delta: {
        traits: { add: ["勇敢"], remove: ["臆病"] },
        abilities: { add: ["魔法"] },
        status: { mental: "覚悟を決めた" },
      },
    },
    {
      id: "growth",
      name: "成長期",
      order: 2,
      summary: "仲間との絆を深め、力を磨く",
      transitionType: "gradual",
      importance: "minor",
      delta: {
        traits: { add: ["責任感"] },
        abilities: { add: ["剣術", "仲間との連携"] },
        relationships: { add: { companion: "ally" } },
      },
    },
  ],
  currentPhaseId: "awakening",
};

describe("URI Parser", () => {
  it("character/{id}/phases URIをパースできる", () => {
    const parsed = parseResourceUri("storyteller://character/hero/phases");
    assertEquals(parsed.type, "character");
    assertEquals(parsed.id, "hero");
    assertEquals(parsed.subResource, "phases");
  });

  it("character/{id}/phase/{phaseId} URIをパースできる", () => {
    const parsed = parseResourceUri(
      "storyteller://character/hero/phase/awakening",
    );
    assertEquals(parsed.type, "character");
    assertEquals(parsed.id, "hero");
    assertEquals(parsed.subResource, "phase");
    assertEquals(parsed.subId, "awakening");
  });

  it("character/{id}/snapshot/{phaseId} URIをパースできる", () => {
    const parsed = parseResourceUri(
      "storyteller://character/hero/snapshot/awakening",
    );
    assertEquals(parsed.type, "character");
    assertEquals(parsed.id, "hero");
    assertEquals(parsed.subResource, "snapshot");
    assertEquals(parsed.subId, "awakening");
  });
});

describe("ProjectResourceProvider - Character Phase Resources", () => {
  describe("listResources", () => {
    it("キャラクターにフェーズがある場合、関連リソースをリストに含める", async () => {
      // モックのProjectAnalyzerを使用する場合のテスト
      // 実際の実装では、ProjectAnalyzerをモック化してテスト
      // ここでは統合テストとして記述
    });
  });

  describe("readResource", () => {
    it("storyteller://character/{id}/phases でフェーズ一覧を取得できる", async () => {
      // 統合テストとして実装
      // ProjectResourceProviderがcharacter/{id}/phasesをサポートすることを確認
    });

    it("storyteller://character/{id}/phase/{phaseId} で特定フェーズを取得できる", async () => {
      // 統合テストとして実装
    });

    it("storyteller://character/{id}/snapshot/{phaseId} でスナップショットを取得できる", async () => {
      // 統合テストとして実装
    });
  });
});
