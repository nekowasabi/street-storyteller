import { err, ok, type Result } from "../shared/result.ts";
import type { FileSystemGateway } from "./file_system_gateway.ts";
import type { DocumentationEmitter } from "./documentation_emitter.ts";
import type {
  MigrationFacilitator,
  MigrationPlan,
  MigrationReport,
} from "./migration_facilitator.ts";
import type {
  ProjectBlueprint,
  TemplateError,
  TemplateId,
} from "../domain/project_blueprint.ts";
import type { StoryDomainService } from "../domain/story_domain_service.ts";

export interface ProjectScaffoldingOptions {
  readonly name: string;
  readonly template: TemplateId;
  readonly path?: string;
}

export interface ProjectScaffoldingResult {
  readonly projectPath: string;
  readonly migrationPlan: MigrationPlan;
  readonly migrationReport: MigrationReport;
  readonly migrationGuide: readonly string[];
  readonly tddGuide: readonly string[];
}

export interface ProjectScaffoldingError {
  readonly code:
    | TemplateError["code"]
    | "io_error"
    | "permission_denied"
    | "not_found";
  readonly message: string;
}

export interface ProjectScaffoldingDependencies {
  readonly fileSystem: FileSystemGateway;
  readonly storyDomainService: StoryDomainService;
  readonly migrationFacilitator: MigrationFacilitator;
  readonly documentationEmitter: DocumentationEmitter;
}

export interface ProjectScaffoldingService {
  generate(
    options: ProjectScaffoldingOptions,
  ): Promise<Result<ProjectScaffoldingResult, ProjectScaffoldingError>>;
}

export function createProjectScaffoldingService(
  deps: ProjectScaffoldingDependencies,
): ProjectScaffoldingService {
  return {
    async generate(options) {
      const projectPath = options.path
        ? joinPath(options.path, options.name)
        : options.name;

      const blueprintResult = deps.storyDomainService.resolveTemplate(
        options.template,
      );
      if (!blueprintResult.ok) {
        return err({
          code: blueprintResult.error.code as ProjectScaffoldingError["code"],
          message: blueprintResult.error.message,
        });
      }
      const blueprint = blueprintResult.value;

      const migrationPlan = await deps.migrationFacilitator.assess(projectPath);

      if (migrationPlan.status === "fresh") {
        const manifestResult = await deps.migrationFacilitator.ensureManifest(
          projectPath,
        );
        if (!manifestResult.ok) {
          return err({
            code: manifestResult.error.code,
            message: manifestResult.error.message,
          });
        }
      } else if (
        migrationPlan.status === "upgrade" &&
        migrationPlan.actions.some((action) => action.autoRunnable)
      ) {
        const manifestResult = await deps.migrationFacilitator.ensureManifest(
          projectPath,
        );
        if (!manifestResult.ok) {
          return err({
            code: manifestResult.error.code,
            message: manifestResult.error.message,
          });
        }
      }

      for (const dir of blueprint.directories) {
        const ensure = await deps.fileSystem.ensureDir(
          joinPath(projectPath, dir),
        );
        if (!ensure.ok) {
          return err({
            code: ensure.error.code,
            message: ensure.error.message,
          });
        }
      }

      for (const file of blueprint.files) {
        const write = await deps.fileSystem.writeFile(
          joinPath(projectPath, file.path),
          file.content,
        );
        if (!write.ok) {
          return err({
            code: write.error.code,
            message: write.error.message,
          });
        }
      }

      const report = deps.migrationFacilitator.emitReport(migrationPlan);
      const migrationGuide = deps.documentationEmitter.emitMigrationGuide(
        report,
      );
      const tddGuide = deps.documentationEmitter.emitTddGuide({
        template: options.template,
      });

      return ok({
        projectPath,
        migrationPlan,
        migrationReport: report,
        migrationGuide,
        tddGuide,
      });
    },
  };
}

function joinPath(base: string, segment: string): string {
  if (!segment) {
    return base;
  }
  if (segment.startsWith("/")) {
    return segment;
  }
  if (!base) {
    return segment;
  }
  if (base.endsWith("/")) {
    return `${base}${segment}`;
  }
  return `${base}/${segment}`;
}
