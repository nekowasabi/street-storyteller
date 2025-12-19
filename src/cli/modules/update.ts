import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandExecutionError,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import type {
  CommandDescriptor,
  CommandOptionDescriptor,
} from "@storyteller/cli/types.ts";
import { createVersionService } from "@storyteller/application/version_service.ts";
import { DenoFileSystemGateway } from "@storyteller/application/file_system_gateway.ts";
import type { ProjectMetadata } from "@storyteller/shared/config/schema.ts";
import { STORYTELLER_VERSION } from "@storyteller/core/version.ts";

interface UpdateOptions {
  check: boolean;
  apply: boolean;
  addFeature?: string;
  projectPath: string;
}

function parseUpdateOptions(
  context: CommandContext,
): UpdateOptions | CommandExecutionError {
  const args = context.args ?? {};
  const check = args.check === true;
  const apply = args.apply === true;
  const addFeature = typeof args["add-feature"] === "string"
    ? args["add-feature"]
    : undefined;
  const projectPath = typeof args.path === "string" ? args.path : Deno.cwd();

  return {
    check,
    apply,
    addFeature,
    projectPath,
  };
}

async function executeUpdate(context: CommandContext) {
  const parsed = parseUpdateOptions(context);
  if ("code" in parsed) {
    return err(parsed);
  }

  const fs = new DenoFileSystemGateway();
  const versionService = createVersionService(fs, context.logger);

  // --add-feature: 機能フラグの追加
  if (parsed.addFeature) {
    context.logger.info("Adding feature flag", { feature: parsed.addFeature });

    const metadataResult = await versionService.loadProjectMetadata(
      parsed.projectPath,
    );
    if (!metadataResult.ok) {
      return err({
        code: "metadata_load_failed",
        message: metadataResult.error.message,
      });
    }

    const metadata = metadataResult.value;
    const updatedMetadata: ProjectMetadata = {
      ...metadata,
      features: {
        ...metadata.features,
        [parsed.addFeature]: true,
      },
      version: {
        ...metadata.version,
        lastUpdated: new Date(),
      },
    };

    const saveResult = await versionService.saveProjectMetadata(
      parsed.projectPath,
      updatedMetadata,
    );

    if (!saveResult.ok) {
      return err({
        code: "metadata_save_failed",
        message: saveResult.error.message,
      });
    }

    context.logger.info("✓ Feature flag added", {
      feature: parsed.addFeature,
    });

    return ok(undefined);
  }

  // --check: 更新チェックのみ
  if (parsed.check) {
    context.logger.info("Checking for updates", { path: parsed.projectPath });

    const updateResult = await versionService.checkForUpdates(
      parsed.projectPath,
      STORYTELLER_VERSION,
    );

    if (!updateResult.ok) {
      return err({
        code: "update_check_failed",
        message: updateResult.error.message,
      });
    }

    if (updateResult.value.updateAvailable) {
      context.logger.info("✓ Update available", {
        action: updateResult.value.recommendedAction,
        breaking: updateResult.value.breaking,
        description: updateResult.value.description,
      });
    } else {
      context.logger.info("✓ Project is up to date");
    }

    return ok(undefined);
  }

  // --apply: プロジェクトメタデータの更新適用
  if (parsed.apply) {
    context.logger.info("Applying project update", {
      path: parsed.projectPath,
    });

    const metadataResult = await versionService.loadProjectMetadata(
      parsed.projectPath,
    );
    if (!metadataResult.ok) {
      return err({
        code: "metadata_load_failed",
        message: metadataResult.error.message,
      });
    }

    // 更新チェック
    const updateResult = await versionService.checkForUpdates(
      parsed.projectPath,
      STORYTELLER_VERSION,
    );

    if (!updateResult.ok) {
      return err({
        code: "update_check_failed",
        message: updateResult.error.message,
      });
    }

    if (!updateResult.value.updateAvailable) {
      context.logger.info("✓ Project is already up to date");
      return ok(undefined);
    }

    // メジャーバージョンアップの場合は警告
    if (updateResult.value.breaking) {
      context.logger.warn(
        "⚠ Major version update requires migration. Please use 'storyteller migrate' command.",
      );
      return err({
        code: "migration_required",
        message: "Major version update requires migration",
      });
    }

    // メタデータ更新
    const metadata = metadataResult.value;
    const updatedMetadata: ProjectMetadata = {
      ...metadata,
      version: {
        ...metadata.version,
        version: STORYTELLER_VERSION,
        storytellerVersion: STORYTELLER_VERSION,
        lastUpdated: new Date(),
      },
    };

    const saveResult = await versionService.saveProjectMetadata(
      parsed.projectPath,
      updatedMetadata,
    );

    if (!saveResult.ok) {
      return err({
        code: "metadata_save_failed",
        message: saveResult.error.message,
      });
    }

    context.logger.info("✓ Project updated successfully", {
      from: metadata.version.version,
      to: STORYTELLER_VERSION,
    });

    return ok(undefined);
  }

  // オプションなし: ヘルプを表示
  context.logger.info("Update command options:", {
    check: "Check for available updates",
    apply: "Apply project metadata update",
    addFeature: "Add a feature flag to project",
  });

  return ok(undefined);
}

class UpdateCommand extends BaseCliCommand {
  readonly name = "update" as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    return executeUpdate(context);
  }
}

export const updateCommandHandler = new UpdateCommand();

const UPDATE_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "--check",
    aliases: ["-c"],
    summary: "Check for available updates without applying.",
    type: "boolean",
    defaultValue: false,
  },
  {
    name: "--apply",
    aliases: ["-a"],
    summary: "Apply project metadata update.",
    type: "boolean",
    defaultValue: false,
  },
  {
    name: "--add-feature",
    aliases: ["-f"],
    summary: "Add a feature flag to the project.",
    type: "string",
  },
  {
    name: "--path",
    aliases: ["-p"],
    summary: "Project path (default: current directory).",
    type: "string",
  },
] as const;

export const updateCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(
    updateCommandHandler,
    {
      summary: "Update project metadata and feature flags.",
      usage:
        "storyteller update [--check] [--apply] [--add-feature <name>] [--path <path>]",
      aliases: ["u"],
      options: UPDATE_OPTIONS,
      examples: [
        {
          summary: "Check for available updates",
          command: "storyteller update --check",
        },
        {
          summary: "Apply project update",
          command: "storyteller update --apply",
        },
        {
          summary: "Add a feature flag",
          command: 'storyteller update --add-feature "character_details"',
        },
        {
          summary: "Update specific project",
          command: "storyteller u -a -p /path/to/project",
        },
      ],
    },
  );
