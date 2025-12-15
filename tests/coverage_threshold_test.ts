import { assert, assertEquals, assertFalse } from "./asserts.ts";
import {
  meetsThreshold,
  parseCoveragePercent,
} from "../scripts/coverage_threshold.ts";

Deno.test("coverage_threshold parses percent from All files row", () => {
  const output = [
    "| File | Branch % | Line % |",
    "| foo.ts | 100.0 | 50.0 |",
    "| \u001b[0m\u001b[31mAll files\u001b[0m | \u001b[0m\u001b[33m61.5\u001b[0m | \u001b[0m\u001b[31m16.1\u001b[0m |",
  ].join("\n");

  assertEquals(parseCoveragePercent(output), 16.1);
});

Deno.test("coverage_threshold throws on unparseable output", () => {
  let threw = false;
  try {
    parseCoveragePercent("no coverage here");
  } catch {
    threw = true;
  }
  assert(threw, "expected parseCoveragePercent to throw");
});

Deno.test("coverage_threshold fails when below threshold", () => {
  assertFalse(meetsThreshold(79.9, 80));
  assert(meetsThreshold(80, 80));
});
