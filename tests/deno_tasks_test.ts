import { assert, assertEquals } from "./asserts.ts";

Deno.test("deno.json declares CLI packaging tasks", async () => {
  const text = await Deno.readTextFile("deno.json");
  const config = JSON.parse(text) as { tasks?: Record<string, string> };
  assert(config.tasks !== undefined, "tasks section missing");
  const tasks = config.tasks ?? {};
  assert("cli:compile" in tasks, "cli:compile task missing");
  assert("cli:manifest" in tasks, "cli:manifest task missing");
  assert("cli:completions" in tasks, "cli:completions task missing");
  assert("cli:package" in tasks, "cli:package task missing");
  assert(tasks["cli:compile"].includes("deno compile"));
  assert(tasks["cli:manifest"].includes("scripts/build_cli.ts"));
  const pkg = tasks["cli:package"];
  assert(pkg.includes("cli:compile"), "cli:package must include cli:compile");
  assert(pkg.includes("cli:manifest"), "cli:package must include cli:manifest");
  assert(
    pkg.includes("cli:completions"),
    "cli:package must include cli:completions",
  );
  assert(
    pkg.indexOf("cli:compile") < pkg.indexOf("cli:manifest") &&
      pkg.indexOf("cli:manifest") < pkg.indexOf("cli:completions"),
    "cli:package must run compile -> manifest -> completions",
  );
  assertEquals(typeof tasks["cli:completions"], "string");
});

Deno.test("deno.json declares coverage tasks", async () => {
  const text = await Deno.readTextFile("deno.json");
  const config = JSON.parse(text) as { tasks?: Record<string, string> };
  assert(config.tasks !== undefined, "tasks section missing");
  const tasks = config.tasks ?? {};

  assert("coverage" in tasks, "coverage task missing");
  assert("coverage:collect" in tasks, "coverage:collect task missing");
  assert("coverage:report" in tasks, "coverage:report task missing");

  const collect = tasks["coverage:collect"];
  assert(collect.includes("deno test"), "coverage:collect must run deno test");
  assert(
    collect.includes("--coverage-raw-data-only"),
    "coverage:collect must include --coverage-raw-data-only",
  );
  assert(
    collect.includes("--coverage="),
    "coverage:collect must set --coverage",
  );

  const report = tasks["coverage:report"];
  assert(
    report.includes("deno coverage") ||
      report.includes("coverage_threshold.ts"),
    "coverage:report must generate a report or call coverage_threshold.ts",
  );
});
