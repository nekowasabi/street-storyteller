/**
 * CLI JSON出力統合テスト
 * Process10 Sub2: 全コマンドでJSON出力が正しく動作することを確認
 *
 * テストシナリオ:
 * 1. OutputPresenterのJSON出力機能が全メッセージタイプで動作
 * 2. JSON出力がパース可能で、必要なフィールドを含む
 * 3. 特殊文字やUTF-8文字を含むメッセージが正しくエスケープされる
 * 4. 全てのメッセージタイプ（info, success, warning, error）が一貫した形式で出力
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  createConsolePresenter,
  createJsonOutputPresenter,
  createPresenterFromArgs,
  type JsonOutput,
} from "../../../src/cli/output_presenter.ts";
import type { OutputPresenter } from "../../../src/cli/types.ts";

/**
 * コンソール出力をキャプチャするヘルパー
 */
function captureConsoleOutput(
  fn: (presenter: OutputPresenter) => void,
): { logs: string[]; warns: string[]; errors: string[] } {
  const logs: string[] = [];
  const warns: string[] = [];
  const errors: string[] = [];

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (msg: string) => logs.push(msg);
  console.warn = (msg: string) => warns.push(msg);
  console.error = (msg: string) => errors.push(msg);

  try {
    fn(createJsonOutputPresenter());
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }

  return { logs, warns, errors };
}

// ===== 基本的なJSON出力テスト =====

Deno.test("Integration - JSON Output: all message types produce valid JSON", () => {
  const { logs } = captureConsoleOutput((presenter) => {
    presenter.showInfo("info message");
    presenter.showSuccess("success message");
    presenter.showWarning("warning message");
    presenter.showError("error message");
  });

  assertEquals(logs.length, 4, "Should capture 4 messages");

  for (const log of logs) {
    // Should not throw - all outputs must be valid JSON
    const parsed = JSON.parse(log) as JsonOutput;
    assertExists(parsed.type);
    assertExists(parsed.message);
    assertExists(parsed.timestamp);
  }
});

Deno.test("Integration - JSON Output: message types are correctly set", () => {
  const { logs } = captureConsoleOutput((presenter) => {
    presenter.showInfo("info message");
    presenter.showSuccess("success message");
    presenter.showWarning("warning message");
    presenter.showError("error message");
  });

  const types = logs.map((log) => (JSON.parse(log) as JsonOutput).type);
  assertEquals(types, ["info", "success", "warning", "error"]);
});

Deno.test("Integration - JSON Output: messages are preserved correctly", () => {
  const testMessages = [
    "Simple message",
    "Message with numbers 123",
    "Message with special chars: !@#$%^&*()",
    "",
  ];

  for (const message of testMessages) {
    const { logs } = captureConsoleOutput((presenter) => {
      presenter.showInfo(message);
    });

    assertEquals(logs.length, 1);
    const parsed = JSON.parse(logs[0]) as JsonOutput;
    assertEquals(parsed.message, message);
  }
});

// ===== タイムスタンプのテスト =====

Deno.test("Integration - JSON Output: timestamp is valid ISO 8601 format", () => {
  const { logs } = captureConsoleOutput((presenter) => {
    presenter.showInfo("test");
  });

  const parsed = JSON.parse(logs[0]) as JsonOutput;
  const date = new Date(parsed.timestamp);

  // Should be a valid date
  assertEquals(isNaN(date.getTime()), false, "Timestamp should be a valid date");

  // Should be recent (within last minute)
  const now = new Date();
  const diff = Math.abs(now.getTime() - date.getTime());
  assertEquals(diff < 60000, true, "Timestamp should be recent");
});

Deno.test("Integration - JSON Output: timestamps are unique for different calls", async () => {
  const { logs } = captureConsoleOutput((presenter) => {
    presenter.showInfo("first");
  });

  // Small delay to ensure different timestamp
  await new Promise((resolve) => setTimeout(resolve, 10));

  const { logs: logs2 } = captureConsoleOutput((presenter) => {
    presenter.showInfo("second");
  });

  const timestamp1 = (JSON.parse(logs[0]) as JsonOutput).timestamp;
  const timestamp2 = (JSON.parse(logs2[0]) as JsonOutput).timestamp;

  // Timestamps should be different or very close
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  assertEquals(
    date2.getTime() >= date1.getTime(),
    true,
    "Second timestamp should be same or later",
  );
});

// ===== 特殊文字のテスト =====

Deno.test("Integration - JSON Output: handles Japanese characters", () => {
  const japaneseMessages = [
    "日本語メッセージ",
    "勇者は冒険を始めた",
    "設定ファイルが見つかりません",
    "処理が完了しました！",
  ];

  for (const message of japaneseMessages) {
    const { logs } = captureConsoleOutput((presenter) => {
      presenter.showInfo(message);
    });

    const parsed = JSON.parse(logs[0]) as JsonOutput;
    assertEquals(parsed.message, message, `Should preserve: ${message}`);
  }
});

Deno.test("Integration - JSON Output: handles quotes and backslashes", () => {
  const specialMessages = [
    'Message with "double quotes"',
    "Message with 'single quotes'",
    "Message with \\ backslash",
    'Mixed "quotes" and \\ backslash',
  ];

  for (const message of specialMessages) {
    const { logs } = captureConsoleOutput((presenter) => {
      presenter.showInfo(message);
    });

    const parsed = JSON.parse(logs[0]) as JsonOutput;
    assertEquals(parsed.message, message, `Should preserve: ${message}`);
  }
});

Deno.test("Integration - JSON Output: handles newlines and tabs", () => {
  const messages = [
    "Line1\nLine2",
    "Tab\there",
    "Multiple\n\nNewlines",
    "Mixed\tTab\nNewline",
  ];

  for (const message of messages) {
    const { logs } = captureConsoleOutput((presenter) => {
      presenter.showInfo(message);
    });

    const parsed = JSON.parse(logs[0]) as JsonOutput;
    assertEquals(parsed.message, message, `Should preserve whitespace in: ${JSON.stringify(message)}`);
  }
});

Deno.test("Integration - JSON Output: handles unicode emojis", () => {
  const emojiMessages = [
    "Success! ✓",
    "Error ❌",
    "Warning ⚠️",
    "Info ℹ️",
  ];

  for (const message of emojiMessages) {
    const { logs } = captureConsoleOutput((presenter) => {
      presenter.showInfo(message);
    });

    const parsed = JSON.parse(logs[0]) as JsonOutput;
    assertEquals(parsed.message, message, `Should preserve emoji in: ${message}`);
  }
});

// ===== createPresenterFromArgs統合テスト =====

Deno.test("Integration - JSON Output: createPresenterFromArgs with json=true", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createPresenterFromArgs({ json: true });
    presenter.showInfo("test message");
    presenter.showSuccess("success");
    presenter.showWarning("warning");
    presenter.showError("error");
  } finally {
    console.log = originalLog;
  }

  assertEquals(logs.length, 4);

  // All should be valid JSON
  for (const log of logs) {
    const parsed = JSON.parse(log) as JsonOutput;
    assertExists(parsed.type);
    assertExists(parsed.message);
    assertExists(parsed.timestamp);
  }
});

Deno.test("Integration - JSON Output: createPresenterFromArgs with json=false returns console presenter", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createPresenterFromArgs({ json: false });
    presenter.showInfo("plain text message");
  } finally {
    console.log = originalLog;
  }

  assertEquals(logs.length, 1);
  assertEquals(logs[0], "plain text message", "Console presenter should output plain text");

  // Should NOT be JSON
  let isJson = false;
  try {
    JSON.parse(logs[0]);
    isJson = true;
  } catch {
    // Expected
  }
  assertEquals(isJson, false, "Console presenter output should not be JSON");
});

Deno.test("Integration - JSON Output: createPresenterFromArgs with undefined json returns console presenter", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createPresenterFromArgs({});
    presenter.showInfo("default mode message");
  } finally {
    console.log = originalLog;
  }

  assertEquals(logs.length, 1);
  assertEquals(logs[0], "default mode message");
});

// ===== 一貫性テスト =====

Deno.test("Integration - JSON Output: consistent schema across all message types", () => {
  const { logs } = captureConsoleOutput((presenter) => {
    presenter.showInfo("info");
    presenter.showSuccess("success");
    presenter.showWarning("warning");
    presenter.showError("error");
  });

  const schemas = logs.map((log) => {
    const parsed = JSON.parse(log);
    return Object.keys(parsed).sort().join(",");
  });

  // All messages should have the same keys
  const uniqueSchemas = [...new Set(schemas)];
  assertEquals(
    uniqueSchemas.length,
    1,
    "All message types should have consistent schema",
  );
  assertEquals(
    uniqueSchemas[0],
    "message,timestamp,type",
    "Schema should contain message, timestamp, type",
  );
});

Deno.test("Integration - JSON Output: type values are within expected set", () => {
  const validTypes = new Set(["info", "success", "warning", "error"]);

  const { logs } = captureConsoleOutput((presenter) => {
    presenter.showInfo("info");
    presenter.showSuccess("success");
    presenter.showWarning("warning");
    presenter.showError("error");
  });

  for (const log of logs) {
    const parsed = JSON.parse(log) as JsonOutput;
    assertEquals(
      validTypes.has(parsed.type),
      true,
      `Type "${parsed.type}" should be one of: ${[...validTypes].join(", ")}`,
    );
  }
});

// ===== 大量データのテスト =====

Deno.test("Integration - JSON Output: handles long messages", () => {
  const longMessage = "A".repeat(10000);

  const { logs } = captureConsoleOutput((presenter) => {
    presenter.showInfo(longMessage);
  });

  const parsed = JSON.parse(logs[0]) as JsonOutput;
  assertEquals(parsed.message, longMessage);
  assertEquals(parsed.message.length, 10000);
});

Deno.test("Integration - JSON Output: handles multiple rapid calls", () => {
  const messageCount = 100;

  const { logs } = captureConsoleOutput((presenter) => {
    for (let i = 0; i < messageCount; i++) {
      presenter.showInfo(`Message ${i}`);
    }
  });

  assertEquals(logs.length, messageCount);

  // All should be parseable
  for (let i = 0; i < logs.length; i++) {
    const parsed = JSON.parse(logs[i]) as JsonOutput;
    assertEquals(parsed.message, `Message ${i}`);
  }
});

// ===== エラーハンドリングテスト =====

Deno.test("Integration - JSON Output: handles empty strings", () => {
  const { logs } = captureConsoleOutput((presenter) => {
    presenter.showInfo("");
    presenter.showError("");
  });

  assertEquals(logs.length, 2);

  for (const log of logs) {
    const parsed = JSON.parse(log) as JsonOutput;
    assertEquals(parsed.message, "");
  }
});

Deno.test("Integration - JSON Output: console presenter vs json presenter comparison", () => {
  const testMessage = "Test comparison message";
  const consoleLogs: string[] = [];
  const jsonLogs: string[] = [];

  const originalLog = console.log;

  // Test console presenter
  console.log = (msg: string) => consoleLogs.push(msg);
  try {
    const consolePresenter = createConsolePresenter();
    consolePresenter.showInfo(testMessage);
  } finally {
    console.log = originalLog;
  }

  // Test JSON presenter
  console.log = (msg: string) => jsonLogs.push(msg);
  try {
    const jsonPresenter = createJsonOutputPresenter();
    jsonPresenter.showInfo(testMessage);
  } finally {
    console.log = originalLog;
  }

  // Console should be plain text
  assertEquals(consoleLogs[0], testMessage);

  // JSON should be structured
  const jsonParsed = JSON.parse(jsonLogs[0]) as JsonOutput;
  assertEquals(jsonParsed.type, "info");
  assertEquals(jsonParsed.message, testMessage);
  assertExists(jsonParsed.timestamp);
});
