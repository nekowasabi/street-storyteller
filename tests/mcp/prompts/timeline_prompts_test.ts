/**
 * Timeline MCP Promptsテスト（TDD Red Phase）
 */

import { assertEquals, assertExists } from "@std/assert";
import { timelineBrainstormPrompt } from "../../../src/mcp/prompts/definitions/timeline_brainstorm.ts";
import { eventDetailSuggestPrompt } from "../../../src/mcp/prompts/definitions/event_detail_suggest.ts";
import { causalityAnalysisPrompt } from "../../../src/mcp/prompts/definitions/causality_analysis.ts";
import { timelineConsistencyCheckPrompt } from "../../../src/mcp/prompts/definitions/timeline_consistency_check.ts";

Deno.test("timeline_brainstorm プロンプト", async (t) => {
  await t.step("name が timeline_brainstorm であること", () => {
    assertEquals(timelineBrainstormPrompt.name, "timeline_brainstorm");
  });

  await t.step("description が設定されていること", () => {
    assertExists(timelineBrainstormPrompt.description);
    assertEquals(timelineBrainstormPrompt.description.length > 0, true);
  });

  await t.step("scope 引数が必須であること", () => {
    const scopeArg = timelineBrainstormPrompt.arguments?.find(
      (a) => a.name === "scope"
    );
    assertExists(scopeArg);
    assertEquals(scopeArg.required, true);
  });

  await t.step("getMessages がメッセージを返すこと", () => {
    const messages = timelineBrainstormPrompt.getMessages({
      scope: "story",
      genre: "ファンタジー",
    });
    assertEquals(messages.length >= 2, true);
    assertEquals(messages[0].role, "system");
    assertEquals(messages[1].role, "user");
    assertEquals(messages[1].content.includes("story"), true);
  });
});

Deno.test("event_detail_suggest プロンプト", async (t) => {
  await t.step("name が event_detail_suggest であること", () => {
    assertEquals(eventDetailSuggestPrompt.name, "event_detail_suggest");
  });

  await t.step("event_title 引数が必須であること", () => {
    const arg = eventDetailSuggestPrompt.arguments?.find(
      (a) => a.name === "event_title"
    );
    assertExists(arg);
    assertEquals(arg.required, true);
  });

  await t.step("getMessages がイベントタイトルを含むこと", () => {
    const messages = eventDetailSuggestPrompt.getMessages({
      event_title: "勇者の旅立ち",
      context: "ファンタジー世界の物語",
    });
    assertEquals(messages.length >= 2, true);
    assertEquals(messages[1].content.includes("勇者の旅立ち"), true);
  });
});

Deno.test("causality_analysis プロンプト", async (t) => {
  await t.step("name が causality_analysis であること", () => {
    assertEquals(causalityAnalysisPrompt.name, "causality_analysis");
  });

  await t.step("events 引数が必須であること", () => {
    const arg = causalityAnalysisPrompt.arguments?.find(
      (a) => a.name === "events"
    );
    assertExists(arg);
    assertEquals(arg.required, true);
  });

  await t.step("getMessages がイベント一覧を分析するメッセージを返すこと", () => {
    const events = JSON.stringify([
      { id: "e1", title: "王の死" },
      { id: "e2", title: "王位継承争い" },
    ]);
    const messages = causalityAnalysisPrompt.getMessages({
      events,
    });
    assertEquals(messages.length >= 2, true);
    assertEquals(
      messages[1].content.includes("王の死") || messages[1].content.includes("events"),
      true
    );
  });
});

Deno.test("timeline_consistency_check プロンプト", async (t) => {
  await t.step("name が timeline_consistency_check であること", () => {
    assertEquals(timelineConsistencyCheckPrompt.name, "timeline_consistency_check");
  });

  await t.step("timeline 引数が必須であること", () => {
    const arg = timelineConsistencyCheckPrompt.arguments?.find(
      (a) => a.name === "timeline"
    );
    assertExists(arg);
    assertEquals(arg.required, true);
  });

  await t.step("getMessages がタイムライン整合性チェックを依頼するメッセージを返すこと", () => {
    const timeline = JSON.stringify({
      id: "main",
      name: "メインストーリー",
      events: [{ id: "e1", title: "始まり" }],
    });
    const messages = timelineConsistencyCheckPrompt.getMessages({
      timeline,
    });
    assertEquals(messages.length >= 2, true);
    assertEquals(messages[0].role, "system");
    assertEquals(messages[1].role, "user");
  });
});
