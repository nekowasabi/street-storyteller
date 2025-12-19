import { assert } from "./asserts.ts";
import { createCommandRegistry } from "@storyteller/cli/command_registry.ts";
import { registerCoreModules } from "@storyteller/cli/modules/index.ts";
import {
  generateBashCompletionScript,
  generateZshCompletionScript,
} from "@storyteller/cli/completions/generator.ts";

Deno.test("generateBashCompletionScript includes commands and options", () => {
  const registry = createCommandRegistry();
  registerCoreModules(registry);
  const snapshot = registry.snapshot();

  const script = generateBashCompletionScript(snapshot);

  assert(script.includes("_storyteller_completion"));
  assert(script.includes("generate"));
  assert(script.includes("help"));
  assert(script.includes("--name"));
  assert(script.includes("--template"));
});

Deno.test("generateZshCompletionScript includes completion metadata", () => {
  const registry = createCommandRegistry();
  registerCoreModules(registry);
  const snapshot = registry.snapshot();

  const script = generateZshCompletionScript(snapshot);

  assert(script.includes("#compdef storyteller"));
  assert(script.includes("generate"));
  assert(script.includes("help"));
  assert(script.includes("--path"));
});
