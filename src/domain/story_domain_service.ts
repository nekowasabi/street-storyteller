import type { Result } from "@storyteller/shared/result.ts";
import { err, ok } from "@storyteller/shared/result.ts";
import type {
  ProjectBlueprint,
  TemplateCatalog,
  TemplateError,
  TemplateId,
} from "@storyteller/domain/project_blueprint.ts";

export interface ValidationError {
  readonly code: "missing_directory" | "missing_file" | "invalid_content";
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ValidationPolicy {
  validate(blueprint: ProjectBlueprint): Result<void, ValidationError>;
}

export interface StoryDomainService {
  resolveTemplate(
    template: TemplateId,
  ): Result<ProjectBlueprint, TemplateError | ValidationError>;
  validateBlueprint(blueprint: ProjectBlueprint): Result<void, ValidationError>;
}

export interface StoryDomainDependencies {
  readonly catalog: TemplateCatalog;
  readonly validationPolicy: ValidationPolicy;
}

const REQUIRED_DIRECTORIES = [
  "src/characters",
  "src/settings",
  "tests",
];

const REQUIRED_FILES = [
  "story.ts",
  "story.config.ts",
  "README.md",
];

export function createStoryDomainService(
  deps: StoryDomainDependencies,
): StoryDomainService {
  return {
    resolveTemplate(template: TemplateId) {
      const blueprint = deps.catalog.getBlueprint(template);
      if (!blueprint.ok) {
        return err(blueprint.error);
      }

      const validation = deps.validationPolicy.validate(blueprint.value);
      if (!validation.ok) {
        return err(validation.error);
      }

      return ok(blueprint.value);
    },

    validateBlueprint(blueprint: ProjectBlueprint) {
      return deps.validationPolicy.validate(blueprint);
    },
  };
}

export function createStandardValidationPolicy(): ValidationPolicy {
  return {
    validate(blueprint) {
      for (const dir of REQUIRED_DIRECTORIES) {
        if (!blueprint.directories.includes(dir)) {
          return err({
            code: "missing_directory",
            message: `Required directory missing: ${dir}`,
            details: { directory: dir },
          });
        }
      }

      const filePaths = new Set(blueprint.files.map((file) => file.path));
      for (const file of REQUIRED_FILES) {
        if (!filePaths.has(file)) {
          return err({
            code: "missing_file",
            message: `Required file missing: ${file}`,
            details: { file },
          });
        }
      }

      return ok(undefined);
    },
  };
}
