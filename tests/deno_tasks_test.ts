import { assertEquals, assert } from "./asserts.ts";

Deno.test("deno.json declares CLI build tasks", async () => {
  const text = await Deno.readTextFile("deno.json");
  const config = JSON.parse(text) as { tasks?: Record<string, string> };
  assert(config.tasks !== undefined, "tasks section missing");
  const tasks = config.tasks ?? {};
  assert("cli:build" in tasks, "cli:build task missing");
  assert("cli:completions" in tasks, "cli:completions task missing");
  assert("cli:package" in tasks, "cli:package task missing");
  assert(
    tasks["cli:build"].includes("deno run"),
  );
  assert(
    tasks["cli:package"].includes("deno run") ||
      tasks["cli:package"].includes("deno task"),
  );
  assertEquals(typeof tasks["cli:completions"], "string");
});
