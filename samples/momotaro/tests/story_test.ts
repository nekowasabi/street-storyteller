import { assert } from "./test_utils/assert.ts";
import { momotaroOnigashima } from "../src/plots/momotaro_onigashima.ts";

Deno.test("Momotaro has at least one plot fixture with allowed type", () => {
  const plots = [momotaroOnigashima];
  const allowedTypes = new Set(["main", "sub", "parallel", "background"]);

  assert(plots.length > 0, "At least one plot fixture should exist");
  for (const plot of plots) {
    assert(
      allowedTypes.has(plot.type),
      `Plot type must be one of main/sub/parallel/background: ${plot.type}`,
    );
  }
});
