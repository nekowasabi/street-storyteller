import { assert, assertEquals } from "./asserts.ts";
import { createProjectScaffoldingService } from "../src/application/project_scaffolding_service.ts";
import type { FileSystemGateway, FileSystemError } from "../src/application/file_system_gateway.ts";
import type {
  MigrationFacilitator,
  MigrationPlan,
  MigrationReport,
} from "../src/application/migration_facilitator.ts";
import type { ProjectBlueprint } from "../src/domain/project_blueprint.ts";
import type { DocumentationEmitter } from "../src/application/documentation_emitter.ts";
import type { TemplateId } from "../src/domain/project_blueprint.ts";
import type { StoryDomainService } from "../src/domain/story_domain_service.ts";
import { err, ok } from "../src/shared/result.ts";

class InMemoryFileSystem implements FileSystemGateway {
  readonly directories: string[] = [];
  readonly files = new Map<string, string>();
  failWrites = new Set<string>();

  async ensureDir(path: string) {
    this.directories.push(path);
    return ok(undefined);
  }

  async writeFile(path: string, content: string) {
    if (this.failWrites.has(path)) {
      return err<FileSystemError>({ code: "io_error", message: "failed" });
    }
    this.files.set(path, content);
    return ok(undefined);
  }

  async exists(_path: string) {
    return ok(false);
  }

  async readFile(path: string) {
    const content = this.files.get(path);
    if (content === undefined) {
      return err<FileSystemError>({ code: "not_found", message: "missing" });
    }
    return ok(content);
  }
}

class StubMigrationFacilitator implements MigrationFacilitator {
  lastPath: string | undefined;
  plan: MigrationPlan = { status: "fresh", actions: [], warnings: [] };

  async assess(path: string): Promise<MigrationPlan> {
    this.lastPath = path;
    return this.plan;
  }

  async ensureManifest(_projectPath: string) {
    return ok(undefined);
  }

  emitReport(plan: MigrationPlan): MigrationReport {
    return { status: plan.status, messages: [] };
  }
}

class StubDocumentationEmitter implements DocumentationEmitter {
  constructor(
    private readonly tddGuide: readonly string[] = [],
    private readonly migrationGuide: readonly string[] = [],
  ) {}

  emitTddGuide(_input: { template: TemplateId }) {
    return this.tddGuide;
  }

  emitMigrationGuide(_report: MigrationReport) {
    return this.migrationGuide;
  }
}

class StubDomainService implements StoryDomainService {
  constructor(
    private readonly blueprintResult: ReturnType<StoryDomainService["resolveTemplate"]>,
    private readonly validationResult = ok(undefined),
  ) {}

  resolveTemplate() {
    return this.blueprintResult;
  }

  validateBlueprint(_blueprint: ProjectBlueprint) {
    return this.validationResult;
  }
}

function baseBlueprint(): ProjectBlueprint {
  return {
    directories: ["tests", "src/characters"],
    files: [{ path: "tests/hello.txt", content: "hi" }],
  };
}

Deno.test("ProjectScaffoldingService writes directories and files", async () => {
  const blueprint = baseBlueprint();
  const fs = new InMemoryFileSystem();
  const migrations = new StubMigrationFacilitator();
  const docs = new StubDocumentationEmitter([
    "TDD step 1",
  ], [
    "Migration info",
  ]);
  const service = createProjectScaffoldingService({
    fileSystem: fs,
    migrationFacilitator: migrations,
    storyDomainService: new StubDomainService(ok(blueprint)),
    documentationEmitter: docs,
  });

  const result = await service.generate({
    name: "demo",
    template: "basic",
  });

  assert(result.ok, "service should succeed");
  assertEquals(fs.directories.includes("demo/tests"), true);
  assertEquals(fs.files.get("demo/tests/hello.txt"), "hi");
  assertEquals(migrations.lastPath, "demo");
  if (result.ok) {
    assertEquals(result.value.migrationGuide.includes("Migration info"), true);
    assertEquals(result.value.tddGuide.includes("TDD step 1"), true);
  }
});

Deno.test("ProjectScaffoldingService bubbles template errors", async () => {
  const fs = new InMemoryFileSystem();
  const migrations = new StubMigrationFacilitator();
  const docs = new StubDocumentationEmitter();
  const service = createProjectScaffoldingService({
    fileSystem: fs,
    migrationFacilitator: migrations,
    storyDomainService: new StubDomainService(
      err({ code: "template_not_found", message: "missing" }),
    ),
    documentationEmitter: docs,
  });

  const result = await service.generate({ name: "demo", template: "basic" });
  assert(!result.ok, "service should fail");
  if (!result.ok) {
    assertEquals(result.error.code, "template_not_found");
  }
});

Deno.test("ProjectScaffoldingService stops when file write fails", async () => {
  const blueprint = baseBlueprint();
  const fs = new InMemoryFileSystem();
  fs.failWrites.add("demo/tests/hello.txt");
  const migrations = new StubMigrationFacilitator();
  const docs = new StubDocumentationEmitter();
  const service = createProjectScaffoldingService({
    fileSystem: fs,
    migrationFacilitator: migrations,
    storyDomainService: new StubDomainService(ok(blueprint)),
    documentationEmitter: docs,
  });

  const result = await service.generate({ name: "demo", template: "basic" });
  assert(!result.ok, "service should fail");
  if (!result.ok) {
    assertEquals(result.error.code, "io_error");
  }
});
