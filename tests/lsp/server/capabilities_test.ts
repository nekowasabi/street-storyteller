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

// =============================================================================
// Process 1: FileChangeType型のテスト
// =============================================================================

Deno.test("Capabilities - FileChangeType.Created equals 1", async () => {
  const { FileChangeType } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );
  assertEquals(FileChangeType.Created, 1);
});

Deno.test("Capabilities - FileChangeType.Changed equals 2", async () => {
  const { FileChangeType } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );
  assertEquals(FileChangeType.Changed, 2);
});

Deno.test("Capabilities - FileChangeType.Deleted equals 3", async () => {
  const { FileChangeType } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );
  assertEquals(FileChangeType.Deleted, 3);
});

// =============================================================================
// Process 2: FileEvent型とDidChangeWatchedFilesParams型のテスト
// =============================================================================

Deno.test("Capabilities - FileEvent type has correct structure", async () => {
  const { FileChangeType } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );
  // 型テストは実行時にはnoop、コンパイルで検証
  // FileEvent型に準拠したオブジェクトを作成
  const event = { uri: "file:///test.ts", type: FileChangeType.Created };
  assertExists(event.uri);
  assertExists(event.type);
  assertEquals(typeof event.uri, "string");
  assertEquals(typeof event.type, "number");
});

Deno.test("Capabilities - DidChangeWatchedFilesParams has changes array", async () => {
  const { FileChangeType } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );
  // DidChangeWatchedFilesParams型に準拠したオブジェクトを作成
  const params = {
    changes: [
      { uri: "file:///test.ts", type: FileChangeType.Created },
    ],
  };
  assertExists(params.changes);
  assertEquals(Array.isArray(params.changes), true);
  assertEquals(params.changes.length, 1);
});

// =============================================================================
// Process 3: ServerCapabilitiesにworkspaceセクション追加のテスト
// =============================================================================

Deno.test("Capabilities - getServerCapabilities includes workspace section", async () => {
  const { getServerCapabilities } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );
  const caps = getServerCapabilities();
  assertExists(caps.workspace);
});

Deno.test("Capabilities - workspace.didChangeWatchedFiles is supported", async () => {
  const { getServerCapabilities } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );
  const caps = getServerCapabilities();
  assertExists(caps.workspace?.didChangeWatchedFiles);
});

// ========================================
// process5: CodeLens関連キャパビリティテスト
// ========================================

Deno.test("Capabilities - getServerCapabilities includes codeLensProvider", async () => {
  const { getServerCapabilities } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  const caps = getServerCapabilities();

  assertExists(caps.codeLensProvider);
  assertEquals(caps.codeLensProvider, true);
});

Deno.test("Capabilities - getServerCapabilities includes executeCommandProvider", async () => {
  const { getServerCapabilities } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  const caps = getServerCapabilities();

  assertExists(caps.executeCommandProvider);
});

Deno.test("Capabilities - executeCommandProvider includes storyteller.openReferencedFile command", async () => {
  const { getServerCapabilities } = await import(
    "../../../src/lsp/server/capabilities.ts"
  );

  const caps = getServerCapabilities();

  assertExists(caps.executeCommandProvider);
  if (caps.executeCommandProvider) {
    assertEquals(
      caps.executeCommandProvider.commands.includes(
        "storyteller.openReferencedFile",
      ),
      true,
    );
  }
});
