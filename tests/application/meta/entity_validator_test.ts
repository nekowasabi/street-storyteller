/**
 * EntityValidator テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { EntityValidator } from "@storyteller/application/meta/entity_validator.ts";

// テスト用のプロジェクトパス（cinderellaサンプル）
// ProjectAnalyzerは絶対パスを期待するため、Deno.cwd()で結合
const SAMPLE_PROJECT_PATH = join(Deno.cwd(), "samples/cinderella");

Deno.test("EntityValidator", async (t) => {
  // ========================================
  // process2 sub1: 基本構造とcharacters/settings/foreshadowings/timelinesバリデーション
  // ========================================

  await t.step("存在するcharacter IDはvalidを返す", async () => {
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    const result = await validator.validateIds("characters", ["cinderella"]);

    assertEquals(result.valid, true);
    assertEquals(result.validIds, ["cinderella"]);
    assertEquals(result.invalidIds, []);
  });

  await t.step("存在しないcharacter IDはinvalidを返す", async () => {
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    const result = await validator.validateIds("characters", [
      "nonexistent_hero",
    ]);

    assertEquals(result.valid, false);
    assertEquals(result.validIds, []);
    assertEquals(result.invalidIds, ["nonexistent_hero"]);
  });

  await t.step(
    "複数のcharacter IDを検証できる（一部存在、一部存在しない）",
    async () => {
      const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
      const result = await validator.validateIds("characters", [
        "cinderella",
        "nonexistent_hero",
        "prince",
      ]);

      assertEquals(result.valid, false);
      assertEquals(result.validIds.sort(), ["cinderella", "prince"].sort());
      assertEquals(result.invalidIds, ["nonexistent_hero"]);
    },
  );

  await t.step("存在するsetting IDはvalidを返す", async () => {
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    const result = await validator.validateIds("settings", ["mansion"]);

    assertEquals(result.valid, true);
    assertEquals(result.validIds, ["mansion"]);
    assertEquals(result.invalidIds, []);
  });

  await t.step("存在しないsetting IDはinvalidを返す", async () => {
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    const result = await validator.validateIds("settings", [
      "nonexistent_location",
    ]);

    assertEquals(result.valid, false);
    assertEquals(result.validIds, []);
    assertEquals(result.invalidIds, ["nonexistent_location"]);
  });

  await t.step("存在するforeshadowing IDはvalidを返す", async () => {
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    // 伏線はファイル名がIDになる（日本語ファイル名の場合）
    const result = await validator.validateIds("foreshadowings", [
      "ガラスの靴の伏線",
    ]);

    assertEquals(result.valid, true);
    assertEquals(result.validIds, ["ガラスの靴の伏線"]);
    assertEquals(result.invalidIds, []);
  });

  await t.step("存在しないforeshadowing IDはinvalidを返す", async () => {
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    const result = await validator.validateIds("foreshadowings", [
      "nonexistent_foreshadowing",
    ]);

    assertEquals(result.valid, false);
    assertEquals(result.validIds, []);
    assertEquals(result.invalidIds, ["nonexistent_foreshadowing"]);
  });

  await t.step("存在するtimeline IDはvalidを返す", async () => {
    // NOTE: cinderellaサンプルにはtimelinesディレクトリがないため、
    // 空のディレクトリでのバリデーションをテスト
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    const result = await validator.validateIds("timelines", [
      "nonexistent_timeline",
    ]);

    // timelinesディレクトリが存在しないため、すべてinvalid
    assertEquals(result.valid, false);
    assertEquals(result.invalidIds, ["nonexistent_timeline"]);
  });

  await t.step("空のIDリストはvalidを返す", async () => {
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    const result = await validator.validateIds("characters", []);

    assertEquals(result.valid, true);
    assertEquals(result.validIds, []);
    assertEquals(result.invalidIds, []);
  });

  // ========================================
  // process2 sub2: timeline_eventsとphasesバリデーション
  // ========================================

  await t.step("存在しないtimeline_event IDはinvalidを返す", async () => {
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    const result = await validator.validateIds("timeline_events", [
      "nonexistent_event",
    ]);

    assertEquals(result.valid, false);
    assertEquals(result.invalidIds, ["nonexistent_event"]);
  });

  await t.step("存在しないphase IDはinvalidを返す", async () => {
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    const result = await validator.validateIds("phases", ["nonexistent_phase"]);

    assertEquals(result.valid, false);
    assertEquals(result.invalidIds, ["nonexistent_phase"]);
  });

  await t.step("空のphase IDリストはvalidを返す", async () => {
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    const result = await validator.validateIds("phases", []);

    assertEquals(result.valid, true);
    assertEquals(result.validIds, []);
    assertEquals(result.invalidIds, []);
  });

  await t.step("空のtimeline_events IDリストはvalidを返す", async () => {
    const validator = new EntityValidator(SAMPLE_PROJECT_PATH);
    const result = await validator.validateIds("timeline_events", []);

    assertEquals(result.valid, true);
    assertEquals(result.validIds, []);
    assertEquals(result.invalidIds, []);
  });
});
