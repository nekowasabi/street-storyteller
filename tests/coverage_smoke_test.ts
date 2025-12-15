import { assertEquals } from "./asserts.ts";
import {
  parseCoverageThresholdArgs,
  runCoverageThreshold,
} from "../scripts/coverage_threshold.ts";

Deno.test("coverage_smoke parses args and can run in --dry-run with --input", async () => {
  const tmp = await Deno.makeTempDir();
  try {
    const inputPath = `${tmp}/coverage.txt`;
    await Deno.writeTextFile(
      inputPath,
      "| File | Branch % | Line % |\n| All files | 100.0 | 16.1 |\n",
    );

    const args = parseCoverageThresholdArgs([
      "--dry-run",
      "--input",
      inputPath,
      "--threshold",
      "80",
    ]);

    const result = await runCoverageThreshold(args);
    assertEquals(result.coveragePercent, 16.1);
    assertEquals(result.ok, false);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
