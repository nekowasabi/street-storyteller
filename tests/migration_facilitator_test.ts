import { assert, assertEquals } from "./asserts.ts";
import {
  createMigrationFacilitator,
  NoopMigrationFacilitator,
} from "@storyteller/application/migration_facilitator.ts";
import { PROJECT_SCHEMA_VERSION } from "@storyteller/core/version.ts";
import type {
  FileSystemError,
  FileSystemGateway,
} from "@storyteller/application/file_system_gateway.ts";
import { err, ok } from "@storyteller/shared/result.ts";

class FakeFileSystem implements FileSystemGateway {
  failEnsureDir = false;
  failWrite = false;

  constructor(private readonly files: Record<string, string>) {}

  async ensureDir(_path: string) {
    if (this.failEnsureDir) {
      return err<FileSystemError>({
        code: "permission_denied",
        message: "deny",
      });
    }
    return ok(undefined);
  }

  async writeFile(path: string, content: string) {
    if (this.failWrite) {
      return err<FileSystemError>({
        code: "io_error",
        message: "write failed",
      });
    }
    this.files[path] = content;
    return ok(undefined);
  }

  async exists(path: string) {
    return ok(Object.prototype.hasOwnProperty.call(this.files, path));
  }

  async readFile(path: string) {
    if (!Object.prototype.hasOwnProperty.call(this.files, path)) {
      return err<FileSystemError>({ code: "not_found", message: path });
    }
    return ok(this.files[path]);
  }
}

Deno.test("NoopMigrationFacilitator returns fresh plan", async () => {
  const facilitator = new NoopMigrationFacilitator();
  const plan = await facilitator.assess();
  assertEquals(plan.status, "fresh");
  assertEquals(plan.actions.length, 0);
  assertEquals(plan.warnings.length, 0);
});

Deno.test("MigrationFacilitator detects missing manifest", async () => {
  const fs = new FakeFileSystem({});
  const facilitator = createMigrationFacilitator(fs);

  const plan = await facilitator.assess("demo");
  assertEquals(plan.status, "fresh");
  assert(
    plan.actions.some((action) => action.description.includes("Add manifest")),
  );
});

Deno.test("MigrationFacilitator reports outdated version", async () => {
  const fs = new FakeFileSystem({
    "demo/.storyteller.json": JSON.stringify({ version: "0.1.0" }),
  });
  const facilitator = createMigrationFacilitator(fs);

  const plan = await facilitator.assess("demo");
  assertEquals(plan.status, "upgrade");
  assert(
    plan.actions.some((action) =>
      action.description.includes("Update manifest version")
    ),
  );
});

Deno.test("MigrationFacilitator treats invalid JSON manifest as incompatible", async () => {
  const fs = new FakeFileSystem({
    "demo/.storyteller.json": "{not json",
  });
  const facilitator = createMigrationFacilitator(fs);

  const plan = await facilitator.assess("demo");
  assertEquals(plan.status, "incompatible");
  assertEquals(plan.actions.length, 0);
  assert(plan.warnings.some((w) => w.includes("invalid JSON")));
});

Deno.test("MigrationFacilitator treats manifest missing version as incompatible", async () => {
  const fs = new FakeFileSystem({
    "demo/.storyteller.json": JSON.stringify({}),
  });
  const facilitator = createMigrationFacilitator(fs);

  const plan = await facilitator.assess("demo");
  assertEquals(plan.status, "incompatible");
});

Deno.test("MigrationFacilitator reports fresh when schema version matches", async () => {
  const fs = new FakeFileSystem({
    "demo/.storyteller.json": JSON.stringify({
      version: PROJECT_SCHEMA_VERSION,
    }),
  });
  const facilitator = createMigrationFacilitator(fs);

  const plan = await facilitator.assess("demo");
  assertEquals(plan.status, "fresh");
  assertEquals(plan.actions.length, 0);
});

Deno.test("MigrationFacilitator writes manifest when requested", async () => {
  const fs = new FakeFileSystem({});
  const facilitator = createMigrationFacilitator(fs);
  await facilitator.ensureManifest("demo");

  const manifest = await fs.readFile("demo/.storyteller.json");
  assert(manifest.ok, "manifest should exist");
  if (manifest.ok) {
    const json = JSON.parse(manifest.value) as { version: string };
    assertEquals(json.version, PROJECT_SCHEMA_VERSION);
  }
});

Deno.test("MigrationFacilitator returns error when ensureDir fails", async () => {
  const fs = new FakeFileSystem({});
  fs.failEnsureDir = true;
  const facilitator = createMigrationFacilitator(fs);

  const result = await facilitator.ensureManifest("demo");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.code, "permission_denied");
  }
});

Deno.test("MigrationFacilitator returns error when writeFile fails", async () => {
  const fs = new FakeFileSystem({});
  fs.failWrite = true;
  const facilitator = createMigrationFacilitator(fs);

  const result = await facilitator.ensureManifest("demo");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.code, "io_error");
  }
});

Deno.test("MigrationFacilitator emits report", async () => {
  const fs = new FakeFileSystem({});
  const facilitator = createMigrationFacilitator(fs);
  const plan = await facilitator.assess("demo");
  const report = facilitator.emitReport(plan);

  assertEquals(report.status, plan.status);
  assert(report.messages.length > 0);
});
