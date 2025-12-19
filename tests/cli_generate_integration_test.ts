import { assert, assertEquals } from "./asserts.ts";
import { runCLI } from "@storyteller/cli.ts";

const originalArgs = Deno.args;
const originalExit = Deno.exit;

function setArgs(args: string[]) {
  Object.defineProperty(Deno, "args", {
    get: () => args,
    configurable: true,
  });
}

function restoreArgs() {
  Object.defineProperty(Deno, "args", {
    value: originalArgs,
    configurable: true,
  });
}

Deno.test({
  name: "CLI generate command produces guides and manifest",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "cli-generate-" });
    const projectName = "cli-story";
    const args = [
      "generate",
      "--name",
      projectName,
      "--path",
      tempRoot,
    ];

    let exitCalled = false;
    Deno.exit = () => {
      exitCalled = true;
      throw new Error("Deno.exit should not be called");
    };

    setArgs(args);

    const originalLog = console.log;
    const originalError = console.error;
    const logs: string[] = [];

    console.log = (message?: unknown) => {
      logs.push(String(message ?? ""));
    };
    console.error = (message?: unknown) => {
      logs.push(String(message ?? ""));
    };

    try {
      await runCLI();
    } finally {
      console.log = originalLog;
      console.error = originalError;
      restoreArgs();
      Deno.exit = originalExit;
    }

    assert(!exitCalled, "CLI should complete without calling Deno.exit");

    const manifestPath = `${tempRoot}/${projectName}/.storyteller.json`;
    const manifest = await Deno.readTextFile(manifestPath);
    const parsed = JSON.parse(manifest) as { version: string };
    assertEquals(parsed.version, "1.0.0");

    const hasMigrationGuide = logs.some((line) =>
      line.includes("マイグレーションガイド")
    );
    const hasTddGuide = logs.some((line) => line.includes("TDDガイド"));
    assert(hasMigrationGuide, "Migration guide should be emitted");
    assert(hasTddGuide, "TDD guide should be emitted");

    await Deno.remove(tempRoot, { recursive: true });
  },
});
