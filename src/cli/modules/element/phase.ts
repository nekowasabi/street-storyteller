/**
 * Element Phase Command
 *
 * storyteller element phase コマンドの実装
 * キャラクターの成長フェーズを追加・管理する
 */

import { err, ok } from "../../../shared/result.ts";
import type { CommandContext, CommandExecutionError } from "../../types.ts";
import { BaseCliCommand } from "../../base_command.ts";
import type {
  CharacterPhase,
  CharacterStateDelta,
  PhaseImportance,
  RelationshipsDelta,
  TransitionType,
} from "../../../type/v2/character_phase.ts";
import type { Character, RelationType } from "../../../type/v2/character.ts";
import { createLegacyCommandDescriptor } from "../../legacy_adapter.ts";
import type { CommandDescriptor } from "../../types.ts";

/**
 * ElementPhaseCommandのオプション
 */
interface ElementPhaseOptions {
  readonly character: string;
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly summary: string;
  readonly "transition-type"?: TransitionType;
  readonly importance?: PhaseImportance;
  readonly "trigger-event"?: string;
  readonly "start-chapter"?: string;
  readonly "end-chapter"?: string;
  // Delta options
  readonly "add-trait"?: string;
  readonly "remove-trait"?: string;
  readonly "add-ability"?: string;
  readonly "remove-ability"?: string;
  readonly "add-belief"?: string;
  readonly "remove-belief"?: string;
  readonly "add-relationship"?: string; // format: "characterId:relationType"
  readonly "remove-relationship"?: string;
  readonly "status-physical"?: string;
  readonly "status-mental"?: string;
  readonly "status-social"?: string;
  readonly "add-goal"?: string;
  readonly "remove-goal"?: string;
  readonly force?: boolean;
}

/**
 * 有効なTransitionType値
 */
const VALID_TRANSITION_TYPES: TransitionType[] = [
  "gradual",
  "turning_point",
  "revelation",
  "regression",
  "transformation",
];

/**
 * 有効なImportance値
 */
const VALID_IMPORTANCE: PhaseImportance[] = ["major", "minor", "subtle"];

/**
 * storyteller element phase コマンド
 *
 * キャラクターの成長フェーズを追加する
 */
export class ElementPhaseCommand extends BaseCliCommand {
  override readonly name = "phase" as const;
  override readonly path = ["element", "phase"] as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const parsed = this.parseOptions(context);
    if ("code" in parsed) {
      return err(parsed);
    }

    try {
      // プロジェクトルートを取得
      const config = await context.config.resolve();
      const projectRoot = (context.args?.projectRoot as string) ||
        config.runtime.projectRoot || Deno.cwd();

      // キャラクターファイルを読み込み
      const characterFilePath =
        `${projectRoot}/src/characters/${parsed.character}.ts`;

      let characterContent: string;
      try {
        characterContent = await Deno.readTextFile(characterFilePath);
      } catch {
        return err({
          code: "character_not_found",
          message: `Character file not found: ${characterFilePath}`,
        });
      }

      // 差分を構築
      const delta = this.buildDelta(parsed);

      // 新しいフェーズを作成
      const newPhase: CharacterPhase = {
        id: parsed.id,
        name: parsed.name,
        order: parsed.order,
        summary: parsed.summary,
        delta,
      };

      // オプショナルフィールドを追加
      if (parsed["transition-type"]) {
        newPhase.transitionType = parsed["transition-type"];
      }
      if (parsed.importance) {
        newPhase.importance = parsed.importance;
      }
      if (parsed["trigger-event"]) {
        newPhase.triggerEventId = parsed["trigger-event"];
      }
      if (parsed["start-chapter"]) {
        newPhase.startChapter = parsed["start-chapter"];
      }
      if (parsed["end-chapter"]) {
        newPhase.endChapter = parsed["end-chapter"];
      }

      // キャラクターファイルにフェーズを追加
      const updatedContent = this.addPhaseToCharacter(
        characterContent,
        newPhase,
        parsed.force ?? false,
      );

      // ファイルを書き込み
      await Deno.writeTextFile(characterFilePath, updatedContent);

      context.logger.info("Phase added to character", {
        characterId: parsed.character,
        phaseId: parsed.id,
        phaseName: parsed.name,
      });

      return ok({
        characterId: parsed.character,
        phaseId: parsed.id,
        phaseName: parsed.name,
        filePath: characterFilePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err({
        code: "phase_creation_failed",
        message,
      });
    }
  }

  /**
   * 差分を構築
   */
  private buildDelta(options: ElementPhaseOptions): CharacterStateDelta {
    const delta: CharacterStateDelta = {};

    // traits
    if (options["add-trait"] || options["remove-trait"]) {
      delta.traits = {};
      if (options["add-trait"]) {
        delta.traits.add = options["add-trait"].split(",").map((t) => t.trim());
      }
      if (options["remove-trait"]) {
        delta.traits.remove = options["remove-trait"]
          .split(",")
          .map((t) => t.trim());
      }
    }

    // abilities
    if (options["add-ability"] || options["remove-ability"]) {
      delta.abilities = {};
      if (options["add-ability"]) {
        delta.abilities.add = options["add-ability"]
          .split(",")
          .map((a) => a.trim());
      }
      if (options["remove-ability"]) {
        delta.abilities.remove = options["remove-ability"]
          .split(",")
          .map((a) => a.trim());
      }
    }

    // beliefs
    if (options["add-belief"] || options["remove-belief"]) {
      delta.beliefs = {};
      if (options["add-belief"]) {
        delta.beliefs.add = options["add-belief"]
          .split(",")
          .map((b) => b.trim());
      }
      if (options["remove-belief"]) {
        delta.beliefs.remove = options["remove-belief"]
          .split(",")
          .map((b) => b.trim());
      }
    }

    // relationships
    if (options["add-relationship"] || options["remove-relationship"]) {
      delta.relationships = {} as RelationshipsDelta;
      if (options["add-relationship"]) {
        const addMap: Record<string, RelationType> = {};
        for (const rel of options["add-relationship"].split(",")) {
          const [charId, relType] = rel.split(":").map((s) => s.trim());
          if (charId && relType) {
            addMap[charId] = relType as RelationType;
          }
        }
        delta.relationships.add = addMap;
      }
      if (options["remove-relationship"]) {
        delta.relationships.remove = options["remove-relationship"]
          .split(",")
          .map((r) => r.trim());
      }
    }

    // status
    if (
      options["status-physical"] ||
      options["status-mental"] ||
      options["status-social"]
    ) {
      delta.status = {};
      if (options["status-physical"]) {
        delta.status.physical = options["status-physical"];
      }
      if (options["status-mental"]) {
        delta.status.mental = options["status-mental"];
      }
      if (options["status-social"]) {
        delta.status.social = options["status-social"];
      }
    }

    // goals
    if (options["add-goal"] || options["remove-goal"]) {
      delta.goals = {};
      if (options["add-goal"]) {
        delta.goals.add = options["add-goal"].split(",").map((g) => g.trim());
      }
      if (options["remove-goal"]) {
        delta.goals.remove = options["remove-goal"]
          .split(",")
          .map((g) => g.trim());
      }
    }

    return delta;
  }

  /**
   * キャラクターファイルにフェーズを追加
   */
  private addPhaseToCharacter(
    content: string,
    phase: CharacterPhase,
    _force: boolean,
  ): string {
    // 簡易的な実装: phasesフィールドを見つけて追加
    // 実際のTypeScriptパーサーを使用した方が堅牢だが、ここでは正規表現で対応

    const phaseJson = JSON.stringify(phase, null, 2)
      .split("\n")
      .map((line, i) => (i === 0 ? line : "    " + line))
      .join("\n");

    // phases: [] または phases: [...] を探す
    const phasesMatch = content.match(/phases:\s*\[([\s\S]*?)\]/);
    if (phasesMatch) {
      const existingPhases = phasesMatch[1].trim();
      if (existingPhases === "") {
        // 空の配列
        return content.replace(
          /phases:\s*\[\s*\]/,
          `phases: [\n    ${phaseJson}\n  ]`,
        );
      } else {
        // 既存のフェーズがある場合は末尾に追加
        return content.replace(
          /phases:\s*\[([\s\S]*?)\]/,
          `phases: [$1,\n    ${phaseJson}\n  ]`,
        );
      }
    }

    // phasesフィールドがない場合は追加
    // summaryフィールドの後に追加を試みる
    const summaryMatch = content.match(/(summary:\s*["'][^"']*["'],?)/);
    if (summaryMatch) {
      return content.replace(
        summaryMatch[0],
        `${summaryMatch[0]}\n  phases: [\n    ${phaseJson}\n  ],`,
      );
    }

    // それでも見つからない場合は末尾の}の前に追加
    return content.replace(
      /};?\s*$/,
      `  phases: [\n    ${phaseJson}\n  ],\n};`,
    );
  }

  /**
   * オプションをパースする
   */
  private parseOptions(
    context: CommandContext,
  ): ElementPhaseOptions | CommandExecutionError {
    const args = context.args ?? {};

    // 必須パラメータのチェック
    if (!args.character || typeof args.character !== "string") {
      return {
        code: "invalid_arguments",
        message: "Character ID is required (--character)",
      };
    }

    if (!args.id || typeof args.id !== "string") {
      return {
        code: "invalid_arguments",
        message: "Phase ID is required (--id)",
      };
    }

    if (!args.name || typeof args.name !== "string") {
      return {
        code: "invalid_arguments",
        message: "Phase name is required (--name)",
      };
    }

    if (args.order === undefined || typeof args.order !== "number") {
      return {
        code: "invalid_arguments",
        message: "Phase order is required (--order)",
      };
    }

    if (!args.summary || typeof args.summary !== "string") {
      return {
        code: "invalid_arguments",
        message: "Phase summary is required (--summary)",
      };
    }

    // transition-typeの検証
    if (args["transition-type"]) {
      if (
        !VALID_TRANSITION_TYPES.includes(
          args["transition-type"] as TransitionType,
        )
      ) {
        return {
          code: "invalid_arguments",
          message: `Invalid transition-type: ${
            args["transition-type"]
          }. Must be one of: ${VALID_TRANSITION_TYPES.join(", ")}`,
        };
      }
    }

    // importanceの検証
    if (args.importance) {
      if (!VALID_IMPORTANCE.includes(args.importance as PhaseImportance)) {
        return {
          code: "invalid_arguments",
          message: `Invalid importance: ${args.importance}. Must be one of: ${
            VALID_IMPORTANCE.join(", ")
          }`,
        };
      }
    }

    return {
      character: args.character,
      id: args.id,
      name: args.name,
      order: args.order,
      summary: args.summary,
      "transition-type": args["transition-type"] as TransitionType | undefined,
      importance: args.importance as PhaseImportance | undefined,
      "trigger-event": typeof args["trigger-event"] === "string"
        ? args["trigger-event"]
        : undefined,
      "start-chapter": typeof args["start-chapter"] === "string"
        ? args["start-chapter"]
        : undefined,
      "end-chapter": typeof args["end-chapter"] === "string"
        ? args["end-chapter"]
        : undefined,
      "add-trait": typeof args["add-trait"] === "string"
        ? args["add-trait"]
        : undefined,
      "remove-trait": typeof args["remove-trait"] === "string"
        ? args["remove-trait"]
        : undefined,
      "add-ability": typeof args["add-ability"] === "string"
        ? args["add-ability"]
        : undefined,
      "remove-ability": typeof args["remove-ability"] === "string"
        ? args["remove-ability"]
        : undefined,
      "add-belief": typeof args["add-belief"] === "string"
        ? args["add-belief"]
        : undefined,
      "remove-belief": typeof args["remove-belief"] === "string"
        ? args["remove-belief"]
        : undefined,
      "add-relationship": typeof args["add-relationship"] === "string"
        ? args["add-relationship"]
        : undefined,
      "remove-relationship": typeof args["remove-relationship"] === "string"
        ? args["remove-relationship"]
        : undefined,
      "status-physical": typeof args["status-physical"] === "string"
        ? args["status-physical"]
        : undefined,
      "status-mental": typeof args["status-mental"] === "string"
        ? args["status-mental"]
        : undefined,
      "status-social": typeof args["status-social"] === "string"
        ? args["status-social"]
        : undefined,
      "add-goal": typeof args["add-goal"] === "string"
        ? args["add-goal"]
        : undefined,
      "remove-goal": typeof args["remove-goal"] === "string"
        ? args["remove-goal"]
        : undefined,
      force: args.force === true,
    };
  }
}

/**
 * element phase コマンドのハンドラー
 */
export const elementPhaseHandler = new ElementPhaseCommand();

/**
 * element phase コマンドの Descriptor
 */
export const elementPhaseCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(elementPhaseHandler, {
    summary: "Add a growth phase to a character.",
    usage:
      "storyteller element phase --character <id> --id <phase-id> --name <name> --order <n> --summary <summary> [delta-options]",
    path: ["element", "phase"],
    options: [
      {
        name: "--character",
        summary: "Character ID (required)",
        type: "string",
        required: true,
      },
      {
        name: "--id",
        summary: "Phase ID (required)",
        type: "string",
        required: true,
      },
      {
        name: "--name",
        summary: "Phase name (required)",
        type: "string",
        required: true,
      },
      {
        name: "--order",
        summary: "Phase order in timeline (required)",
        type: "number",
        required: true,
      },
      {
        name: "--summary",
        summary: "Short summary of the phase (required)",
        type: "string",
        required: true,
      },
      {
        name: "--transition-type",
        summary:
          "Transition type: gradual, turning_point, revelation, regression, transformation",
        type: "string",
      },
      {
        name: "--importance",
        summary: "Importance level: major, minor, subtle",
        type: "string",
      },
      {
        name: "--trigger-event",
        summary: "Trigger event ID from timeline",
        type: "string",
      },
      {
        name: "--start-chapter",
        summary: "Starting chapter ID",
        type: "string",
      },
      {
        name: "--end-chapter",
        summary: "Ending chapter ID",
        type: "string",
      },
      {
        name: "--add-trait",
        summary: "Comma-separated traits to add",
        type: "string",
      },
      {
        name: "--remove-trait",
        summary: "Comma-separated traits to remove",
        type: "string",
      },
      {
        name: "--add-ability",
        summary: "Comma-separated abilities to add",
        type: "string",
      },
      {
        name: "--remove-ability",
        summary: "Comma-separated abilities to remove",
        type: "string",
      },
      {
        name: "--add-belief",
        summary: "Comma-separated beliefs to add",
        type: "string",
      },
      {
        name: "--remove-belief",
        summary: "Comma-separated beliefs to remove",
        type: "string",
      },
      {
        name: "--add-relationship",
        summary: "Relationships to add (format: characterId:relationType,...)",
        type: "string",
      },
      {
        name: "--remove-relationship",
        summary: "Comma-separated relationship character IDs to remove",
        type: "string",
      },
      {
        name: "--status-physical",
        summary: "Physical status change",
        type: "string",
      },
      {
        name: "--status-mental",
        summary: "Mental status change",
        type: "string",
      },
      {
        name: "--status-social",
        summary: "Social status change",
        type: "string",
      },
      {
        name: "--add-goal",
        summary: "Comma-separated goals to add",
        type: "string",
      },
      {
        name: "--remove-goal",
        summary: "Comma-separated goals to remove",
        type: "string",
      },
      {
        name: "--force",
        summary: "Overwrite existing phase with same ID",
        type: "boolean",
      },
    ],
    examples: [
      {
        summary: "Add a basic growth phase",
        command:
          'storyteller element phase --character "hero" --id "awakening" --name "Awakening" --order 1 --summary "Hero awakens to their power"',
      },
      {
        summary: "Add a phase with trait changes",
        command:
          'storyteller element phase --character "hero" --id "growth" --name "Growth" --order 2 --summary "Hero grows stronger" --add-trait "brave,strong" --remove-trait "timid" --transition-type "turning_point"',
      },
      {
        summary: "Add a phase with relationship and status changes",
        command:
          'storyteller element phase --character "hero" --id "alliance" --name "Alliance" --order 3 --summary "Hero forms alliances" --add-relationship "companion:ally,mentor:respect" --status-mental "Determined"',
      },
    ],
  });
