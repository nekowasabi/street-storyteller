import { assertEquals, assertExists } from "@std/assert";
import { ElementCharacterCommand } from "../../src/cli/modules/element/character.ts";
import { ElementSettingCommand } from "../../src/cli/modules/element/setting.ts";
import { createCommandRegistry } from "../../src/cli/command_registry.ts";
import { registerCoreModules } from "../../src/cli/modules/index.ts";
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

// ============================================
// Element command group registration tests
// ============================================

Deno.test("element command: コマンドグループが登録される", () => {
  const registry = createCommandRegistry();
  registerCoreModules(registry);

  const snapshot = registry.snapshot();
  const elementCommand = snapshot.children.find((c) =>
    c.name === "element"
  );
  assertExists(elementCommand, "element command should be registered");
});

Deno.test("element command: character サブコマンドがある", () => {
  const registry = createCommandRegistry();
  registerCoreModules(registry);

  const snapshot = registry.snapshot();
  const elementCommand = snapshot.children.find((c) => c.name === "element");
  assertExists(elementCommand, "element command should exist");

  const characterCommand = elementCommand.children.find((c) =>
    c.name === "character"
  );
  assertExists(characterCommand, "element character command should exist");
});

Deno.test("element command: setting サブコマンドがある", () => {
  const registry = createCommandRegistry();
  registerCoreModules(registry);

  const snapshot = registry.snapshot();
  const elementCommand = snapshot.children.find((c) => c.name === "element");
  assertExists(elementCommand, "element command should exist");

  const settingCommand = elementCommand.children.find((c) =>
    c.name === "setting"
  );
  assertExists(settingCommand, "element setting command should exist");
});

// ============================================
// ElementSettingCommand tests
// ============================================

Deno.test("ElementSettingCommand - コマンド基本情報が正しい", () => {
  const command = new ElementSettingCommand();

  assertEquals(command.name, "setting");
  assertExists(command.path);
  assertEquals(command.path?.join(" "), "element setting");
});

Deno.test("ElementSettingCommand - 基本的なSetting要素を作成できる", async () => {
  const command = new ElementSettingCommand();

  const result = await command.execute(createTestContext({
    name: "王都",
    id: "royal_capital",
    type: "location",
    summary: "王国の中心地",
  }));

  assertEquals(result.ok, true);
  if (result.ok) {
    assertExists(result.value);
  }
});

Deno.test("ElementSettingCommand - 必須パラメータ不足でエラーを返す", async () => {
  const command = new ElementSettingCommand();

  const result = await command.execute(createTestContext({
    // nameがない
    id: "test",
    type: "location",
  }));

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertExists(result.error.message);
  }
});

Deno.test("ElementSettingCommand - 無効なtypeでエラーを返す", async () => {
  const command = new ElementSettingCommand();

  const result = await command.execute(createTestContext({
    name: "テスト",
    id: "test",
    type: "invalid_type",
    summary: "概要",
  }));

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertExists(result.error.message);
    assertEquals(result.error.message.includes("type"), true);
  }
});

// ============================================
// File writing tests (integration tests)
// ============================================

Deno.test("ElementCharacterCommand - ファイルが実際に作成される", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "storyteller_test_" });

  try {
    const command = new ElementCharacterCommand();

    const result = await command.execute(createTestContext({
      name: "test_hero",
      id: "test_hero",
      role: "protagonist",
      summary: "テスト用勇者",
      projectRoot: testDir,
    }));

    assertEquals(result.ok, true, "Command should succeed");

    if (result.ok) {
      // 型アサーション: ElementCreationResult を期待
      const value = result.value as { filePath: string; content: string };

      // ファイルパスが返される
      assertExists(value.filePath, "filePath should exist");

      // 実際のファイルが作成されている
      const fullPath = `${testDir}/${value.filePath}`;
      const stat = await Deno.stat(fullPath).catch(() => null);
      assertExists(stat, `File should exist at ${fullPath}`);

      // ファイル内容にキャラクター情報が含まれる
      const content = await Deno.readTextFile(fullPath);
      assertEquals(content.includes("test_hero"), true, "Content should include character id");
      assertEquals(content.includes("protagonist"), true, "Content should include role");
    }
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});

Deno.test("ElementSettingCommand - ファイルが実際に作成される", async () => {
  const testDir = await Deno.makeTempDir({ prefix: "storyteller_test_" });

  try {
    const command = new ElementSettingCommand();

    const result = await command.execute(createTestContext({
      name: "test_kingdom",
      id: "test_kingdom",
      type: "location",
      summary: "テスト用王国",
      projectRoot: testDir,
    }));

    assertEquals(result.ok, true, "Command should succeed");

    if (result.ok) {
      // 型アサーション: ElementCreationResult を期待
      const value = result.value as { filePath: string; content: string };

      // ファイルパスが返される
      assertExists(value.filePath, "filePath should exist");

      // 実際のファイルが作成されている
      const fullPath = `${testDir}/${value.filePath}`;
      const stat = await Deno.stat(fullPath).catch(() => null);
      assertExists(stat, `File should exist at ${fullPath}`);

      // ファイル内容にSetting情報が含まれる
      const content = await Deno.readTextFile(fullPath);
      assertEquals(content.includes("test_kingdom"), true, "Content should include setting id");
      assertEquals(content.includes("location"), true, "Content should include type");
    }
  } finally {
    await Deno.remove(testDir, { recursive: true });
  }
});
