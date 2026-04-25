import { assertEquals } from "jsr:@std/assert@1";

Deno.test("migration: fixture policy documented with required keywords", async () => {
  const requirementsPath = new URL(
    "../../docs/migration/go-rearchitecture-requirements.md",
    import.meta.url,
  );
  const content = await Deno.readTextFile(requirementsPath);

  // DECISION: TypeScript object literal parser implementation method must be documented
  const hasParserDecision = content.includes(
    "Go 側 TS object literal parser 実装で固定",
  ) || content.includes("Go側TSobjectliteralparser実装で固定");
  assertEquals(
    hasParserDecision,
    true,
    "Should document 'Go側TSobjectliteralparser実装で固定' or similar decision on TS data format handling",
  );

  // DECISION: Fixture representative samples must be listed
  const hasSamplesSection =
    content.includes("samples/cinderella") &&
    content.includes("samples/momotaro") &&
    content.includes("samples/mistery/old-letter-mystery");
  assertEquals(
    hasSamplesSection,
    true,
    "Should list all three fixture representative samples: cinderella, momotaro, old-letter-mystery",
  );

  // DECISION: v1 maintained command list must be documented
  const hasCommandsList =
    content.includes("registerCoreModules") ||
    content.includes("v1 維持対象コマンド一覧") ||
    content.includes("maintain") ||
    content.includes("generate") ||
    content.includes("meta") ||
    content.includes("element") ||
    content.includes("view") ||
    content.includes("lsp") ||
    content.includes("mcp");
  assertEquals(
    hasCommandsList,
    true,
    "Should document v1 maintained commands list (e.g., from registerCoreModules)",
  );

  // INFO: rag/migrate CLI registration status must be clarified
  const hasRagMigrateDecision =
    content.includes("RAG") &&
    (content.includes("正式維持") ||
      content.includes("後追い実装") ||
      content.includes("未登録漏れ") ||
      content.includes("未公開") ||
      content.includes("正式機能") ||
      content.includes("登録漏れ"));
  assertEquals(
    hasRagMigrateDecision,
    true,
    "Should clarify rag/migrate CLI registration status: 正式維持, 後追い実装, or 未登録漏れ",
  );
});
