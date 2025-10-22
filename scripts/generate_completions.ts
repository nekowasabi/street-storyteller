#!/usr/bin/env -S deno run --allow-read --allow-write

import { join } from "@std/path/join";
import { createCommandRegistry } from "../src/cli/command_registry.ts";
import { registerCoreModules } from "../src/cli/modules/index.ts";
import {
  generateBashCompletionScript,
  generateZshCompletionScript,
} from "../src/cli/completions/generator.ts";
import { createCompletionFsAdapter } from "../src/infrastructure/cli/completion_fs_adapter.ts";

const registry = createCommandRegistry();
registerCoreModules(registry);
const tree = registry.snapshot();

const bashScript = generateBashCompletionScript(tree);
const zshScript = generateZshCompletionScript(tree);

const outputDir = "dist/completions";
const adapter = createCompletionFsAdapter();

await adapter.write({
  bash: {
    path: join(outputDir, "storyteller.bash"),
    content: bashScript,
  },
  zsh: {
    path: join(outputDir, "_storyteller"),
    content: zshScript,
  },
});

console.log(`Bash completion: ${join(outputDir, "storyteller.bash")}`);
console.log(`Zsh completion: ${join(outputDir, "_storyteller")}`);
