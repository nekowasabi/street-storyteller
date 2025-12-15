/**
 * UI統合テスト
 * Claude Desktop (MCP), Claude Code (Slash Commands), Neovim (Denops) の
 * 統合が正しく機能することを確認する
 */

import { assertEquals, assertExists } from "@std/assert";
import { existsSync } from "@std/fs";

// =============================================================================
// テスト: システムプロンプトドキュメントの存在確認
// =============================================================================

Deno.test("UI Integration - System Prompts Documentation", async (t) => {
  const promptsDir = "docs/prompts";

  await t.step("core.md exists and has required sections", async () => {
    const path = `${promptsDir}/core.md`;
    assertEquals(existsSync(path), true, `${path} should exist`);

    const content = await Deno.readTextFile(path);
    assertExists(
      content.match(/SaC.*StoryWriting as Code/i),
      "Should mention SaC concept",
    );
    assertExists(
      content.match(/参照システム/),
      "Should describe reference system",
    );
  });

  await t.step("director.md exists and has required sections", async () => {
    const path = `${promptsDir}/director.md`;
    assertEquals(existsSync(path), true, `${path} should exist`);

    const content = await Deno.readTextFile(path);
    assertExists(
      content.match(/ディレクター/),
      "Should describe director role",
    );
    assertExists(
      content.match(/回答フォーマット|応答フォーマット/),
      "Should have response format",
    );
  });

  await t.step("claude-desktop.md exists", async () => {
    const path = `${promptsDir}/claude-desktop.md`;
    assertEquals(existsSync(path), true, `${path} should exist`);

    const content = await Deno.readTextFile(path);
    assertExists(content.match(/MCP/i), "Should mention MCP");
    assertExists(content.match(/ツール/), "Should describe tools");
  });

  await t.step("claude-code.md exists", async () => {
    const path = `${promptsDir}/claude-code.md`;
    assertEquals(existsSync(path), true, `${path} should exist`);

    const content = await Deno.readTextFile(path);
    assertExists(content.match(/CLI/), "Should mention CLI");
    assertExists(
      content.match(/storyteller/),
      "Should mention storyteller command",
    );
  });

  await t.step("neovim.md exists", async () => {
    const path = `${promptsDir}/neovim.md`;
    assertEquals(existsSync(path), true, `${path} should exist`);

    const content = await Deno.readTextFile(path);
    assertExists(content.match(/Denops/i), "Should mention Denops");
    assertExists(
      content.match(/StoryDirector/),
      "Should describe StoryDirector command",
    );
  });
});

// =============================================================================
// テスト: MCP story_director プロンプトの統合
// =============================================================================

Deno.test("UI Integration - MCP story_director Prompt", async (t) => {
  await t.step("story_director.ts exists", () => {
    const path = "src/mcp/prompts/definitions/story_director.ts";
    assertEquals(existsSync(path), true, `${path} should exist`);
  });

  await t.step("story_director is registered in prompts handler", async () => {
    const handlerPath = "src/mcp/server/handlers/prompts.ts";
    const content = await Deno.readTextFile(handlerPath);

    assertExists(
      content.match(/storyDirectorPrompt/),
      "Prompts handler should import storyDirectorPrompt",
    );
    assertExists(
      content.match(/registry\.register\(storyDirectorPrompt\)/),
      "Prompts handler should register storyDirectorPrompt",
    );
  });
});

// =============================================================================
// テスト: Claude Code スラッシュコマンドの統合
// =============================================================================

Deno.test("UI Integration - Claude Code Slash Commands", async (t) => {
  const commandsDir = ".claude/commands";

  await t.step("story-director.md exists", async () => {
    const path = `${commandsDir}/story-director.md`;
    assertEquals(existsSync(path), true, `${path} should exist`);

    const content = await Deno.readTextFile(path);
    assertExists(
      content.match(/ディレクター/),
      "Should describe director role",
    );
  });

  await t.step("story-check.md exists", async () => {
    const path = `${commandsDir}/story-check.md`;
    assertEquals(existsSync(path), true, `${path} should exist`);

    const content = await Deno.readTextFile(path);
    assertExists(
      content.match(/lsp.*validate/i),
      "Should mention lsp validate",
    );
  });

  await t.step("story-char.md exists", async () => {
    const path = `${commandsDir}/story-char.md`;
    assertEquals(existsSync(path), true, `${path} should exist`);

    const content = await Deno.readTextFile(path);
    assertExists(content.match(/character/i), "Should mention character");
  });

  await t.step("story-view.md exists", async () => {
    const path = `${commandsDir}/story-view.md`;
    assertEquals(existsSync(path), true, `${path} should exist`);

    const content = await Deno.readTextFile(path);
    assertExists(content.match(/view/i), "Should mention view");
  });
});

// =============================================================================
// テスト: Denopsプラグインの統合（ファイル存在確認のみ）
// =============================================================================

Deno.test("UI Integration - Denops Plugin Structure", async (t) => {
  const pluginDir = `${
    Deno.env.get("HOME")
  }/.config/nvim/plugged/street-storyteller.vim`;

  await t.step("plugin directory exists", () => {
    assertEquals(existsSync(pluginDir), true, `${pluginDir} should exist`);
  });

  await t.step("plugin/storyteller.vim exists", () => {
    const path = `${pluginDir}/plugin/storyteller.vim`;
    assertEquals(existsSync(path), true, `${path} should exist`);
  });

  await t.step("denops/storyteller/main.ts exists", () => {
    const path = `${pluginDir}/denops/storyteller/main.ts`;
    assertEquals(existsSync(path), true, `${path} should exist`);
  });

  await t.step("denops/storyteller/deps.ts exists", () => {
    const path = `${pluginDir}/denops/storyteller/deps.ts`;
    assertEquals(existsSync(path), true, `${path} should exist`);
  });

  await t.step("all command files exist", async (t2) => {
    const commands = ["director", "improve", "ask", "validate"];

    for (const cmd of commands) {
      await t2.step(`commands/${cmd}.ts exists`, () => {
        const path = `${pluginDir}/denops/storyteller/commands/${cmd}.ts`;
        assertEquals(existsSync(path), true, `${path} should exist`);
      });
    }
  });

  await t.step("api/openrouter.ts exists", () => {
    const path = `${pluginDir}/denops/storyteller/api/openrouter.ts`;
    assertEquals(existsSync(path), true, `${path} should exist`);
  });

  await t.step("context/collector.ts exists", () => {
    const path = `${pluginDir}/denops/storyteller/context/collector.ts`;
    assertEquals(existsSync(path), true, `${path} should exist`);
  });

  await t.step("ui/float_window.ts exists", () => {
    const path = `${pluginDir}/denops/storyteller/ui/float_window.ts`;
    assertEquals(existsSync(path), true, `${path} should exist`);
  });

  await t.step("README.md exists", () => {
    const path = `${pluginDir}/README.md`;
    assertEquals(existsSync(path), true, `${path} should exist`);
  });
});

// =============================================================================
// テスト: 共通コンセプトの一貫性
// =============================================================================

Deno.test("UI Integration - Consistent Concepts Across UIs", async (t) => {
  await t.step(
    "Director concept is consistent across all prompts",
    async () => {
      const files = [
        "docs/prompts/director.md",
        "docs/prompts/claude-desktop.md",
        "docs/prompts/neovim.md",
      ];

      for (const file of files) {
        const content = await Deno.readTextFile(file);
        // ディレクターの概念が各ファイルで言及されている
        assertExists(
          content.match(/ディレクター|Director/i),
          `${file} should mention Director concept`,
        );
      }
    },
  );

  await t.step("SaC concept is mentioned in core documentation", async () => {
    const coreContent = await Deno.readTextFile("docs/prompts/core.md");
    assertExists(
      coreContent.match(/SaC|StoryWriting as Code/),
      "Core should mention SaC concept",
    );
  });

  await t.step("Reference system is documented", async () => {
    const coreContent = await Deno.readTextFile("docs/prompts/core.md");
    assertExists(
      coreContent.match(/@\w+|明示的参照|暗黙的参照/),
      "Core should document reference system",
    );
  });
});
