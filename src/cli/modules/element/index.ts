/**
 * Element コマンドグループ
 * `storyteller element` コマンドとそのサブコマンドを管理
 */
import { ok } from "@storyteller/shared/result.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import { renderHelp } from "@storyteller/cli/help/renderer.ts";
import type { CommandRegistry } from "@storyteller/cli/command_registry.ts";
import type {
  CommandContext,
  CommandDescriptor,
} from "@storyteller/cli/types.ts";
import { ElementCharacterCommand } from "@storyteller/cli/modules/element/character.ts";
import { ElementSettingCommand } from "@storyteller/cli/modules/element/setting.ts";
import { ElementTimelineCommand } from "@storyteller/cli/modules/element/timeline.ts";
import { ElementEventCommand } from "@storyteller/cli/modules/element/event.ts";
import { ElementForeshadowingCommand } from "@storyteller/cli/modules/element/foreshadowing.ts";
import { elementPhaseCommandDescriptor } from "@storyteller/cli/modules/element/phase.ts";

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
 * element timeline サブコマンドの Descriptor
 */
const elementTimelineHandler = new ElementTimelineCommand();
export const elementTimelineCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(elementTimelineHandler, {
    summary: "Create a new timeline element.",
    usage:
      "storyteller element timeline --name <name> --scope <scope> [options]",
    path: ["element", "timeline"],
    options: [
      {
        name: "--name",
        summary: "Timeline name (required)",
        type: "string",
        required: true,
      },
      {
        name: "--scope",
        summary: "Timeline scope: story, world, character, arc (required)",
        type: "string",
        required: true,
      },
      {
        name: "--id",
        summary: "Timeline ID (defaults to generated from name)",
        type: "string",
      },
      {
        name: "--summary",
        summary: "Short summary description",
        type: "string",
      },
      {
        name: "--parent-timeline",
        summary: "Parent timeline ID",
        type: "string",
      },
      {
        name: "--related-character",
        summary: "Related character ID (for character-scoped timelines)",
        type: "string",
      },
      {
        name: "--display-names",
        summary: "Comma-separated display name variations",
        type: "string",
      },
      {
        name: "--force",
        summary: "Overwrite existing timeline",
        type: "boolean",
      },
    ],
    examples: [
      {
        summary: "Create a story timeline",
        command:
          'storyteller element timeline --name "Main Story" --scope "story" --summary "The main narrative timeline"',
      },
      {
        summary: "Create a character timeline",
        command:
          'storyteller element timeline --name "Hero Journey" --scope "character" --related-character "hero"',
      },
    ],
  });

/**
 * element foreshadowing サブコマンドの Descriptor
 */
const elementForeshadowingHandler = new ElementForeshadowingCommand();
export const elementForeshadowingCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(elementForeshadowingHandler, {
    summary: "Create a new foreshadowing element.",
    usage:
      "storyteller element foreshadowing --name <name> --type <type> --planting-chapter <chapter> --planting-description <description> [options]",
    path: ["element", "foreshadowing"],
    options: [
      {
        name: "--name",
        summary: "Foreshadowing name (required)",
        type: "string",
        required: true,
      },
      {
        name: "--type",
        summary:
          "Foreshadowing type: hint, prophecy, mystery, symbol, chekhov, red_herring (required)",
        type: "string",
        required: true,
      },
      {
        name: "--planting-chapter",
        summary: "Chapter where foreshadowing is planted (required)",
        type: "string",
        required: true,
      },
      {
        name: "--planting-description",
        summary: "Description of how foreshadowing is planted (required)",
        type: "string",
        required: true,
      },
      {
        name: "--id",
        summary: "Foreshadowing ID (defaults to generated from name)",
        type: "string",
      },
      {
        name: "--summary",
        summary: "Short summary description",
        type: "string",
      },
      {
        name: "--importance",
        summary: "Importance level: major, minor, subtle",
        type: "string",
      },
      {
        name: "--planned-resolution-chapter",
        summary: "Planned chapter for resolution",
        type: "string",
      },
      {
        name: "--characters",
        summary: "Comma-separated related character IDs",
        type: "string",
      },
      {
        name: "--settings",
        summary: "Comma-separated related setting IDs",
        type: "string",
      },
      {
        name: "--display-names",
        summary: "Comma-separated display name variations",
        type: "string",
      },
      {
        name: "--force",
        summary: "Overwrite existing foreshadowing",
        type: "boolean",
      },
    ],
    examples: [
      {
        summary: "Create a chekhov's gun type foreshadowing",
        command:
          'storyteller element foreshadowing --name "Ancient Sword" --type "chekhov" --planting-chapter "chapter_01" --planting-description "Hero finds an old sword under the floorboards"',
      },
      {
        summary: "Create a prophecy with importance",
        command:
          'storyteller element foreshadowing --name "Hero Prophecy" --type "prophecy" --planting-chapter "chapter_01" --planting-description "Old woman tells a prophecy" --importance "major"',
      },
    ],
  });

/**
 * element event サブコマンドの Descriptor
 */
const elementEventHandler = new ElementEventCommand();
export const elementEventCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(elementEventHandler, {
    summary: "Add an event to an existing timeline.",
    usage:
      "storyteller element event --timeline <id> --title <title> --category <category> --order <order> [options]",
    path: ["element", "event"],
    options: [
      {
        name: "--timeline",
        summary: "Timeline ID to add event to (required)",
        type: "string",
        required: true,
      },
      {
        name: "--title",
        summary: "Event title (required)",
        type: "string",
        required: true,
      },
      {
        name: "--category",
        summary:
          "Event category: plot_point, character_event, world_event, backstory, foreshadow, climax, resolution (required)",
        type: "string",
        required: true,
      },
      {
        name: "--order",
        summary: "Event order in timeline (required)",
        type: "number",
        required: true,
      },
      {
        name: "--id",
        summary: "Event ID (defaults to generated from title)",
        type: "string",
      },
      {
        name: "--summary",
        summary: "Short summary description",
        type: "string",
      },
      {
        name: "--characters",
        summary: "Comma-separated character IDs",
        type: "string",
      },
      {
        name: "--settings",
        summary: "Comma-separated setting IDs",
        type: "string",
      },
      {
        name: "--chapters",
        summary: "Comma-separated chapter IDs",
        type: "string",
      },
      {
        name: "--caused-by",
        summary: "Comma-separated event IDs that caused this event",
        type: "string",
      },
      {
        name: "--causes",
        summary: "Comma-separated event IDs caused by this event",
        type: "string",
      },
    ],
    examples: [
      {
        summary: "Add a plot point event",
        command:
          'storyteller element event --timeline "main_story" --title "Ball Invitation" --category "plot_point" --order 1 --characters "cinderella"',
      },
      {
        summary: "Add an event with causality",
        command:
          'storyteller element event --timeline "main_story" --title "Midnight Escape" --category "climax" --order 5 --caused-by "ball_dance" --causes "glass_slipper_left"',
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
    summary:
      "Create and manage story elements (characters, settings, timelines, events).",
    usage: "storyteller element <subcommand> [options]",
    children: [
      elementCharacterCommandDescriptor,
      elementSettingCommandDescriptor,
      elementTimelineCommandDescriptor,
      elementEventCommandDescriptor,
      elementForeshadowingCommandDescriptor,
      elementPhaseCommandDescriptor,
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
      {
        summary: "Create a timeline element",
        command:
          'storyteller element timeline --name "Main Story" --scope "story"',
      },
      {
        summary: "Add an event to a timeline",
        command:
          'storyteller element event --timeline "main_story" --title "Opening" --category "plot_point" --order 1',
      },
      {
        summary: "Create a foreshadowing element",
        command:
          'storyteller element foreshadowing --name "Mystery" --type "hint" --planting-chapter "chapter_01" --planting-description "A hint is dropped"',
      },
    ],
  });
}
