/**
 * Element コマンドグループ
 * `storyteller element` コマンドとそのサブコマンドを管理
 */
import { ok } from "../../../shared/result.ts";
import { BaseCliCommand } from "../../base_command.ts";
import { createLegacyCommandDescriptor } from "../../legacy_adapter.ts";
import { renderHelp } from "../../help/renderer.ts";
import type { CommandRegistry } from "../../command_registry.ts";
import type { CommandContext, CommandDescriptor } from "../../types.ts";
import { ElementCharacterCommand } from "./character.ts";
import { ElementSettingCommand } from "./setting.ts";

/**
 * ElementCommand クラス
 * Elementコマンドグループのルートハンドラー
 */
class ElementCommand extends BaseCliCommand {
  override readonly name = "element" as const;

  constructor(private readonly registry: CommandRegistry) {
    super([]);
  }

  protected handle(context: CommandContext) {
    const snapshot = this.registry.snapshot();
    const result = renderHelp(snapshot, ["element"]);
    if (result.kind === "error") {
      context.presenter.showError(result.message);
      context.presenter.showInfo(result.fallback);
      return Promise.resolve(ok(undefined));
    }

    context.presenter.showInfo(result.content);
    return Promise.resolve(ok(undefined));
  }
}

/**
 * element character サブコマンドの Descriptor
 */
const elementCharacterHandler = new ElementCharacterCommand();
export const elementCharacterCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(elementCharacterHandler, {
    summary: "Create a new character element.",
    usage:
      "storyteller element character --name <name> --role <role> [options]",
    path: ["element", "character"],
    options: [
      {
        name: "--name",
        summary: "Character name (required)",
        type: "string",
        required: true,
      },
      {
        name: "--role",
        summary:
          "Character role: protagonist, antagonist, supporting, guest (required)",
        type: "string",
        required: true,
      },
      {
        name: "--id",
        summary: "Character ID (defaults to name)",
        type: "string",
      },
      {
        name: "--summary",
        summary: "Short summary description",
        type: "string",
      },
      {
        name: "--traits",
        summary: "Comma-separated character traits",
        type: "string",
      },
      {
        name: "--with-details",
        summary: "Add all detail field skeletons",
        type: "boolean",
      },
      {
        name: "--add-details",
        summary:
          "Add specific detail fields (comma-separated: appearance,backstory,...)",
        type: "string",
      },
      {
        name: "--separate-files",
        summary: "Separate specified detail fields into files (or 'all')",
        type: "string",
      },
      {
        name: "--force",
        summary: "Overwrite existing details",
        type: "boolean",
      },
    ],
    examples: [
      {
        summary: "Create a basic protagonist character",
        command:
          'storyteller element character --name "hero" --role "protagonist" --summary "The brave hero"',
      },
      {
        summary: "Create character with all details",
        command:
          'storyteller element character --name "hero" --role "protagonist" --with-details',
      },
    ],
  });

/**
 * element setting サブコマンドの Descriptor
 */
const elementSettingHandler = new ElementSettingCommand();
export const elementSettingCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(elementSettingHandler, {
    summary: "Create a new setting element.",
    usage: "storyteller element setting --name <name> --type <type> [options]",
    path: ["element", "setting"],
    options: [
      {
        name: "--name",
        summary: "Setting name (required)",
        type: "string",
        required: true,
      },
      {
        name: "--type",
        summary:
          "Setting type: location, world, culture, organization (required)",
        type: "string",
        required: true,
      },
      {
        name: "--id",
        summary: "Setting ID (defaults to name)",
        type: "string",
      },
      {
        name: "--summary",
        summary: "Short summary description",
        type: "string",
      },
      {
        name: "--display-names",
        summary: "Comma-separated display name variations",
        type: "string",
      },
      {
        name: "--related-settings",
        summary: "Comma-separated related setting IDs",
        type: "string",
      },
      {
        name: "--force",
        summary: "Overwrite existing setting",
        type: "boolean",
      },
    ],
    examples: [
      {
        summary: "Create a location setting",
        command:
          'storyteller element setting --name "Royal Capital" --type "location" --summary "The capital city"',
      },
      {
        summary: "Create a world setting with display names",
        command:
          'storyteller element setting --name "Eldoria" --type "world" --display-names "Ancient Land,Kingdom of Eldoria"',
      },
    ],
  });

/**
 * ElementコマンドグループのDescriptorを作成
 */
export function createElementDescriptor(
  registry: CommandRegistry,
): CommandDescriptor {
  const handler = new ElementCommand(registry);
  return createLegacyCommandDescriptor(handler, {
    summary: "Create and manage story elements (characters, settings, etc.).",
    usage: "storyteller element <subcommand> [options]",
    children: [
      elementCharacterCommandDescriptor,
      elementSettingCommandDescriptor,
    ],
    examples: [
      {
        summary: "Create a character element",
        command:
          'storyteller element character --name "hero" --role "protagonist"',
      },
      {
        summary: "Create a setting element",
        command:
          'storyteller element setting --name "Castle" --type "location"',
      },
    ],
  });
}
