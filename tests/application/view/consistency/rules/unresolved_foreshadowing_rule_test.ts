// tests/application/view/consistency/rules/unresolved_foreshadowing_rule_test.ts
import { assertEquals } from "@std/assert";
import { UnresolvedForeshadowingRule } from "@storyteller/application/view/consistency/rules/unresolved_foreshadowing_rule.ts";
import type { ProjectAnalysis } from "@storyteller/application/view/project_analyzer.ts";

Deno.test("UnresolvedForeshadowingRule - 未回収伏線検出", async (t) => {
  const rule = new UnresolvedForeshadowingRule();

  await t.step("planted状態の伏線を検出する", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "hint_01",
          name: "伏線1",
          type: "hint",
          status: "planted",
          plantingChapter: "chapter_01",
          plantingDescription: "",
          resolutions: [],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "",
        },
      ],
      manuscripts: [],
    };
    const issues = rule.check(analysis);
    assertEquals(issues.length, 1);
    assertEquals(issues[0].entityId, "hint_01");
    assertEquals(issues[0].type, "unresolved_foreshadowing");
    assertEquals(issues[0].severity, "warning");
  });

  await t.step("resolved状態の伏線は問題なし", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "hint_01",
          name: "伏線1",
          type: "hint",
          status: "resolved",
          plantingChapter: "chapter_01",
          plantingDescription: "",
          resolutions: [{
            chapter: "chapter_10",
            description: "回収",
            completeness: 1.0,
          }],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "",
        },
      ],
      manuscripts: [],
    };
    const issues = rule.check(analysis);
    assertEquals(issues.length, 0);
  });

  await t.step("partially_resolved状態は情報として検出", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "hint_01",
          name: "伏線1",
          type: "hint",
          status: "partially_resolved",
          plantingChapter: "chapter_01",
          plantingDescription: "",
          resolutions: [{
            chapter: "chapter_05",
            description: "一部回収",
            completeness: 0.5,
          }],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "",
        },
      ],
      manuscripts: [],
    };
    const issues = rule.check(analysis);
    assertEquals(issues.length, 1);
    assertEquals(issues[0].severity, "info");
  });

  await t.step("abandoned状態も情報として検出", () => {
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "hint_01",
          name: "伏線1",
          type: "hint",
          status: "abandoned",
          plantingChapter: "chapter_01",
          plantingDescription: "",
          resolutions: [],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "",
        },
      ],
      manuscripts: [],
    };
    const issues = rule.check(analysis);
    assertEquals(issues.length, 1);
    assertEquals(issues[0].severity, "info");
  });
});
