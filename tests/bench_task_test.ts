import { assert } from "./asserts.ts";

Deno.test("bench_task deno.json declares bench task", async () => {
  const text = await Deno.readTextFile("deno.json");
  const config = JSON.parse(text) as { tasks?: Record<string, string> };
  const tasks = config.tasks ?? {};
  assert("bench" in tasks, "bench task missing");
  assert(tasks.bench.includes("deno bench"), "bench task must run deno bench");
});
