import { assertEquals } from "@std/assert";
import { createConsolePresenter } from "../../src/cli/output_presenter.ts";

Deno.test("createConsolePresenter - showInfo outputs to console.log", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createConsolePresenter();
    presenter.showInfo("info message");
    assertEquals(logs, ["info message"]);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("createConsolePresenter - showSuccess outputs to console.log", () => {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const presenter = createConsolePresenter();
    presenter.showSuccess("success message");
    assertEquals(logs, ["success message"]);
  } finally {
    console.log = originalLog;
  }
});

Deno.test("createConsolePresenter - showWarning outputs to console.warn", () => {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (msg: string) => warnings.push(msg);

  try {
    const presenter = createConsolePresenter();
    presenter.showWarning("warning message");
    assertEquals(warnings, ["warning message"]);
  } finally {
    console.warn = originalWarn;
  }
});

Deno.test("createConsolePresenter - showError outputs to console.error", () => {
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (msg: string) => errors.push(msg);

  try {
    const presenter = createConsolePresenter();
    presenter.showError("error message");
    assertEquals(errors, ["error message"]);
  } finally {
    console.error = originalError;
  }
});
