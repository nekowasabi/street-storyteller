import { assertEquals, assert, createStubLogger } from "../asserts.ts";
import { createVersionService } from "../../src/application/version_service.ts";
import type { FileSystemGateway } from "../../src/application/file_system_gateway.ts";
import { ok, err } from "../../src/shared/result.ts";
import type { ProjectMetadata } from "../../src/shared/config/schema.ts";

function createMockFileSystem(files: Record<string, string>): FileSystemGateway {
  return {
    async readFile(path: string) {
      if (files[path]) {
        return ok(files[path]);
      }
      return err({ code: "not_found", message: "File not found" });
    },
    async writeFile(path: string, content: string) {
      files[path] = content;
      return ok(undefined);
    },
    async ensureDir() {
      return ok(undefined);
    },
    async exists(path: string) {
      return ok(files[path] !== undefined);
    },
  };
}

const CURRENT_VERSION = "2.0.0";

Deno.test("VersionService - loadProjectMetadata", async (t) => {
  await t.step("メタデータファイルが存在する場合", async () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "2.0.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-02"),
      },
      features: { character_details: true },
      compatibility: "strict",
    };

    const files = {
      "/project/.storyteller/config.json": JSON.stringify(metadata, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }),
    };

    const fs = createMockFileSystem(files);
    const logger = createStubLogger();
    const service = createVersionService(fs, logger);

    const result = await service.loadProjectMetadata("/project");
    assert(result.ok);
    assertEquals(result.value.version.version, "2.0.0");
  });

  await t.step("メタデータファイルが存在しない場合", async () => {
    const fs = createMockFileSystem({});
    const logger = createStubLogger();
    const service = createVersionService(fs, logger);

    const result = await service.loadProjectMetadata("/project");
    assert(!result.ok);
    assertEquals(result.error.code, "not_found");
  });

  await t.step("無効なJSON", async () => {
    const files = {
      "/project/.storyteller/config.json": "invalid json",
    };

    const fs = createMockFileSystem(files);
    const logger = createStubLogger();
    const service = createVersionService(fs, logger);

    const result = await service.loadProjectMetadata("/project");
    assert(!result.ok);
    assertEquals(result.error.code, "invalid_format");
  });
});

Deno.test("VersionService - saveProjectMetadata", async () => {
  const metadata: ProjectMetadata = {
    version: {
      version: "2.0.0",
      storytellerVersion: "0.3.0",
      created: new Date("2025-01-01"),
      lastUpdated: new Date("2025-01-02"),
    },
    features: { character_details: true },
    compatibility: "strict",
  };

  const files: Record<string, string> = {};
  const fs = createMockFileSystem(files);
  const logger = createStubLogger();
  const service = createVersionService(fs, logger);

  const result = await service.saveProjectMetadata("/project", metadata);
  assert(result.ok);

  const saved = files["/project/.storyteller/config.json"];
  assert(saved);
  const parsed = JSON.parse(saved);
  assertEquals(parsed.version.version, "2.0.0");
});

Deno.test("VersionService - checkCompatibility", async (t) => {
  await t.step("互換性あり", async () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "2.0.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-02"),
      },
      features: {},
      compatibility: "strict",
    };

    const files = {
      "/project/.storyteller/config.json": JSON.stringify(metadata, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }),
    };

    const fs = createMockFileSystem(files);
    const logger = createStubLogger();
    const service = createVersionService(fs, logger);

    const result = await service.checkCompatibility("/project", CURRENT_VERSION);
    assert(result.ok);
    assert(result.value.compatible);
  });

  await t.step("互換性なし", async () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "1.0.0",
        storytellerVersion: "0.2.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-02"),
      },
      features: {},
      compatibility: "strict",
    };

    const files = {
      "/project/.storyteller/config.json": JSON.stringify(metadata, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }),
    };

    const fs = createMockFileSystem(files);
    const logger = createStubLogger();
    const service = createVersionService(fs, logger);

    const result = await service.checkCompatibility("/project", CURRENT_VERSION);
    assert(result.ok);
    assert(!result.value.compatible);
  });
});

Deno.test("VersionService - checkForUpdates", async (t) => {
  await t.step("更新あり", async () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "1.5.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-02"),
      },
      features: {},
      compatibility: "strict",
    };

    const files = {
      "/project/.storyteller/config.json": JSON.stringify(metadata, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }),
    };

    const fs = createMockFileSystem(files);
    const logger = createStubLogger();
    const service = createVersionService(fs, logger);

    const result = await service.checkForUpdates("/project", CURRENT_VERSION);
    assert(result.ok);
    assert(result.value.updateAvailable);
  });

  await t.step("更新なし", async () => {
    const metadata: ProjectMetadata = {
      version: {
        version: "2.0.0",
        storytellerVersion: "0.3.0",
        created: new Date("2025-01-01"),
        lastUpdated: new Date("2025-01-02"),
      },
      features: {},
      compatibility: "strict",
    };

    const files = {
      "/project/.storyteller/config.json": JSON.stringify(metadata, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }),
    };

    const fs = createMockFileSystem(files);
    const logger = createStubLogger();
    const service = createVersionService(fs, logger);

    const result = await service.checkForUpdates("/project", CURRENT_VERSION);
    assert(result.ok);
    assert(!result.value.updateAvailable);
  });
});
