import type { MigrationReport } from "@storyteller/application/migration_facilitator.ts";
import type { TemplateId } from "@storyteller/domain/project_blueprint.ts";

export interface DocumentationEmitter {
  emitTddGuide(input: { template: TemplateId }): readonly string[];
  emitMigrationGuide(report: MigrationReport): readonly string[];
}

export function createDocumentationEmitter(): DocumentationEmitter {
  return {
    emitTddGuide({ template }) {
      return [
        "TDDガイド: RED - まず失敗するテストを書きましょう",
        `TDDガイド: GREEN - テンプレート ${template} を基に最小の実装でテストを通過させましょう`,
        "TDDガイド: REFACTOR - 実装とテストの重複を取り除き改善しましょう",
      ];
    },

    emitMigrationGuide(report) {
      if (report.messages.length === 0) {
        return [];
      }
      return [
        "マイグレーションガイド:",
        ...report.messages,
      ];
    },
  };
}
