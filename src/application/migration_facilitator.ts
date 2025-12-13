import type {
  FileSystemError,
  FileSystemGateway,
} from "./file_system_gateway.ts";
import { err, ok, type Result } from "../shared/result.ts";

export interface MigrationPlanAction {
  readonly description: string;
  readonly autoRunnable?: boolean;
}

export interface MigrationPlan {
  readonly status: "fresh" | "upgrade" | "incompatible";
  readonly actions: readonly MigrationPlanAction[];
  readonly warnings: readonly string[];
}

export interface MigrationReport {
  readonly status: MigrationPlan["status"];
  readonly messages: readonly string[];
}

export interface MigrationFacilitator {
  assess(projectPath: string): Promise<MigrationPlan>;
  ensureManifest(
    projectPath: string,
  ): Promise<Result<void, MigrationActionError>>;
  emitReport(plan: MigrationPlan): MigrationReport;
}

export interface MigrationActionError {
  readonly code: FileSystemError["code"];
  readonly message: string;
}

export class NoopMigrationFacilitator implements MigrationFacilitator {
  async assess(): Promise<MigrationPlan> {
    return { status: "fresh", actions: [], warnings: [] };
  }

  async ensureManifest(): Promise<Result<void, MigrationActionError>> {
    return ok(undefined);
  }

  emitReport(plan: MigrationPlan): MigrationReport {
    return { status: plan.status, messages: [] };
  }
}

interface Manifest {
  version: string;
}

export const CURRENT_VERSION = "1.0.0";
const MANIFEST_FILE = ".storyteller.json";

export function createMigrationFacilitator(
  fileSystem: FileSystemGateway,
): MigrationFacilitator {
  return {
    async assess(projectPath: string): Promise<MigrationPlan> {
      const manifestPath = joinPath(projectPath, MANIFEST_FILE);
      const manifestResult = await fileSystem.readFile(manifestPath);

      if (!manifestResult.ok) {
        const actions: MigrationPlanAction[] = [
          {
            description: "Add manifest file with current schema",
            autoRunnable: true,
          },
        ];
        return { status: "fresh", actions, warnings: [] };
      }

      const manifestParse = parseManifest(manifestResult.value);
      if (!manifestParse.ok) {
        return {
          status: "incompatible",
          actions: [],
          warnings: ["Existing manifest is invalid JSON"],
        };
      }

      if (manifestParse.value.version === CURRENT_VERSION) {
        return { status: "fresh", actions: [], warnings: [] };
      }

      return {
        status: "upgrade",
        actions: [
          {
            description: "Update manifest version to current schema",
            autoRunnable: true,
          },
        ],
        warnings: [],
      };
    },

    async ensureManifest(projectPath: string) {
      const manifestPath = joinPath(projectPath, MANIFEST_FILE);
      const ensure = await fileSystem.ensureDir(projectPath);
      if (!ensure.ok) {
        return err({ code: ensure.error.code, message: ensure.error.message });
      }

      const write = await fileSystem.writeFile(
        manifestPath,
        JSON.stringify({ version: CURRENT_VERSION }, null, 2) + "\n",
      );
      if (!write.ok) {
        return err({ code: write.error.code, message: write.error.message });
      }

      return ok(undefined);
    },

    emitReport(plan) {
      const messages = [
        `Migration status: ${plan.status}`,
        ...plan.actions.map((action) =>
          `Action: ${action.description}${
            action.autoRunnable ? " (can auto-run)" : ""
          }`
        ),
        ...plan.warnings.map((warning) => `Warning: ${warning}`),
      ];
      return { status: plan.status, messages };
    },
  };
}

function parseManifest(content: string): Result<Manifest, { message: string }> {
  try {
    const manifest = JSON.parse(content) as Manifest;
    if (!manifest.version) {
      return err({ message: "version missing" });
    }
    return ok(manifest);
  } catch (error) {
    return err({
      message: error instanceof Error ? error.message : String(error),
    });
  }
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
