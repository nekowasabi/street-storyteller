import {
  assert,
  assertEquals,
  createStubConfig,
  createStubLogger,
} from "../asserts.ts";
import { MetaWatchCommand } from "../../src/cli/modules/meta/watch.ts";
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

type WatchEvent = { kind: string; paths: string[] };

class FakeWatcher implements AsyncIterable<WatchEvent> {
  closed = false;
  constructor(private readonly events: readonly WatchEvent[]) {}
  close() {
    this.closed = true;
  }
  async *[Symbol.asyncIterator](): AsyncIterator<WatchEvent> {
    for (const event of this.events) {
      yield event;
    }
  }
}

Deno.test("MetaWatchCommand returns invalid_arguments when no path provided", async () => {
  const { presenter } = createRecordingPresenter();
  const watcher = new FakeWatcher([]);
  const command = new MetaWatchCommand(
    undefined as any,
    undefined as any,
    () => watcher,
  );

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

Deno.test("MetaWatchCommand processes a single event and emits updated meta", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-watch-" });
  try {
    const md = `${tmp}/chapter01.md`;
    await Deno.writeTextFile(md, "# test\n");

    const seen: {
      markdown: string;
      output: string;
      mode: "emit" | "update";
    }[] = [];

    const service = {
      generateFromMarkdown: async () =>
        ok({
          id: "chapter01",
          title: "t",
          order: 1,
          characters: [],
          settings: [],
        }),
    };

    const emitter = {
      emit: async (_meta: unknown, outputPath: string) => {
        seen.push({ markdown: md, output: outputPath, mode: "emit" });
        return ok(undefined);
      },
      updateOrEmit: async (_meta: unknown, outputPath: string) => {
        seen.push({ markdown: md, output: outputPath, mode: "update" });
        return ok(undefined);
      },
    };

    const watcher = new FakeWatcher([{ kind: "modify", paths: [md] }]);
    const { presenter } = createRecordingPresenter();
    const command = new MetaWatchCommand(
      service as any,
      emitter as any,
      () => watcher,
    );

    const context: CommandContext = {
      args: { extra: [tmp], debounce: 0 },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);

    await new Promise((resolve) => setTimeout(resolve, 10));
    assertEquals(seen.length, 1);
    assertEquals(seen[0]?.mode, "update");
    assertEquals(seen[0]?.output, `${tmp}/chapter01.meta.ts`);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("MetaWatchCommand shows help without starting watcher", async () => {
  const { presenter, messages } = createRecordingPresenter();
  const command = new MetaWatchCommand(
    undefined as any,
    undefined as any,
    () => {
      throw new Error("watcher should not be created");
    },
  );

  const context: CommandContext = {
    args: { help: true },
    presenter,
    config: createStubConfig(),
    logger: createStubLogger(),
  };

  const result = await command.execute(context);
  assertEquals(result.ok, true);
  assert(
    messages.info.some((m) => m.includes("meta watch")),
    "help should be printed",
  );
});

Deno.test("MetaWatchCommand rejects negative debounce", async () => {
  const { presenter } = createRecordingPresenter();
  const command = new MetaWatchCommand(
    undefined as any,
    undefined as any,
    () => {
      throw new Error("watcher should not be created");
    },
  );

  const context: CommandContext = {
    args: { extra: ["manuscripts"], debounce: -1 },
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

Deno.test("MetaWatchCommand returns invalid_arguments when path does not exist", async () => {
  const { presenter } = createRecordingPresenter();
  const command = new MetaWatchCommand(
    undefined as any,
    undefined as any,
    () => {
      throw new Error("watcher should not be created");
    },
  );

  const context: CommandContext = {
    args: { extra: ["/definitely-not-here"], debounce: 0 },
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

Deno.test("MetaWatchCommand uses emit() when --force is set", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-watch-" });
  try {
    const md = `${tmp}/chapter01.md`;
    await Deno.writeTextFile(md, "# test\n");

    const seen: { output: string; mode: "emit" | "update" }[] = [];

    const service = {
      generateFromMarkdown: async () =>
        ok({
          id: "chapter01",
          title: "t",
          order: 1,
          characters: [],
          settings: [],
        }),
    };

    const emitter = {
      emit: async (_meta: unknown, outputPath: string) => {
        seen.push({ output: outputPath, mode: "emit" });
        return ok(undefined);
      },
      updateOrEmit: async (_meta: unknown, outputPath: string) => {
        seen.push({ output: outputPath, mode: "update" });
        return ok(undefined);
      },
    };

    const watcher = new FakeWatcher([{ kind: "modify", paths: [md] }]);
    const { presenter } = createRecordingPresenter();
    const command = new MetaWatchCommand(
      service as any,
      emitter as any,
      () => watcher,
    );

    const context: CommandContext = {
      args: { extra: [tmp], debounce: 0, force: true },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);

    await new Promise((resolve) => setTimeout(resolve, 10));
    assertEquals(seen.length, 1);
    assertEquals(seen[0]?.mode, "emit");
    assertEquals(seen[0]?.output, `${tmp}/chapter01.meta.ts`);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("MetaWatchCommand ignores access events", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-watch-" });
  try {
    const md = `${tmp}/chapter01.md`;
    await Deno.writeTextFile(md, "# test\n");

    let calls = 0;
    const service = {
      generateFromMarkdown: async () => {
        calls += 1;
        return ok({
          id: "chapter01",
          title: "t",
          order: 1,
          characters: [],
          settings: [],
        });
      },
    };
    const emitter = {
      emit: async () => ok(undefined),
      updateOrEmit: async () => ok(undefined),
    };

    const watcher = new FakeWatcher([
      { kind: "access", paths: [md] },
      { kind: "modify", paths: [md] },
    ]);
    const { presenter } = createRecordingPresenter();
    const command = new MetaWatchCommand(
      service as any,
      emitter as any,
      () => watcher,
    );

    const context: CommandContext = {
      args: { extra: [tmp], debounce: 0 },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);

    await new Promise((resolve) => setTimeout(resolve, 10));
    assertEquals(calls, 1);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("MetaWatchCommand watches a single file non-recursively even if --recursive is set", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-watch-" });
  try {
    const md = `${tmp}/chapter01.md`;
    await Deno.writeTextFile(md, "# test\n");

    const watcher = new FakeWatcher([]);
    let seen: { paths: readonly string[]; recursive: boolean } | undefined;
    const command = new MetaWatchCommand(
      undefined as any,
      undefined as any,
      (paths, options) => {
        seen = { paths, recursive: options.recursive };
        return watcher;
      },
    );

    const context: CommandContext = {
      args: { extra: [md], recursive: true, debounce: 0 },
      presenter: createRecordingPresenter().presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);
    assert(seen !== undefined);
    assertEquals(seen?.recursive, false);
    assertEquals(seen?.paths[0], md);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("MetaWatchCommand reports generation failure and continues", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-watch-" });
  try {
    const bad = `${tmp}/bad.md`;
    const good = `${tmp}/good.md`;
    await Deno.writeTextFile(bad, "# bad\n");
    await Deno.writeTextFile(good, "# good\n");

    const seen: string[] = [];
    const service = {
      generateFromMarkdown: async (markdownPath: string) => {
        if (markdownPath.endsWith("bad.md")) {
          return err({ message: "boom" } as any);
        }
        return ok({
          id: "good",
          title: "t",
          order: 1,
          characters: [],
          settings: [],
        });
      },
    };

    const emitter = {
      emit: async () => ok(undefined),
      updateOrEmit: async (_meta: unknown, outputPath: string) => {
        seen.push(outputPath);
        return ok(undefined);
      },
    };

    const watcher = new FakeWatcher([
      { kind: "modify", paths: [bad] },
      { kind: "modify", paths: [good] },
    ]);
    const { presenter, messages } = createRecordingPresenter();
    const command = new MetaWatchCommand(
      service as any,
      emitter as any,
      () => watcher,
    );

    const context: CommandContext = {
      args: { extra: [tmp], debounce: 0 },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);

    await new Promise((resolve) => setTimeout(resolve, 10));
    assert(messages.error.some((m) => m.includes("generation failed")));
    assertEquals(seen.length, 1);
    assertEquals(seen[0], `${tmp}/good.meta.ts`);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("MetaWatchCommand reports write failure", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-watch-" });
  try {
    const md = `${tmp}/chapter01.md`;
    await Deno.writeTextFile(md, "# test\n");

    const service = {
      generateFromMarkdown: async () =>
        ok({
          id: "chapter01",
          title: "t",
          order: 1,
          characters: [],
          settings: [],
        }),
    };

    const emitter = {
      emit: async () => ok(undefined),
      updateOrEmit: async () => err({ message: "no write" } as any),
    };

    const watcher = new FakeWatcher([{ kind: "modify", paths: [md] }]);
    const { presenter, messages } = createRecordingPresenter();
    const command = new MetaWatchCommand(
      service as any,
      emitter as any,
      () => watcher,
    );

    const context: CommandContext = {
      args: { extra: [tmp], debounce: 0 },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);

    await new Promise((resolve) => setTimeout(resolve, 10));
    assert(messages.error.some((m) => m.includes("write failed")));
    assertEquals(messages.success.length, 0);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("MetaWatchCommand reports unexpected errors thrown by service", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-watch-" });
  try {
    const md = `${tmp}/chapter01.md`;
    await Deno.writeTextFile(md, "# test\n");

    const service = {
      generateFromMarkdown: async () => {
        throw new Error("kaboom");
      },
    };

    const emitter = {
      emit: async () => ok(undefined),
      updateOrEmit: async () => ok(undefined),
    };

    const watcher = new FakeWatcher([{ kind: "modify", paths: [md] }]);
    const { presenter, messages } = createRecordingPresenter();
    const command = new MetaWatchCommand(
      service as any,
      emitter as any,
      () => watcher,
    );

    const context: CommandContext = {
      args: { extra: [tmp], debounce: 0 },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);

    await new Promise((resolve) => setTimeout(resolve, 10));
    assert(messages.error.some((m) => m.includes("unexpected error")));
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("MetaWatchCommand debounces repeated changes", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-watch-" });
  try {
    const md = `${tmp}/chapter01.md`;
    await Deno.writeTextFile(md, "# test\n");

    let calls = 0;
    const service = {
      generateFromMarkdown: async () => {
        calls += 1;
        return ok({
          id: "chapter01",
          title: "t",
          order: 1,
          characters: [],
          settings: [],
        });
      },
    };

    const emitter = {
      emit: async () => ok(undefined),
      updateOrEmit: async () => ok(undefined),
    };

    const watcher = new FakeWatcher([
      { kind: "modify", paths: [md] },
      { kind: "modify", paths: [md] },
      { kind: "modify", paths: [md] },
    ]);
    const { presenter } = createRecordingPresenter();
    const command = new MetaWatchCommand(
      service as any,
      emitter as any,
      () => watcher,
    );

    const context: CommandContext = {
      args: { extra: [tmp], debounce: 10 },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    assertEquals(calls, 1);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("MetaWatchCommand parses extra path as string and splits characters/settings csv", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-watch-" });
  try {
    const md = `${tmp}/chapter01.md`;
    await Deno.writeTextFile(md, "# test\n");

    let seenOptions:
      | {
        characters?: readonly string[];
        settings?: readonly string[];
        preset?: string;
      }
      | undefined;

    const service = {
      generateFromMarkdown: async (_markdownPath: string, options: unknown) => {
        seenOptions = options as any;
        return ok({
          id: "chapter01",
          title: "t",
          order: 1,
          characters: [],
          settings: [],
        });
      },
    };

    const emitter = {
      emit: async () => ok(undefined),
      updateOrEmit: async () => ok(undefined),
    };

    const watcher = new FakeWatcher([{ kind: "modify", paths: [md] }]);
    const { presenter } = createRecordingPresenter();
    const command = new MetaWatchCommand(
      service as any,
      emitter as any,
      () => watcher,
    );

    const context: CommandContext = {
      args: {
        extra: tmp,
        debounce: "0",
        characters: " hero, villain ,",
        settings: "city,  castle",
        preset: "dialogue",
      },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);

    await new Promise((resolve) => setTimeout(resolve, 10));
    assert(seenOptions !== undefined);
    assertEquals(
      JSON.stringify(seenOptions?.characters),
      JSON.stringify(["hero", "villain"]),
    );
    assertEquals(
      JSON.stringify(seenOptions?.settings),
      JSON.stringify(["city", "castle"]),
    );
    assertEquals(seenOptions?.preset, "dialogue");
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});

Deno.test("MetaWatchCommand ignores events without paths", async () => {
  const tmp = await Deno.makeTempDir({ prefix: "storyteller-watch-" });
  try {
    const md = `${tmp}/chapter01.md`;
    await Deno.writeTextFile(md, "# test\n");

    let calls = 0;
    const service = {
      generateFromMarkdown: async () => {
        calls += 1;
        return ok({
          id: "chapter01",
          title: "t",
          order: 1,
          characters: [],
          settings: [],
        });
      },
    };

    const emitter = {
      emit: async () => ok(undefined),
      updateOrEmit: async () => ok(undefined),
    };

    const watcher = new FakeWatcher([{ kind: "modify" } as any, {
      kind: "modify",
      paths: [md],
    }]);
    const { presenter } = createRecordingPresenter();
    const command = new MetaWatchCommand(
      service as any,
      emitter as any,
      () => watcher,
    );

    const context: CommandContext = {
      args: { extra: [tmp], debounce: 0 },
      presenter,
      config: createStubConfig(),
      logger: createStubLogger(),
    };

    const result = await command.execute(context);
    assertEquals(result.ok, true);

    await new Promise((resolve) => setTimeout(resolve, 10));
    assertEquals(calls, 1);
  } finally {
    await Deno.remove(tmp, { recursive: true });
  }
});
