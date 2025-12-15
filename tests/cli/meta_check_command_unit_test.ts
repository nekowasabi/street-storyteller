import {
  assert,
  assertEquals,
  createStubConfig,
  createStubLogger,
} from "../asserts.ts";
import { MetaCheckCommand } from "../../src/cli/modules/meta/check.ts";
import { err, ok } from "../../src/shared/result.ts";
import type { CommandContext } from "../../src/cli/types.ts";

function createRecordingPresenter() {
  const messages: Record<"info" | "success" | "warning" | "error", string[]> = {
    info: [],
    success: [],
    warning: [],
    error: [],
  };
  return {
    messages,
    presenter: {
      showInfo(message: string) {
        messages.info.push(message);
      },
      showSuccess(message: string) {
        messages.success.push(message);
      },
      showWarning(message: string) {
        messages.warning.push(message);
      },
      showError(message: string) {
        messages.error.push(message);
      },
    },
  };
}

Deno.test("MetaCheckCommand returns invalid_arguments when no paths provided", async () => {
  const { presenter } = createRecordingPresenter();
  const command = new MetaCheckCommand({
    generateFromMarkdown: async () =>
      ok({
        id: "chapter01",
        title: "t",
        order: 1,
        characters: [],
        settings: [],
      }),
  } as any);

  const context: CommandContext = {
    args: {},
    presenter,
    config: createStubConfig(),
    logger: createStubLogger(),
  };

  const result = await command.execute(context);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.code, "invalid_arguments");
  }
});

Deno.test("MetaCheckCommand reports meta_check_failed when any file fails", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-meta-check-" });
  try {
    const md = `${tmp}/chapter01.md`;
    await Deno.writeTextFile(md, "# test\n");

    const { presenter, messages } = createRecordingPresenter();
    const command = new MetaCheckCommand({
      generateFromMarkdown: async () => err(new Error("boom")),
    } as any);

    const context: CommandContext = {
      args: { extra: [md] },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.code, "meta_check_failed");
      assert(result.error.message.includes("failed meta check"));
    }
    assert(messages.error.some((m) => m.includes("[meta check]")));
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("MetaCheckCommand reports OK when all files pass", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-meta-check-" });
  try {
    const md = `${tmp}/chapter01.md`;
    await Deno.writeTextFile(md, "# test\n");

    const { presenter, messages } = createRecordingPresenter();
    const command = new MetaCheckCommand({
      generateFromMarkdown: async () =>
        ok({
          id: "chapter01",
          title: "t",
          order: 1,
          characters: [],
          settings: [],
        }),
    } as any);

    const context: CommandContext = {
      args: { extra: [md] },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);
    assert(messages.success.some((m) => m.includes("[meta check] OK")));
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("MetaCheckCommand scans directories for markdown files", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-meta-check-" });
  try {
    await Deno.writeTextFile(`${tmp}/a.md`, "# a\n");
    await Deno.writeTextFile(`${tmp}/b.md`, "# b\n");

    const seen: string[] = [];
    const { presenter } = createRecordingPresenter();
    const command = new MetaCheckCommand({
      generateFromMarkdown: async (path: string) => {
        seen.push(path);
        return ok({
          id: "chapter01",
          title: "t",
          order: 1,
          characters: [],
          settings: [],
        });
      },
    } as any);

    const context: CommandContext = {
      args: { dir: tmp },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);
    assertEquals(seen.length, 2);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
