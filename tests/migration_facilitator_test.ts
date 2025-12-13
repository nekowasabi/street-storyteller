import { assert, assertEquals } from "./asserts.ts";
import {
  createMigrationFacilitator,
  CURRENT_VERSION,
  NoopMigrationFacilitator,
} from "../src/application/migration_facilitator.ts";
import type {
  FileSystemError,
  FileSystemGateway,
} from "../src/application/file_system_gateway.ts";
import { err, ok } from "../src/shared/result.ts";

class FakeFileSystem implements FileSystemGateway {
  constructor(private readonly files: Record<string, string>) {}

  async ensureDir(_path: string) {
    return ok(undefined);
  }

  async writeFile(path: string, content: string) {
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

Deno.test("MigrationFacilitator writes manifest when requested", async () => {
  const fs = new FakeFileSystem({});
  const facilitator = createMigrationFacilitator(fs);
  await facilitator.ensureManifest("demo");

  const manifest = await fs.readFile("demo/.storyteller.json");
  assert(manifest.ok, "manifest should exist");
  if (manifest.ok) {
    const json = JSON.parse(manifest.value) as { version: string };
    assertEquals(json.version, CURRENT_VERSION);
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
