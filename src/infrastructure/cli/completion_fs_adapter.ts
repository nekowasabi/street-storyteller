import { dirname } from "@std/path/dirname";

export interface CompletionScriptDescriptor {
  readonly path: string;
  readonly content: string;
}

export interface CompletionArtifacts {
  readonly bash: CompletionScriptDescriptor;
  readonly zsh: CompletionScriptDescriptor;
}

export interface CompletionFsAdapter {
  write(artifacts: CompletionArtifacts): Promise<void>;
}

export function createCompletionFsAdapter(): CompletionFsAdapter {
  return {
    async write(artifacts: CompletionArtifacts): Promise<void> {
      await Promise.all([
        ensureParentDirectory(artifacts.bash.path),
        ensureParentDirectory(artifacts.zsh.path),
      ]);

      await Promise.all([
        Deno.writeTextFile(artifacts.bash.path, artifacts.bash.content),
        Deno.writeTextFile(artifacts.zsh.path, artifacts.zsh.content),
      ]);
    },
  };
}

async function ensureParentDirectory(path: string): Promise<void> {
  const directory = dirname(path);
  if (!directory || directory === ".") {
    return;
  }
  await Deno.mkdir(directory, { recursive: true });
}
