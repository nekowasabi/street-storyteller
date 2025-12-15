import { assert } from "./asserts.ts";

Deno.test("ci_workflow uses Deno v2", async () => {
  const workflow = await Deno.readTextFile(".github/workflows/ci.yml");
  assert(
    /deno-version:\s*v2(\.|x)/.test(workflow),
    "expected ci.yml to use deno-version: v2.x",
  );
});

Deno.test("ci_workflow runs quality gate commands", async () => {
  const workflow = await Deno.readTextFile(".github/workflows/ci.yml");
  assert(
    workflow.includes("deno fmt --check"),
    "expected ci.yml to run deno fmt --check",
  );
  assert(
    workflow.includes("deno lint"),
    "expected ci.yml to run deno lint",
  );
  assert(
    workflow.includes("deno task coverage"),
    "expected ci.yml to run deno task coverage",
  );
  assert(
    workflow.includes(
      "deno task meta:check -- --dir sample/manuscripts --recursive",
    ),
    "expected ci.yml to run meta check for sample manuscripts",
  );
});
