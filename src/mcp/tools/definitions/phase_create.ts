/**
 * phase_createツール定義
 * キャラクターの成長フェーズを作成するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import { executeCliCommand } from "../cli_adapter.ts";
import { ElementPhaseCommand } from "../../../cli/modules/element/phase.ts";
import type {
  PhaseImportance,
  TransitionType,
} from "../../../type/v2/character_phase.ts";

const VALID_TRANSITION_TYPES: TransitionType[] = [
  "gradual",
  "turning_point",
  "revelation",
  "regression",
  "transformation",
];

const VALID_IMPORTANCE: PhaseImportance[] = ["major", "minor", "subtle"];

export const phaseCreateTool: McpToolDefinition = {
  name: "phase_create",
  description:
    "キャラクターの成長フェーズを作成します。差分管理方式により、変化した属性のみを記述し、変化しない属性は前フェーズから自動継承されます。",
  inputSchema: {
    type: "object",
    properties: {
      character: {
        type: "string",
        description: "対象キャラクターのID（必須）",
      },
      id: {
        type: "string",
        description: "フェーズID（例: awakening, growth）（必須）",
      },
      name: {
        type: "string",
        description: "フェーズ名（例: 覚醒期, 成長期）（必須）",
      },
      order: {
        type: "number",
        description: "フェーズの順序（時系列）（必須）",
      },
      summary: {
        type: "string",
        description: "フェーズの概要（必須）",
      },
      transitionType: {
        type: "string",
        enum: [
          "gradual",
          "turning_point",
          "revelation",
          "regression",
          "transformation",
        ],
        description:
          "遷移タイプ: gradual（段階的）, turning_point（転換点）, revelation（気づき）, regression（退行）, transformation（変容）",
      },
      importance: {
        type: "string",
        enum: ["major", "minor", "subtle"],
        description: "重要度: major, minor, subtle",
      },
      triggerEvent: {
        type: "string",
        description: "トリガーイベントID（TimelineEventへの参照）",
      },
      startChapter: {
        type: "string",
        description: "開始チャプターID",
      },
      endChapter: {
        type: "string",
        description: "終了チャプターID",
      },
      // 差分関連のフラットプロパティ
      addTraits: {
        type: "array",
        items: { type: "string" },
        description: "追加する特性",
      },
      removeTraits: {
        type: "array",
        items: { type: "string" },
        description: "削除する特性",
      },
      addAbilities: {
        type: "array",
        items: { type: "string" },
        description: "追加する能力",
      },
      removeAbilities: {
        type: "array",
        items: { type: "string" },
        description: "削除する能力",
      },
      addBeliefs: {
        type: "array",
        items: { type: "string" },
        description: "追加する信条",
      },
      removeBeliefs: {
        type: "array",
        items: { type: "string" },
        description: "削除する信条",
      },
      addRelationships: {
        type: "array",
        items: { type: "string" },
        description: "追加する関係性（形式: characterId:relationType）",
      },
      removeRelationships: {
        type: "array",
        items: { type: "string" },
        description: "削除する関係性（キャラクターID）",
      },
      statusPhysical: {
        type: "string",
        description: "身体的状態の変化",
      },
      statusMental: {
        type: "string",
        description: "精神的状態の変化",
      },
      statusSocial: {
        type: "string",
        description: "社会的立場の変化",
      },
      addGoals: {
        type: "array",
        items: { type: "string" },
        description: "追加する目標",
      },
      removeGoals: {
        type: "array",
        items: { type: "string" },
        description: "削除する目標",
      },
    },
    required: ["character", "id", "name", "order", "summary"],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const character = args.character as string | undefined;
    const id = args.id as string | undefined;
    const name = args.name as string | undefined;
    const order = args.order as number | undefined;
    const summary = args.summary as string | undefined;

    // 必須パラメータチェック
    if (
      !character || typeof character !== "string" || character.trim() === ""
    ) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'character' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (!id || typeof id !== "string" || id.trim() === "") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'id' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (!name || typeof name !== "string" || name.trim() === "") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'name' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (order === undefined || typeof order !== "number") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'order' parameter is required and must be a number.",
          },
        ],
        isError: true,
      };
    }

    if (!summary || typeof summary !== "string" || summary.trim() === "") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'summary' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    // transitionTypeの検証
    if (args.transitionType) {
      if (
        !VALID_TRANSITION_TYPES.includes(args.transitionType as TransitionType)
      ) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                `Error: Invalid transitionType '${args.transitionType}'. Must be one of: ${
                  VALID_TRANSITION_TYPES.join(", ")
                }.`,
            },
          ],
          isError: true,
        };
      }
    }

    // importanceの検証
    if (args.importance) {
      if (!VALID_IMPORTANCE.includes(args.importance as PhaseImportance)) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                `Error: Invalid importance '${args.importance}'. Must be one of: ${
                  VALID_IMPORTANCE.join(", ")
                }.`,
            },
          ],
          isError: true,
        };
      }
    }

    // CLIコマンド用の引数を構築
    const commandArgs: Record<string, unknown> = {
      character,
      id,
      name,
      order,
      summary,
    };

    if (typeof args.transitionType === "string") {
      commandArgs["transition-type"] = args.transitionType;
    }

    if (typeof args.importance === "string") {
      commandArgs.importance = args.importance;
    }

    if (typeof args.triggerEvent === "string") {
      commandArgs["trigger-event"] = args.triggerEvent;
    }

    if (typeof args.startChapter === "string") {
      commandArgs["start-chapter"] = args.startChapter;
    }

    if (typeof args.endChapter === "string") {
      commandArgs["end-chapter"] = args.endChapter;
    }

    // フラットな差分プロパティの処理
    if (Array.isArray(args.addTraits) && args.addTraits.length > 0) {
      commandArgs["add-trait"] = args.addTraits.join(",");
    }
    if (Array.isArray(args.removeTraits) && args.removeTraits.length > 0) {
      commandArgs["remove-trait"] = args.removeTraits.join(",");
    }
    if (Array.isArray(args.addAbilities) && args.addAbilities.length > 0) {
      commandArgs["add-ability"] = args.addAbilities.join(",");
    }
    if (
      Array.isArray(args.removeAbilities) && args.removeAbilities.length > 0
    ) {
      commandArgs["remove-ability"] = args.removeAbilities.join(",");
    }
    if (Array.isArray(args.addBeliefs) && args.addBeliefs.length > 0) {
      commandArgs["add-belief"] = args.addBeliefs.join(",");
    }
    if (Array.isArray(args.removeBeliefs) && args.removeBeliefs.length > 0) {
      commandArgs["remove-belief"] = args.removeBeliefs.join(",");
    }
    if (
      Array.isArray(args.addRelationships) && args.addRelationships.length > 0
    ) {
      // 配列形式: ["companion:ally", "mentor:respect"]
      commandArgs["add-relationship"] = args.addRelationships.join(",");
    }
    if (
      Array.isArray(args.removeRelationships) &&
      args.removeRelationships.length > 0
    ) {
      commandArgs["remove-relationship"] = args.removeRelationships.join(",");
    }
    if (typeof args.statusPhysical === "string") {
      commandArgs["status-physical"] = args.statusPhysical;
    }
    if (typeof args.statusMental === "string") {
      commandArgs["status-mental"] = args.statusMental;
    }
    if (typeof args.statusSocial === "string") {
      commandArgs["status-social"] = args.statusSocial;
    }
    if (Array.isArray(args.addGoals) && args.addGoals.length > 0) {
      commandArgs["add-goal"] = args.addGoals.join(",");
    }
    if (Array.isArray(args.removeGoals) && args.removeGoals.length > 0) {
      commandArgs["remove-goal"] = args.removeGoals.join(",");
    }

    const handler = new ElementPhaseCommand();
    return await executeCliCommand(handler, commandArgs, context?.projectRoot);
  },
};
