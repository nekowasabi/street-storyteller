/**
 * LSPサーバーキャパビリティテスト
 * Process2 Sub1: SemanticTokensLegend定義テスト
 *
 * TDD Red Phase: セマンティックトークンキャパビリティのテスト
 */

import { assertEquals, assertExists } from "@std/assert";

// ===== セマンティックトークンタイプ定数テスト =====

Deno.test("Capabilities - SEMANTIC_TOKEN_TYPES is exported", async () => {
  const { SEMANTIC_TOKEN_TYPES } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  assertExists(SEMANTIC_TOKEN_TYPES);
});

Deno.test("Capabilities - SEMANTIC_TOKEN_TYPES has character at index 0", async () => {
  const { SEMANTIC_TOKEN_TYPES } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  assertEquals(SEMANTIC_TOKEN_TYPES[0], "character");
});

Deno.test("Capabilities - SEMANTIC_TOKEN_TYPES has setting at index 1", async () => {
  const { SEMANTIC_TOKEN_TYPES } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  assertEquals(SEMANTIC_TOKEN_TYPES[1], "setting");
});

// ===== セマンティックトークンモディファイア定数テスト =====

Deno.test("Capabilities - SEMANTIC_TOKEN_MODIFIERS is exported", async () => {
  const { SEMANTIC_TOKEN_MODIFIERS } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  assertExists(SEMANTIC_TOKEN_MODIFIERS);
});

Deno.test("Capabilities - SEMANTIC_TOKEN_MODIFIERS has 5 modifiers", async () => {
  const { SEMANTIC_TOKEN_MODIFIERS } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  // 3 confidence modifiers + planted + resolved = 5
  assertEquals(SEMANTIC_TOKEN_MODIFIERS.length, 5);
});

Deno.test("Capabilities - SEMANTIC_TOKEN_MODIFIERS has correct modifier names", async () => {
  const { SEMANTIC_TOKEN_MODIFIERS } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  assertEquals(SEMANTIC_TOKEN_MODIFIERS[0], "highConfidence");
  assertEquals(SEMANTIC_TOKEN_MODIFIERS[1], "mediumConfidence");
  assertEquals(SEMANTIC_TOKEN_MODIFIERS[2], "lowConfidence");
});

// ===== SemanticTokensLegend型テスト =====

Deno.test("Capabilities - getSemanticTokensLegend is exported", async () => {
  const { getSemanticTokensLegend } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  assertExists(getSemanticTokensLegend);
});

Deno.test("Capabilities - getSemanticTokensLegend returns tokenTypes and tokenModifiers", async () => {
  const { getSemanticTokensLegend } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  const legend = getSemanticTokensLegend();

  assertExists(legend.tokenTypes);
  assertExists(legend.tokenModifiers);
  // character, setting, foreshadowing = 3 types
  assertEquals(legend.tokenTypes.length, 3);
  // 3 confidence modifiers + planted + resolved = 5 modifiers
  assertEquals(legend.tokenModifiers.length, 5);
});

// ===== ServerCapabilities拡張テスト =====

Deno.test("Capabilities - getServerCapabilities includes semanticTokensProvider", async () => {
  const { getServerCapabilities } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  const caps = getServerCapabilities();

  assertExists(caps.semanticTokensProvider);
});

Deno.test("Capabilities - semanticTokensProvider has legend", async () => {
  const { getServerCapabilities } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  const caps = getServerCapabilities();
  const provider = caps.semanticTokensProvider;

  assertExists(provider);
  if (provider) {
    assertExists(provider.legend);
    assertExists(provider.legend.tokenTypes);
    assertExists(provider.legend.tokenModifiers);
  }
});

Deno.test("Capabilities - semanticTokensProvider supports full tokens", async () => {
  const { getServerCapabilities } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  const caps = getServerCapabilities();
  const provider = caps.semanticTokensProvider;

  assertExists(provider);
  if (provider) {
    assertEquals(provider.full, true);
  }
});

Deno.test("Capabilities - semanticTokensProvider supports range tokens", async () => {
  const { getServerCapabilities } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  const caps = getServerCapabilities();
  const provider = caps.semanticTokensProvider;

  assertExists(provider);
  if (provider) {
    assertEquals(provider.range, true);
  }
});
