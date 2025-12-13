import { assert, assertEquals } from "./asserts.ts";
import { createCompletionFsAdapter } from "../src/infrastructure/cli/completion_fs_adapter.ts";
import { join } from "@std/path/join";

Deno.test("CompletionFsAdapter writes bash and zsh scripts", async () => {
  const adapter = createCompletionFsAdapter();
  const tempDir = await Deno.makeTempDir({ prefix: "completion-fs-adapter" });
  try {
    const bashPath = join(tempDir, "bash", "storyteller");
    const zshPath = join(tempDir, "zsh", "_storyteller");

    await adapter.write({
      bash: { path: bashPath, content: "# bash completion" },
      zsh: { path: zshPath, content: "# zsh completion" },
    });

    const bashContent = await Deno.readTextFile(bashPath);
    const zshContent = await Deno.readTextFile(zshPath);

    assertEquals(bashContent, "# bash completion");
    assertEquals(zshContent, "# zsh completion");

    const bashStat = await Deno.stat(bashPath);
    const zshStat = await Deno.stat(zshPath);
    assert(bashStat.isFile);
    assert(zshStat.isFile);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
