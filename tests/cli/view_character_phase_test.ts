/**
 * View Character Phase Command Test
 *
 * storyteller view character --phase オプションのテスト
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  type CharacterLoader,
  ViewCharacterCommand,
  type ViewCharacterResult,
} from "../../src/cli/modules/view/character.ts";
import type { CommandContext } from "../../src/cli/types.ts";
import type { Character } from "../../src/type/v2/character.ts";

// テスト用のモックコンテキスト
function createMockContext(
  args: Record<string, unknown> = {},
): CommandContext & { _logs: string[] } {
  const logs: string[] = [];
  return {
    args,
    logger: {
      info: () => {},
      error: () => {},
      warn: () => {},
      debug: () => {},
      trace: () => {},
      fatal: () => {},
      log: () => {},
      scope: "test",
      withContext: () => ({
        info: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {},
        trace: () => {},
        fatal: () => {},
        log: () => {},
        scope: "test",
        withContext: () => null as unknown as CommandContext["logger"],
      } as CommandContext["logger"]),
    } as CommandContext["logger"],
    presenter: {
      showInfo: (msg: string) => logs.push(msg),
      showError: (msg: string) => logs.push(`ERROR: ${msg}`),
      showSuccess: (msg: string) => logs.push(`SUCCESS: ${msg}`),
      showWarning: (msg: string) => logs.push(`WARN: ${msg}`),
    },
    config: {
      resolve: async () => ({
        runtime: { projectRoot: "/tmp/test-project" },
      }),
    } as CommandContext["config"],
    _logs: logs,
  } as unknown as CommandContext & { _logs: string[] };
}

// テスト用キャラクター
const testCharacter: Character = {
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

// テスト用のモックローダー
class MockCharacterLoader implements CharacterLoader {
  constructor(private readonly character: Character) {}

  async loadCharacter(_id: string): Promise<Character> {
    return this.character;
  }
}

class FailingCharacterLoader implements CharacterLoader {
  constructor(private readonly errorMessage: string) {}

  loadCharacter(_id: string): Promise<Character> {
    throw new Error(this.errorMessage);
  }
}

describe("ViewCharacterCommand", () => {
  describe("--phase オプション", () => {
    it("フェーズIDを指定すると、そのフェーズのスナップショットを表示する", async () => {
      const command = new ViewCharacterCommand(
        new MockCharacterLoader(testCharacter),
      );

      const context = createMockContext({
        id: "hero",
        phase: "awakening",
      });

      const result = await command.execute(context);

      assertEquals(result.ok, true);
      if (result.ok) {
        const value = result.value as ViewCharacterResult;
        assertEquals(value.phaseId, "awakening");
        assertEquals(value.snapshot?.phaseName, "覚醒期");
        assertEquals(value.snapshot?.traits.includes("勇敢"), true);
        assertEquals(value.snapshot?.traits.includes("臆病"), false);
      }
    });

    it("--all-phases オプションで全フェーズのタイムラインを表示する", async () => {
      const command = new ViewCharacterCommand(
        new MockCharacterLoader(testCharacter),
      );

      const context = createMockContext({
        id: "hero",
        "all-phases": true,
      });

      const result = await command.execute(context);

      assertEquals(result.ok, true);
      if (result.ok) {
        const value = result.value as ViewCharacterResult;
        assertEquals(value.timeline?.length, 3); // 初期状態 + 2フェーズ
      }
    });

    it("--diff オプションで2つのフェーズ間の差分を表示する", async () => {
      const command = new ViewCharacterCommand(
        new MockCharacterLoader(testCharacter),
      );

      const context = createMockContext({
        id: "hero",
        diff: true,
        to: "awakening",
      });

      const result = await command.execute(context);

      assertEquals(result.ok, true);
      if (result.ok) {
        const value = result.value as ViewCharacterResult;
        assertEquals(value.diff?.toPhaseId, "awakening");
        assertEquals(value.diff?.changes.traits.added.includes("勇敢"), true);
        assertEquals(value.diff?.changes.traits.removed.includes("臆病"), true);
      }
    });

    it("存在しないフェーズIDを指定するとエラーを返す", async () => {
      const command = new ViewCharacterCommand(
        new MockCharacterLoader(testCharacter),
      );

      const context = createMockContext({
        id: "hero",
        phase: "nonexistent",
      });

      const result = await command.execute(context);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, "phase_not_found");
      }
    });

    it("--json オプションでJSON形式で出力する", async () => {
      const command = new ViewCharacterCommand(
        new MockCharacterLoader(testCharacter),
      );

      const context = createMockContext({
        id: "hero",
        phase: "awakening",
        json: true,
      });

      const result = await command.execute(context);

      assertEquals(result.ok, true);
      // JSON出力が含まれていることを確認
      const jsonOutput = context._logs.find((log) => {
        try {
          JSON.parse(log);
          return true;
        } catch {
          return false;
        }
      });
      assertEquals(jsonOutput !== undefined, true);
    });

    it("フェーズがないキャラクターで--phaseを指定するとエラーを返す", async () => {
      const characterWithoutPhases: Character = {
        ...testCharacter,
        phases: undefined,
      };

      const command = new ViewCharacterCommand(
        new MockCharacterLoader(characterWithoutPhases),
      );

      const context = createMockContext({
        id: "hero",
        phase: "awakening",
      });

      const result = await command.execute(context);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, "no_phases");
      }
    });

    it("キャラクターが見つからない場合はエラーを返す", async () => {
      const command = new ViewCharacterCommand(
        new FailingCharacterLoader("Character not found"),
      );

      const context = createMockContext({
        id: "nonexistent",
        phase: "awakening",
      });

      const result = await command.execute(context);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, "character_not_found");
      }
    });

    it("--diff で --to が指定されていない場合はエラーを返す", async () => {
      const command = new ViewCharacterCommand(
        new MockCharacterLoader(testCharacter),
      );

      const context = createMockContext({
        id: "hero",
        diff: true,
      });

      const result = await command.execute(context);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, "missing_to_phase");
      }
    });
  });

  describe("テキストフォーマット", () => {
    it("スナップショットをテキスト形式でフォーマットする", async () => {
      const command = new ViewCharacterCommand(
        new MockCharacterLoader(testCharacter),
      );

      const context = createMockContext({
        id: "hero",
        phase: "awakening",
      });

      await command.execute(context);

      const output = context._logs.join("\n");
      assertStringIncludes(output, "勇者");
      assertStringIncludes(output, "覚醒期");
      assertStringIncludes(output, "勇敢");
    });

    it("タイムラインをテキスト形式でフォーマットする", async () => {
      const command = new ViewCharacterCommand(
        new MockCharacterLoader(testCharacter),
      );

      const context = createMockContext({
        id: "hero",
        "all-phases": true,
      });

      await command.execute(context);

      const output = context._logs.join("\n");
      assertStringIncludes(output, "初期状態");
      assertStringIncludes(output, "覚醒期");
      assertStringIncludes(output, "成長期");
    });

    it("差分をテキスト形式でフォーマットする", async () => {
      const command = new ViewCharacterCommand(
        new MockCharacterLoader(testCharacter),
      );

      const context = createMockContext({
        id: "hero",
        diff: true,
        to: "awakening",
      });

      await command.execute(context);

      const output = context._logs.join("\n");
      assertStringIncludes(output, "Phase Diff");
      assertStringIncludes(output, "勇敢");
      assertStringIncludes(output, "臆病");
    });

    it("基本キャラクター情報をテキスト形式でフォーマットする", async () => {
      const command = new ViewCharacterCommand(
        new MockCharacterLoader(testCharacter),
      );

      const context = createMockContext({
        id: "hero",
      });

      await command.execute(context);

      const output = context._logs.join("\n");
      assertStringIncludes(output, "勇者");
      assertStringIncludes(output, "protagonist");
      assertStringIncludes(output, "平凡な村人");
    });
  });

  describe("ヘルプ表示", () => {
    it("IDなしで実行するとヘルプを表示する", async () => {
      const command = new ViewCharacterCommand(
        new MockCharacterLoader(testCharacter),
      );

      const context = createMockContext({});

      const result = await command.execute(context);

      assertEquals(result.ok, true);
      const output = context._logs.join("\n");
      assertStringIncludes(output, "view character");
      assertStringIncludes(output, "--phase");
      assertStringIncludes(output, "--all-phases");
    });
  });
});
