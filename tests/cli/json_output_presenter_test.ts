import { assertEquals, assertMatch } from "@std/assert";
import { createJsonOutputPresenter } from "../../src/cli/output_presenter.ts";

Deno.test("JsonOutputPresenter - showInfo outputs valid JSON with type info", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createJsonOutputPresenter();
    presenter.showInfo("info message");
    assertEquals(logs.length, 1);
    const parsed = JSON.parse(logs[0]);
    assertEquals(parsed.type, "info");
    assertEquals(parsed.message, "info message");
  } finally {
    console.log = originalLog;
  }
});

Deno.test("JsonOutputPresenter - showSuccess outputs valid JSON with type success", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createJsonOutputPresenter();
    presenter.showSuccess("success message");
    assertEquals(logs.length, 1);
    const parsed = JSON.parse(logs[0]);
    assertEquals(parsed.type, "success");
    assertEquals(parsed.message, "success message");
  } finally {
    console.log = originalLog;
  }
});

Deno.test("JsonOutputPresenter - showWarning outputs valid JSON with type warning", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createJsonOutputPresenter();
    presenter.showWarning("warning message");
    assertEquals(logs.length, 1);
    const parsed = JSON.parse(logs[0]);
    assertEquals(parsed.type, "warning");
    assertEquals(parsed.message, "warning message");
  } finally {
    console.log = originalLog;
  }
});

Deno.test("JsonOutputPresenter - showError outputs valid JSON with type error", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createJsonOutputPresenter();
    presenter.showError("error message");
    assertEquals(logs.length, 1);
    const parsed = JSON.parse(logs[0]);
    assertEquals(parsed.type, "error");
    assertEquals(parsed.message, "error message");
  } finally {
    console.log = originalLog;
  }
});

Deno.test("JsonOutputPresenter - output is parseable as valid JSON", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createJsonOutputPresenter();
    presenter.showInfo("test");
    presenter.showSuccess("test");
    presenter.showWarning("test");
    presenter.showError("test");
    assertEquals(logs.length, 4);

    for (const log of logs) {
      // Should not throw - all outputs must be valid JSON
      JSON.parse(log);
    }
  } finally {
    console.log = originalLog;
  }
});

Deno.test("JsonOutputPresenter - handles special characters in message", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createJsonOutputPresenter();
    const specialMessage = 'message with "quotes" and \\ backslash and 日本語';
    presenter.showInfo(specialMessage);
    assertEquals(logs.length, 1);
    const parsed = JSON.parse(logs[0]);
    assertEquals(parsed.message, specialMessage);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("JsonOutputPresenter - includes timestamp in output", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createJsonOutputPresenter();
    presenter.showInfo("test message");
    assertEquals(logs.length, 1);
    const parsed = JSON.parse(logs[0]);
    assertEquals(typeof parsed.timestamp, "string");
    // Verify it's a valid ISO date string
    const date = new Date(parsed.timestamp);
    assertEquals(isNaN(date.getTime()), false);
  } finally {
    console.log = originalLog;
  }
});
