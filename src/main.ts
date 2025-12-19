import { runCLI } from "@storyteller/cli.ts";

// Entry point for builds that resolve modules from the src/ directory.
if (import.meta.main) {
  await runCLI();
}
