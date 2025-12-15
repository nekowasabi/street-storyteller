/**
 * SettingPlugin validator tests
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assert, assertEquals } from "../asserts.ts";
import { validateSetting } from "../../src/plugins/core/setting/validator.ts";

Deno.test("validateSetting rejects non-object inputs", () => {
  const result = validateSetting(null);
  assertEquals(result.valid, false);
  assert(result.errors);
  assertEquals(result.errors[0]?.field, "root");
});

Deno.test("validateSetting reports missing required fields", () => {
  const result = validateSetting({});
  assertEquals(result.valid, false);
  const fields = (result.errors ?? []).map((e) => e.field);
  assert(fields.includes("id"));
  assert(fields.includes("name"));
  assert(fields.includes("type"));
  assert(fields.includes("summary"));
  assert(fields.includes("appearingChapters"));
});

Deno.test("validateSetting accepts a valid setting", () => {
  const result = validateSetting({
    id: "royal_capital",
    name: "王都",
    type: "location",
    summary: "王国の中心地。王城を中心に広がる大都市。",
    appearingChapters: ["chapter01"],
  });
  assertEquals(result.valid, true);
});

Deno.test("validateSetting rejects invalid type", () => {
  const result = validateSetting({
    id: "test",
    name: "テスト",
    type: "invalid_type",
    summary: "テスト",
    appearingChapters: [],
  });
  assertEquals(result.valid, false);
  assert(result.errors);
  assertEquals(result.errors[0]?.field, "type");
});

Deno.test("validateSetting accepts all valid setting types", () => {
  const validTypes = ["location", "world", "culture", "organization"];
  for (const type of validTypes) {
    const result = validateSetting({
      id: "test",
      name: "テスト",
      type,
      summary: "テスト概要",
      appearingChapters: [],
    });
    assertEquals(result.valid, true, `type "${type}" should be valid`);
  }
});

Deno.test("validateSetting accepts optional fields", () => {
  const result = validateSetting({
    id: "royal_capital",
    name: "王都",
    type: "location",
    summary: "王国の中心地",
    appearingChapters: ["chapter01"],
    displayNames: ["王都", "首都"],
    relatedSettings: ["kingdom"],
    details: {
      geography: "山に囲まれた盆地",
    },
  });
  assertEquals(result.valid, true);
});
