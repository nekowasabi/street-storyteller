import { assert, assertEquals, assertFalse } from "../asserts.ts";
import {
  createPluginRegistry,
  type StorytellerPlugin,
} from "../../src/core/plugin_system.ts";

Deno.test("PluginRegistry - 基本的なプラグイン登録", () => {
  const registry = createPluginRegistry();

  const testPlugin: StorytellerPlugin = {
    meta: {
      id: "test-plugin",
      version: "1.0.0",
      name: "Test Plugin",
    },
  };

  registry.register(testPlugin);

  const resolved = registry.resolve("test-plugin");
  assertEquals(resolved?.meta.id, "test-plugin");
});

Deno.test("PluginRegistry - 依存関係の検証（正常系）", () => {
  const registry = createPluginRegistry();

  const basePlugin: StorytellerPlugin = {
    meta: {
      id: "base-plugin",
      version: "1.0.0",
      name: "Base Plugin",
    },
  };

  const dependentPlugin: StorytellerPlugin = {
    meta: {
      id: "dependent-plugin",
      version: "1.0.0",
      name: "Dependent Plugin",
    },
    dependencies: ["base-plugin"],
  };

  registry.register(basePlugin);
  registry.register(dependentPlugin);

  const result = registry.validate();
  assert(result.ok, "依存関係が正しい場合は検証が成功するべき");
});

Deno.test("PluginRegistry - 依存関係の検証（欠損検出）", () => {
  const registry = createPluginRegistry();

  const dependentPlugin: StorytellerPlugin = {
    meta: {
      id: "dependent-plugin",
      version: "1.0.0",
      name: "Dependent Plugin",
    },
    dependencies: ["missing-plugin"],
  };

  registry.register(dependentPlugin);

  const result = registry.validate();
  assertFalse(result.ok, "依存関係が欠損している場合は検証が失敗するべき");
  if (!result.ok) {
    assert(
      result.error.some((err) => err.code === "missing_dependency"),
      "missing_dependencyエラーが含まれるべき",
    );
  }
});

Deno.test("PluginRegistry - 循環依存の検出（2要素の循環）", () => {
  const registry = createPluginRegistry();

  const pluginA: StorytellerPlugin = {
    meta: {
      id: "plugin-a",
      version: "1.0.0",
      name: "Plugin A",
    },
    dependencies: ["plugin-b"],
  };

  const pluginB: StorytellerPlugin = {
    meta: {
      id: "plugin-b",
      version: "1.0.0",
      name: "Plugin B",
    },
    dependencies: ["plugin-a"],
  };

  registry.register(pluginA);
  registry.register(pluginB);

  const result = registry.validate();
  assertFalse(result.ok, "循環依存がある場合は検証が失敗するべき");
  if (!result.ok) {
    assert(
      result.error.some((err) => err.code === "circular_dependency"),
      "circular_dependencyエラーが含まれるべき",
    );
  }
});

Deno.test("PluginRegistry - 循環依存の検出（3要素の循環）", () => {
  const registry = createPluginRegistry();

  const pluginA: StorytellerPlugin = {
    meta: {
      id: "plugin-a",
      version: "1.0.0",
      name: "Plugin A",
    },
    dependencies: ["plugin-b"],
  };

  const pluginB: StorytellerPlugin = {
    meta: {
      id: "plugin-b",
      version: "1.0.0",
      name: "Plugin B",
    },
    dependencies: ["plugin-c"],
  };

  const pluginC: StorytellerPlugin = {
    meta: {
      id: "plugin-c",
      version: "1.0.0",
      name: "Plugin C",
    },
    dependencies: ["plugin-a"],
  };

  registry.register(pluginA);
  registry.register(pluginB);
  registry.register(pluginC);

  const result = registry.validate();
  assertFalse(result.ok, "循環依存がある場合は検証が失敗するべき");
  if (!result.ok) {
    assert(
      result.error.some((err) => err.code === "circular_dependency"),
      "circular_dependencyエラーが含まれるべき",
    );
  }
});

Deno.test("PluginRegistry - 初期化順序（トポロジカルソート）", async () => {
  const registry = createPluginRegistry();
  const initOrder: string[] = [];

  const pluginA: StorytellerPlugin = {
    meta: {
      id: "plugin-a",
      version: "1.0.0",
      name: "Plugin A",
    },
    initialize: async () => {
      initOrder.push("plugin-a");
    },
  };

  const pluginB: StorytellerPlugin = {
    meta: {
      id: "plugin-b",
      version: "1.0.0",
      name: "Plugin B",
    },
    dependencies: ["plugin-a"],
    initialize: async () => {
      initOrder.push("plugin-b");
    },
  };

  const pluginC: StorytellerPlugin = {
    meta: {
      id: "plugin-c",
      version: "1.0.0",
      name: "Plugin C",
    },
    dependencies: ["plugin-a", "plugin-b"],
    initialize: async () => {
      initOrder.push("plugin-c");
    },
  };

  registry.register(pluginA);
  registry.register(pluginB);
  registry.register(pluginC);

  const context = { pluginId: "test" };
  await registry.initializeAll(context);

  // plugin-a → plugin-b → plugin-c の順序で初期化されるべき
  assertEquals(initOrder[0], "plugin-a");
  assertEquals(initOrder[1], "plugin-b");
  assertEquals(initOrder[2], "plugin-c");
});

Deno.test("PluginRegistry - 初期化（依存関係なし）", async () => {
  const registry = createPluginRegistry();
  const initOrder: string[] = [];

  const pluginA: StorytellerPlugin = {
    meta: {
      id: "plugin-a",
      version: "1.0.0",
      name: "Plugin A",
    },
    initialize: async () => {
      initOrder.push("plugin-a");
    },
  };

  const pluginB: StorytellerPlugin = {
    meta: {
      id: "plugin-b",
      version: "1.0.0",
      name: "Plugin B",
    },
    initialize: async () => {
      initOrder.push("plugin-b");
    },
  };

  registry.register(pluginA);
  registry.register(pluginB);

  const context = { pluginId: "test" };
  await registry.initializeAll(context);

  // 依存関係がないので、どちらが先でもOK（両方が初期化されればOK）
  assert(initOrder.includes("plugin-a"), "plugin-aが初期化されるべき");
  assert(initOrder.includes("plugin-b"), "plugin-bが初期化されるべき");
  assertEquals(initOrder.length, 2);
});
