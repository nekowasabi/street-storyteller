import { assertEquals, assertExists } from "@std/assert";
import { ElementCharacterCommand } from "../../src/cli/modules/element/character.ts";
import { createCommandRegistry } from "../../src/cli/command_registry.ts";
import { createStubLogger } from "../asserts.ts";
import type {
  CommandContext,
  ConfigurationManagerRef,
  OutputPresenter,
} from "../../src/cli/types.ts";
import type { AppConfig } from "../../src/shared/config/schema.ts";

function createStubPresenter(): OutputPresenter {
  return {
    showInfo: () => {},
    showSuccess: () => {},
    showWarning: () => {},
    showError: () => {},
  };
}

function createStubConfig(): ConfigurationManagerRef {
  const config: AppConfig = {
    runtime: { environment: "test", paths: {} },
    logging: {
      level: "info",
      format: "human",
      color: false,
      timestamps: false,
    },
    features: {},
    cache: { defaultTtlSeconds: 900 },
    external: { providers: [] },
  };
  return {
    resolve: async () => config,
  };
}

function createTestContext(args: Record<string, unknown>): CommandContext {
  return {
    args,
    logger: createStubLogger(),
    presenter: createStubPresenter(),
    config: createStubConfig(),
  };
}

Deno.test("ElementCharacterCommand - コマンド基本情報が正しい", () => {
  const command = new ElementCharacterCommand();

  assertEquals(command.name, "character");
  assertExists(command.path);
  assertEquals(command.path?.join(" "), "element character");
});

Deno.test("ElementCharacterCommand - レジストリに登録できる", () => {
  const registry = createCommandRegistry();
  const command = new ElementCharacterCommand();

  registry.register(command);

  const resolved = registry.resolve("element character");
  assertExists(resolved);
  assertEquals(resolved.name, "character");
});

Deno.test("ElementCharacterCommand - 基本的なCharacter要素を作成できる", async () => {
  const command = new ElementCharacterCommand();

  const result = await command.execute(createTestContext({
    name: "hero",
    id: "hero",
    role: "protagonist",
    summary: "勇者の概要",
  }));

  assertEquals(result.ok, true);
  if (result.ok) {
    // 実行成功の場合、何らかの出力があるはず
    assertExists(result.value);
  }
});

Deno.test("ElementCharacterCommand - --with-detailsオプションで詳細付き要素を作成できる", async () => {
  const command = new ElementCharacterCommand();

  const result = await command.execute(createTestContext({
    name: "hero",
    id: "hero",
    role: "protagonist",
    summary: "勇者の概要",
    "with-details": true,
  }));

  assertEquals(result.ok, true);
  if (result.ok) {
    assertExists(result.value);
  }
});

Deno.test("ElementCharacterCommand - --add-detailsオプションで特定の詳細を追加できる", async () => {
  const command = new ElementCharacterCommand();

  const result = await command.execute(createTestContext({
    name: "hero",
    id: "hero",
    role: "protagonist",
    summary: "勇者の概要",
    "add-details": "appearance,backstory",
  }));

  assertEquals(result.ok, true);
  if (result.ok) {
    assertExists(result.value);
  }
});

Deno.test("ElementCharacterCommand - 必須パラメータ不足でエラーを返す", async () => {
  const command = new ElementCharacterCommand();

  const result = await command.execute(createTestContext({
    // nameがない
    id: "hero",
    role: "protagonist",
  }));

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertExists(result.error.message);
  }
});

Deno.test("ElementCharacterCommand - 無効なroleでエラーを返す", async () => {
  const command = new ElementCharacterCommand();

  const result = await command.execute(createTestContext({
    name: "hero",
    id: "hero",
    role: "invalid_role", // 無効な役割
    summary: "勇者の概要",
  }));

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertExists(result.error.message);
    assertEquals(result.error.message.includes("role"), true);
  }
});
