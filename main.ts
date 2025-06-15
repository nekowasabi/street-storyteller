import { runCLI } from "./src/cli.ts";

// Main entry point
if (import.meta.main) {
  await runCLI();
}

export function testAaa() {
  return "ok";
}
