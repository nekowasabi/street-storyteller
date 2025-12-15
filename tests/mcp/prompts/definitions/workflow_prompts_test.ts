/**
 * ワークフロープロンプトのテスト（workflow）
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals } from "@std/assert";
import { projectSetupWizardPrompt } from "../../../../src/mcp/prompts/definitions/project_setup_wizard.ts";
import { chapterReviewPrompt } from "../../../../src/mcp/prompts/definitions/chapter_review.ts";
import { consistencyFixPrompt } from "../../../../src/mcp/prompts/definitions/consistency_fix.ts";

Deno.test("project_setup_wizard: name引数を受け取りメッセージを生成する", () => {
  assertEquals(projectSetupWizardPrompt.name, "project_setup_wizard");
  const messages = projectSetupWizardPrompt.getMessages({ name: "my-story" });
  assertEquals(messages.some((m) => m.content.includes("my-story")), true);
});

Deno.test("chapter_review: chapter引数を受け取りメッセージを生成する", () => {
  assertEquals(chapterReviewPrompt.name, "chapter_review");
  const messages = chapterReviewPrompt.getMessages({ chapter: "chapter01" });
  assertEquals(messages.some((m) => m.content.includes("chapter01")), true);
});

Deno.test("consistency_fix: issue引数を受け取りメッセージを生成する", () => {
  assertEquals(consistencyFixPrompt.name, "consistency_fix");
  const messages = consistencyFixPrompt.getMessages({
    issue: "時系列が矛盾している",
  });
  assertEquals(
    messages.some((m) => m.content.includes("時系列が矛盾している")),
    true,
  );
});
