/**
 * MCPサーバー能力定義のテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  getMcpServerCapabilities,
  type McpServerCapabilitiesConfig,
} from "../../../src/mcp/server/capabilities.ts";

Deno.test("getMcpServerCapabilities: デフォルトでtools, resources, promptsを含む", () => {
  const capabilities = getMcpServerCapabilities();

  assertExists(capabilities);
  assertExists(capabilities.tools);
  assertExists(capabilities.resources);
  assertExists(capabilities.prompts);
});

Deno.test("getMcpServerCapabilities: 設定でtoolsを有効化できる", () => {
  const config: McpServerCapabilitiesConfig = {
    tools: true,
    resources: false,
    prompts: false,
  };

  const capabilities = getMcpServerCapabilities(config);

  assertExists(capabilities.tools);
  assertEquals(capabilities.resources, undefined);
  assertEquals(capabilities.prompts, undefined);
});

Deno.test("getMcpServerCapabilities: 設定でresourcesを有効化できる", () => {
  const config: McpServerCapabilitiesConfig = {
    tools: false,
    resources: true,
    prompts: false,
  };

  const capabilities = getMcpServerCapabilities(config);

  assertEquals(capabilities.tools, undefined);
  assertExists(capabilities.resources);
  assertEquals(capabilities.prompts, undefined);
});

Deno.test("getMcpServerCapabilities: 設定でpromptsを有効化できる", () => {
  const config: McpServerCapabilitiesConfig = {
    tools: false,
    resources: false,
    prompts: true,
  };

  const capabilities = getMcpServerCapabilities(config);

  assertEquals(capabilities.tools, undefined);
  assertEquals(capabilities.resources, undefined);
  assertExists(capabilities.prompts);
});

Deno.test("getMcpServerCapabilities: すべての機能を有効化できる", () => {
  const config: McpServerCapabilitiesConfig = {
    tools: true,
    resources: true,
    prompts: true,
  };

  const capabilities = getMcpServerCapabilities(config);

  assertExists(capabilities.tools);
  assertExists(capabilities.resources);
  assertExists(capabilities.prompts);
});

Deno.test("getMcpServerCapabilities: MCP仕様に準拠したオブジェクトを返す", () => {
  const capabilities = getMcpServerCapabilities();

  // MCPサーバー能力は空オブジェクト（機能が利用可能であることを示す）または追加設定を含む
  assertEquals(typeof capabilities.tools, "object");
  assertEquals(typeof capabilities.resources, "object");
  assertEquals(typeof capabilities.prompts, "object");
});
