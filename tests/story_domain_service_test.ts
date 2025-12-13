import { assert, assertEquals } from "./asserts.ts";
import { createStoryDomainService } from "../src/domain/story_domain_service.ts";
import { StaticTemplateCatalog } from "../src/domain/project_blueprint.ts";
import { err, ok } from "../src/shared/result.ts";

class StubTemplateCatalog extends StaticTemplateCatalog {
  constructor(
    private readonly blueprintOverride?:
      Parameters<StaticTemplateCatalog["getBlueprint"]>[0] extends never ? never
        : {
          directories: readonly string[];
          files: readonly { path: string; content: string }[];
        },
  ) {
    super();
  }

  override getBlueprint(template: "basic" | "novel" | "screenplay") {
    if (this.blueprintOverride) {
      return ok({ ...this.blueprintOverride });
    }
    return super.getBlueprint(template);
  }
}

Deno.test("StoryDomainService returns blueprint for template", () => {
  const service = createStoryDomainService({
    catalog: new StaticTemplateCatalog(),
    validationPolicy: {
      validate(_blueprint) {
        return ok(undefined);
      },
    },
  });

  const result = service.resolveTemplate("basic");
  assert(result.ok, "template should resolve");
});

Deno.test("StoryDomainService reports validation errors", () => {
  const service = createStoryDomainService({
    catalog: new StaticTemplateCatalog(),
    validationPolicy: {
      validate() {
        return err({ code: "missing_directory", message: "tests dir missing" });
      },
    },
  });

  const result = service.resolveTemplate("basic");
  assert(!result.ok, "validation should fail");
  if (!result.ok) {
    assertEquals(result.error.code, "missing_directory");
  }
});

Deno.test("StoryDomainService validateBlueprint detects missing directories", () => {
  const service = createStoryDomainService({
    catalog: new StubTemplateCatalog({
      directories: ["tests"],
      files: [],
    }),
    validationPolicy: {
      validate(blueprint) {
        if (!blueprint.directories.includes("src/characters")) {
          return err({
            code: "missing_directory",
            message: "src/characters missing",
          });
        }
        return ok(undefined);
      },
    },
  });

  const result = service.resolveTemplate("basic");
  assert(!result.ok, "should fail validation");
  if (!result.ok) {
    assertEquals(result.error.message, "src/characters missing");
  }
});
