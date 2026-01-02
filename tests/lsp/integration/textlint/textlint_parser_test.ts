// tests/lsp/integration/textlint/textlint_parser_test.ts
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { parseTextlintOutput, TextlintMessage } from "@storyteller/lsp/integration/textlint/textlint_parser.ts";

describe("TextlintParser", () => {
  it("should parse valid textlint JSON output", () => {
    const json = JSON.stringify([{
      filePath: "/test.md",
      messages: [{
        ruleId: "prh",
        severity: 1,
        message: "表記ゆれ",
        line: 2,
        column: 5,
        index: 10,
      }],
    }]);

    const result = parseTextlintOutput(json, "/test.md");
    assertEquals(result.filePath, "/test.md");
    assertEquals(result.messages.length, 1);
    assertEquals(result.messages[0].ruleId, "prh");
  });

  it("should handle empty output", () => {
    const result = parseTextlintOutput("", "/test.md");
    assertEquals(result.messages.length, 0);
  });

  it("should handle empty array", () => {
    const result = parseTextlintOutput("[]", "/test.md");
    assertEquals(result.messages.length, 0);
  });

  it("should handle invalid JSON", () => {
    const result = parseTextlintOutput("invalid", "/test.md");
    assertEquals(result.messages.length, 0);
  });

  it("should map severity correctly", () => {
    const json = JSON.stringify([{
      filePath: "/test.md",
      messages: [
        { ruleId: "rule1", severity: 2, message: "error", line: 1, column: 1 },
        { ruleId: "rule2", severity: 1, message: "warning", line: 2, column: 1 },
        { ruleId: "rule3", severity: 0, message: "info", line: 3, column: 1 },
      ],
    }]);

    const result = parseTextlintOutput(json, "/test.md");
    assertEquals(result.messages[0].severity, 2); // error
    assertEquals(result.messages[1].severity, 1); // warning
    assertEquals(result.messages[2].severity, 0); // info
  });

  it("should handle whitespace-only output", () => {
    const result = parseTextlintOutput("   \n\t  ", "/test.md");
    assertEquals(result.messages.length, 0);
  });

  it("should handle malformed JSON gracefully", () => {
    const malformedCases = [
      '{"incomplete":',
      '[{"messages": "not-an-array"}]',
      '[{"filePath": "/test.md"}]', // missing messages
      'null',
      'undefined',
    ];

    for (const malformed of malformedCases) {
      const result = parseTextlintOutput(malformed, "/test.md");
      assertEquals(result.messages.length, 0, `Failed for input: ${malformed}`);
    }
  });

  it("should handle messages with missing fields", () => {
    const json = JSON.stringify([{
      filePath: "/test.md",
      messages: [
        { }, // all fields missing
        { ruleId: "rule1" }, // missing severity, message, line, column
        { severity: 2 }, // missing ruleId, message, line, column
      ],
    }]);

    const result = parseTextlintOutput(json, "/test.md");
    assertEquals(result.messages.length, 3);

    // Check default values
    assertEquals(result.messages[0].ruleId, "unknown");
    assertEquals(result.messages[0].severity, 1);
    assertEquals(result.messages[0].message, "");
    assertEquals(result.messages[0].line, 1);
    assertEquals(result.messages[0].column, 1);
  });

  it("should preserve fix information when present", () => {
    const json = JSON.stringify([{
      filePath: "/test.md",
      messages: [{
        ruleId: "prh",
        severity: 1,
        message: "表記ゆれ",
        line: 2,
        column: 5,
        fix: {
          range: [10, 15],
          text: "修正後",
        },
      }],
    }]);

    const result = parseTextlintOutput(json, "/test.md");
    assertEquals(result.messages.length, 1);
    assertEquals(result.messages[0].fix?.range, [10, 15]);
    assertEquals(result.messages[0].fix?.text, "修正後");
  });

  it("should handle large message arrays", () => {
    const messages = Array.from({ length: 1000 }, (_, i) => ({
      ruleId: `rule${i}`,
      severity: i % 3,
      message: `Message ${i}`,
      line: i + 1,
      column: 1,
    }));

    const json = JSON.stringify([{
      filePath: "/test.md",
      messages,
    }]);

    const result = parseTextlintOutput(json, "/test.md");
    assertEquals(result.messages.length, 1000);
  });

  it("should use provided filePath for result", () => {
    const json = JSON.stringify([{
      filePath: "/different/path.md",
      messages: [],
    }]);

    const result = parseTextlintOutput(json, "/provided/path.md");
    assertEquals(result.filePath, "/provided/path.md");
  });
});
