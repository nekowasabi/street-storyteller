import { assertEquals } from "@std/assert";
import { parseCliArgs } from "@storyteller/cli/arg_parser.ts";
import { createPresenterFromArgs } from "@storyteller/cli/output_presenter.ts";

Deno.test("parseCliArgs - parses --json flag as boolean true", () => {
  const result = parseCliArgs(["--json", "help"]);
  assertEquals(result.json, true);
});

Deno.test("parseCliArgs - json defaults to undefined when not specified", () => {
  const result = parseCliArgs(["help"]);
  assertEquals(result.json, undefined);
});

Deno.test("parseCliArgs - parses --json with other options", () => {
  const result = parseCliArgs([
    "meta",
    "check",
    "--json",
    "--path",
    "./project",
  ]);
  assertEquals(result.json, true);
  assertEquals(result.path, "./project");
});

Deno.test("createPresenterFromArgs - returns JsonOutputPresenter when json flag is true", () => {
  const presenter = createPresenterFromArgs({ json: true });
  // Test that it produces JSON output
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    presenter.showInfo("test");
    assertEquals(logs.length, 1);
    // JSON output should be parseable
    const parsed = JSON.parse(logs[0]);
    assertEquals(parsed.type, "info");
  } finally {
    console.log = originalLog;
  }
});

Deno.test("createPresenterFromArgs - returns ConsolePresenter when json flag is false", () => {
  const presenter = createPresenterFromArgs({ json: false });
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    presenter.showInfo("plain text");
    assertEquals(logs.length, 1);
    // Console output should be plain text, not JSON
    assertEquals(logs[0], "plain text");
  } finally {
    console.log = originalLog;
  }
});

Deno.test("createPresenterFromArgs - returns ConsolePresenter when json flag is undefined", () => {
  const presenter = createPresenterFromArgs({});
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    presenter.showInfo("plain text");
    assertEquals(logs.length, 1);
    assertEquals(logs[0], "plain text");
  } finally {
    console.log = originalLog;
  }
});
