/**
 * Setting型（v2）のテスト
 */
import { assertEquals, assertExists } from "@std/assert";
import type {
  Setting,
  SettingDetails,
  SettingType,
} from "../../src/type/v2/setting.ts";

Deno.test("SettingDetails - descriptionフィールドが文字列で設定できる", () => {
  const details: SettingDetails = {
    description: "王国の中心地に位置する壮麗な都市",
  };
  assertEquals(details.description, "王国の中心地に位置する壮麗な都市");
});

Deno.test("SettingDetails - descriptionフィールドがファイル参照で設定できる", () => {
  const details: SettingDetails = {
    description: { file: "descriptions/royal_capital.md" },
  };
  assertExists((details.description as { file: string }).file);
  assertEquals(
    (details.description as { file: string }).file,
    "descriptions/royal_capital.md",
  );
});

Deno.test("SettingDetails - descriptionと他のフィールドを組み合わせて設定できる", () => {
  const details: SettingDetails = {
    description: "王国の首都",
    geography: "大河沿いに位置する",
    history: { file: "history/royal_capital.md" },
  };
  assertEquals(details.description, "王国の首都");
  assertEquals(details.geography, "大河沿いに位置する");
  assertExists((details.history as { file: string }).file);
});

Deno.test("SettingDetails - descriptionは省略可能", () => {
  const details: SettingDetails = {
    geography: "山岳地帯",
  };
  // description is optional, so this should compile without error
  assertEquals(details.geography, "山岳地帯");
  assertEquals(details.description, undefined);
});

Deno.test("Setting - detailsにdescriptionを含めることができる", () => {
  const setting: Setting = {
    id: "royal_capital",
    name: "王都",
    type: "location",
    appearingChapters: ["chapter_01", "chapter_02"],
    summary: "王国の首都",
    details: {
      description: "城壁に囲まれた美しい都市。王城を中心に発展している。",
      geography: "大河沿い",
    },
  };
  assertEquals(
    setting.details?.description,
    "城壁に囲まれた美しい都市。王城を中心に発展している。",
  );
});
