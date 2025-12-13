import { err, ok } from "../../shared/result.ts";
import type { CommandContext, CommandExecutionError } from "../types.ts";
import { BaseCliCommand } from "../base_command.ts";
import { createLegacyCommandDescriptor } from "../legacy_adapter.ts";
import type { CommandDescriptor, CommandOptionDescriptor } from "../types.ts";
import { createVersionService } from "../../application/version_service.ts";
import { DenoFileSystemGateway } from "../../application/file_system_gateway.ts";

const CURRENT_STORYTELLER_VERSION = "0.3.0";

interface VersionOptions {
  check?: boolean;
  projectPath: string;
}

function parseVersionOptions(
  context: CommandContext,
): VersionOptions | CommandExecutionError {
  const args = context.args ?? {};
  const check = args.check === true;
  const projectPath = typeof args.path === "string" ? args.path : Deno.cwd();

  return {
    check,
    projectPath,
  };
}

async function executeVersion(context: CommandContext) {
  const parsed = parseVersionOptions(context);
  if ("code" in parsed) {
    return err(parsed);
  }

  const fs = new DenoFileSystemGateway();
  const versionService = createVersionService(fs, context.logger);

  if (parsed.check) {
    // --check: 互換性チェック
    context.logger.info("Checking project compatibility", {
      path: parsed.projectPath,
    });

    const compatibilityResult = await versionService.checkCompatibility(
      parsed.projectPath,
      CURRENT_STORYTELLER_VERSION,
    );

    if (!compatibilityResult.ok) {
      return err({
        code: "compatibility_check_failed",
        message: compatibilityResult.error.message,
      });
    }

    if (compatibilityResult.value.compatible) {
      context.logger.info(
        "✓ Project is compatible with current storyteller version",
        {
          storytellerVersion: CURRENT_STORYTELLER_VERSION,
        },
      );
    } else {
      context.logger.warn(
        "✗ Project is NOT compatible with current storyteller version",
        {
          storytellerVersion: CURRENT_STORYTELLER_VERSION,
          reason: compatibilityResult.value.reason,
        },
      );
    }

    // 更新チェックも実行
    const updateResult = await versionService.checkForUpdates(
      parsed.projectPath,
      CURRENT_STORYTELLER_VERSION,
    );

    if (!updateResult.ok) {
      return err({
        code: "update_check_failed",
        message: updateResult.error.message,
      });
    }

    if (updateResult.value.updateAvailable) {
      context.logger.info("Update available", {
        action: updateResult.value.recommendedAction,
        breaking: updateResult.value.breaking,
        description: updateResult.value.description,
      });
    }

    return ok(undefined);
  }

  // デフォルト: バージョン情報表示
  context.logger.info("Storyteller version information", {
    storytellerVersion: CURRENT_STORYTELLER_VERSION,
  });

  // プロジェクトメタデータがあれば表示
  const metadataResult = await versionService.loadProjectMetadata(
    parsed.projectPath,
  );
  if (metadataResult.ok) {
    const metadata = metadataResult.value;
    context.logger.info("Project metadata", {
      projectVersion: metadata.version.version,
      storytellerVersion: metadata.version.storytellerVersion,
      compatibility: metadata.compatibility,
      features: Object.keys(metadata.features).filter((key) =>
        metadata.features[key]
      ),
    });
  }

  return ok(undefined);
}

class VersionCommand extends BaseCliCommand {
  readonly name = "version" as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    return executeVersion(context);
  }
}

export const versionCommandHandler = new VersionCommand();

const VERSION_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "--check",
    aliases: ["-c"],
    summary: "Check project compatibility and available updates.",
    type: "boolean",
    defaultValue: false,
  },
  {
    name: "--path",
    aliases: ["-p"],
    summary: "Project path to check (default: current directory).",
    type: "string",
  },
] as const;

export const versionCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(
    versionCommandHandler,
    {
      summary: "Show version information and check compatibility.",
      usage: "storyteller version [--check] [--path <path>]",
      aliases: ["v"],
      options: VERSION_OPTIONS,
      examples: [
        {
          summary: "Show version information",
          command: "storyteller version",
        },
        {
          summary: "Check project compatibility",
          command: "storyteller version --check",
        },
        {
          summary: "Check compatibility for specific project",
          command: "storyteller v -c -p /path/to/project",
        },
      ],
    },
  );
