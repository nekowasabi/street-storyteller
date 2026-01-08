// tests/application/view/consistency/rules/orphan_character_rule_test.ts
import { assertEquals } from "@std/assert";
import { OrphanCharacterRule } from "@storyteller/application/view/consistency/rules/orphan_character_rule.ts";
import type { ProjectAnalysis } from "@storyteller/application/view/project_analyzer.ts";

Deno.test("OrphanCharacterRule - 孤立キャラクター検出", async (t) => {
  const rule = new OrphanCharacterRule();

  await t.step("関係のないキャラクターを検出する", () => {
    const analysis: ProjectAnalysis = {
      characters: [
        {
          id: "hero",
          name: "勇者",
          displayNames: [],
          role: "protagonist",
          summary: "",
          filePath: "",
          relationships: { villain: "enemy" },
        },
        {
          id: "villain",
          name: "魔王",
          displayNames: [],
          role: "antagonist",
          summary: "",
          filePath: "",
          relationships: { hero: "enemy" },
        },
        {
          id: "orphan",
          name: "孤独な人",
          displayNames: [],
          role: "supporting",
          summary: "",
          filePath: "",
          relationships: {}, // 誰とも関係なし
        },
      ],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };
    const issues = rule.check(analysis);
    assertEquals(issues.length, 1);
    assertEquals(issues[0].entityId, "orphan");
    assertEquals(issues[0].severity, "warning");
  });

  await t.step("全員に関係がある場合は問題なし", () => {
    const analysis: ProjectAnalysis = {
      characters: [
        {
          id: "hero",
          name: "勇者",
          displayNames: [],
          role: "protagonist",
          summary: "",
          filePath: "",
          relationships: { villain: "enemy" },
        },
        {
          id: "villain",
          name: "魔王",
          displayNames: [],
          role: "antagonist",
          summary: "",
          filePath: "",
          relationships: { hero: "enemy" },
        },
      ],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };
    const issues = rule.check(analysis);
    assertEquals(issues.length, 0);
  });

  await t.step("キャラクターがいない場合は問題なし", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };
    const issues = rule.check(analysis);
    assertEquals(issues.length, 0);
  });

  await t.step("一人だけのキャラクターは孤立として検出", () => {
    const analysis: ProjectAnalysis = {
      characters: [
        {
          id: "alone",
          name: "孤独",
          displayNames: [],
          role: "protagonist",
          summary: "",
          filePath: "",
          relationships: {},
        },
      ],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };
    const issues = rule.check(analysis);
    assertEquals(issues.length, 1);
    assertEquals(issues[0].entityId, "alone");
  });

  await t.step("他から参照されているキャラクターは孤立でない", () => {
    const analysis: ProjectAnalysis = {
      characters: [
        {
          id: "hero",
          name: "勇者",
          displayNames: [],
          role: "protagonist",
          summary: "",
          filePath: "",
          relationships: {}, // 自分からは誰も参照しない
        },
        {
          id: "villain",
          name: "魔王",
          displayNames: [],
          role: "antagonist",
          summary: "",
          filePath: "",
          relationships: { hero: "enemy" }, // villainはheroを参照
        },
      ],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };
    const issues = rule.check(analysis);
    // heroはvillainから参照されているので孤立ではない
    assertEquals(issues.length, 0);
  });
});
