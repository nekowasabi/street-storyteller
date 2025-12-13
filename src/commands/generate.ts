import { createProjectScaffoldingService } from "../application/project_scaffolding_service.ts";
import { DenoFileSystemGateway } from "../application/file_system_gateway.ts";
import { createMigrationFacilitator } from "../application/migration_facilitator.ts";
import { createDocumentationEmitter } from "../application/documentation_emitter.ts";
import { StaticTemplateCatalog } from "../domain/project_blueprint.ts";
import {
  createStandardValidationPolicy,
  createStoryDomainService,
} from "../domain/story_domain_service.ts";

export interface GenerateOptions {
  name: string;
  template: "basic" | "novel" | "screenplay";
  path?: string;
}

export async function generateStoryProject(
  options: GenerateOptions,
): Promise<void> {
  const fileSystem = new DenoFileSystemGateway();
  const documentationEmitter = createDocumentationEmitter();
  const service = createProjectScaffoldingService({
    fileSystem,
    migrationFacilitator: createMigrationFacilitator(fileSystem),
    storyDomainService: createStoryDomainService({
      catalog: new StaticTemplateCatalog(),
      validationPolicy: createStandardValidationPolicy(),
    }),
    documentationEmitter,
  });

  const result = await service.generate(options);

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  console.log(`✅ Story project "${options.name}" generated successfully!`);
  console.log(`📁 Location: ${result.value.projectPath}`);
  for (const message of result.value.migrationGuide) {
    console.log(message);
  }
  for (const message of result.value.tddGuide) {
    console.log(message);
  }
}
