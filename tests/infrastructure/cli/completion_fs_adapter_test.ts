import { assertEquals } from "@std/assert";
import { createCompletionFsAdapter } from "../../../src/infrastructure/cli/completion_fs_adapter.ts";

Deno.test("createCompletionFsAdapter - writes bash and zsh completion scripts", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "completion-test-" });
  try {
    const adapter = createCompletionFsAdapter();
    const artifacts = {
      bash: {
        path: `${tmpDir}/completions/storyteller.bash`,
        content: "# bash completion\ncomplete -C storyteller storyteller",
      },
      zsh: {
        path: `${tmpDir}/completions/storyteller.zsh`,
        content: "# zsh completion\n#compdef storyteller",
      },
    };

    await adapter.write(artifacts);

    const bashContent = await Deno.readTextFile(artifacts.bash.path);
    assertEquals(bashContent, artifacts.bash.content);

    const zshContent = await Deno.readTextFile(artifacts.zsh.path);
    assertEquals(zshContent, artifacts.zsh.content);
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("createCompletionFsAdapter - creates parent directories if needed", async () => {
  const tmpDir = await Deno.makeTempDir({ prefix: "completion-test-" });
  try {
    const adapter = createCompletionFsAdapter();
    const artifacts = {
      bash: {
        path: `${tmpDir}/deep/nested/path/storyteller.bash`,
        content: "# bash",
      },
      zsh: {
        path: `${tmpDir}/another/deep/path/storyteller.zsh`,
        content: "# zsh",
      },
    };

    await adapter.write(artifacts);

    const bashContent = await Deno.readTextFile(artifacts.bash.path);
    assertEquals(bashContent, "# bash");

    const zshContent = await Deno.readTextFile(artifacts.zsh.path);
    assertEquals(zshContent, "# zsh");
  } finally {
    await Deno.remove(tmpDir, { recursive: true });
  }
});

Deno.test("createCompletionFsAdapter - handles paths without parent directory", async () => {
  // Save and restore cwd for test isolation
  const originalCwd = Deno.cwd();
  const tmpDir = await Deno.makeTempDir({ prefix: "completion-test-" });
  try {
    Deno.chdir(tmpDir);

    const adapter = createCompletionFsAdapter();
    const artifacts = {
      bash: {
        path: "storyteller.bash",
        content: "# bash completion",
      },
      zsh: {
        path: "storyteller.zsh",
        content: "# zsh completion",
      },
    };

    await adapter.write(artifacts);

    const bashContent = await Deno.readTextFile("storyteller.bash");
    assertEquals(bashContent, "# bash completion");
  } finally {
    Deno.chdir(originalCwd);
    await Deno.remove(tmpDir, { recursive: true });
  }
});
