import { assertEquals } from "../asserts.ts";
import { extractMarkdownPathsFromWatchEvent } from "@storyteller/cli/modules/meta/watch.ts";

Deno.test("meta watch - extractMarkdownPathsFromWatchEvent ignores access events", () => {
  const result = extractMarkdownPathsFromWatchEvent({
    kind: "access",
    paths: ["manuscripts/chapter01.md"],
  });
  assertEquals(result.length, 0);
});

Deno.test("meta watch - extractMarkdownPathsFromWatchEvent returns only .md paths", () => {
  const result = extractMarkdownPathsFromWatchEvent({
    kind: "modify",
    paths: [
      "manuscripts/chapter01.md",
      "manuscripts/chapter01.meta.ts",
      "README.md",
      "src/characters/hero.ts",
    ],
  });

  assertEquals(result.length, 2);
  assertEquals(result.includes("manuscripts/chapter01.md"), true);
  assertEquals(result.includes("README.md"), true);
});
