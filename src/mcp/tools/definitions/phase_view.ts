/**
 * phase_viewツール定義
 * キャラクターの成長フェーズを表示するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import { CharacterPhaseResolver } from "../../../application/character_phase_resolver.ts";
import type { Character } from "../../../type/v2/character.ts";

export const phaseViewTool: McpToolDefinition = {
  name: "phase_view",
  description:
    "キャラクターの成長フェーズを表示します。特定のフェーズの状態スナップショット、タイムライン、またはフェーズ間の差分を確認できます。",
  inputSchema: {
    type: "object",
    properties: {
      character: {
        type: "string",
        description: "対象キャラクターのID（必須）",
      },
      phaseId: {
        type: "string",
        description: "表示するフェーズID（省略時は全フェーズ一覧）",
      },
      format: {
        type: "string",
        enum: ["snapshot", "timeline", "diff", "list"],
        description:
          "出力形式: snapshot（状態スナップショット）, timeline（フェーズタイムライン）, diff（差分）, list（一覧）",
      },
      compareFrom: {
        type: "string",
        description:
          "差分比較の開始フェーズID（format=diff時に使用、省略時は初期状態）",
      },
    },
    required: ["character"],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const character = args.character as string | undefined;

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

    try {
      // プロジェクトルートからキャラクターファイルを読み込み
      const projectRoot = context?.projectRoot || Deno.cwd();
      const characterFilePath = `${projectRoot}/src/characters/${character}.ts`;

      let characterContent: string;
      try {
        characterContent = await Deno.readTextFile(characterFilePath);
      } catch {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Character file not found: ${characterFilePath}`,
            },
          ],
          isError: true,
        };
      }

      // TypeScriptファイルからキャラクターオブジェクトを抽出
      // 簡易実装: exportされたオブジェクトを解析（実際のプロジェクトではより堅牢な方法が必要）
      const characterData = await loadCharacterFromFile(characterFilePath);
      if (!characterData) {
        return {
          content: [
            {
              type: "text" as const,
              text:
                `Error: Could not parse character data from: ${characterFilePath}`,
            },
          ],
          isError: true,
        };
      }

      const resolver = new CharacterPhaseResolver();
      const format = (args.format as string) || "list";
      const phaseId = args.phaseId as string | undefined;
      const compareFrom = args.compareFrom as string | null | undefined;

      let result: string;

      switch (format) {
        case "snapshot": {
          if (phaseId) {
            const snapshot = resolver.resolveAtPhase(characterData, phaseId);
            result = formatSnapshot(snapshot);
          } else {
            const snapshot = resolver.resolveCurrentPhase(characterData);
            result = formatSnapshot(snapshot);
          }
          break;
        }

        case "timeline": {
          const timeline = resolver.getPhaseTimeline(characterData);
          result = formatTimeline(timeline);
          break;
        }

        case "diff": {
          if (!phaseId) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: 'phaseId' is required for diff format.",
                },
              ],
              isError: true,
            };
          }
          const diff = resolver.comparePhaseDiff(
            characterData,
            compareFrom ?? null,
            phaseId,
          );
          result = formatDiff(diff);
          break;
        }

        case "list":
        default: {
          const snapshots = resolver.resolveAllPhases(characterData);
          result = formatList(snapshots, characterData);
          break;
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: result,
          },
        ],
        isError: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  },
};

/**
 * TypeScriptファイルからキャラクターデータを読み込む
 * 簡易実装: 動的importを使用
 */
async function loadCharacterFromFile(
  filePath: string,
): Promise<Character | null> {
  try {
    // 動的importでモジュールを読み込み
    const module = await import(filePath);

    // exportされているキャラクターオブジェクトを探す
    for (const [key, value] of Object.entries(module)) {
      if (
        value &&
        typeof value === "object" &&
        "id" in value &&
        "name" in value &&
        "role" in value
      ) {
        return value as Character;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * スナップショットをフォーマット
 */
function formatSnapshot(snapshot: {
  characterId: string;
  phaseId: string | null;
  phaseName: string;
  traits: string[];
  beliefs: string[];
  abilities: string[];
  relationships: Record<string, string>;
  appearance: string[];
  status: Record<string, string | undefined>;
  goals: string[];
  summary: string;
}): string {
  const lines: string[] = [
    `# ${snapshot.phaseName} (${snapshot.phaseId ?? "initial"})`,
    "",
    `## キャラクター: ${snapshot.characterId}`,
    "",
    `### 概要`,
    snapshot.summary,
    "",
    `### 特性`,
    snapshot.traits.length > 0
      ? snapshot.traits.map((t) => `- ${t}`).join("\n")
      : "- なし",
    "",
    `### 信条`,
    snapshot.beliefs.length > 0
      ? snapshot.beliefs.map((b) => `- ${b}`).join("\n")
      : "- なし",
    "",
    `### 能力`,
    snapshot.abilities.length > 0
      ? snapshot.abilities.map((a) => `- ${a}`).join("\n")
      : "- なし",
    "",
    `### 関係性`,
  ];

  if (Object.keys(snapshot.relationships).length > 0) {
    for (const [charId, relType] of Object.entries(snapshot.relationships)) {
      lines.push(`- ${charId}: ${relType}`);
    }
  } else {
    lines.push("- なし");
  }

  lines.push("", `### 目標`);
  lines.push(
    snapshot.goals.length > 0
      ? snapshot.goals.map((g) => `- ${g}`).join("\n")
      : "- なし",
  );

  if (
    snapshot.status &&
    Object.keys(snapshot.status).some((k) => snapshot.status[k])
  ) {
    lines.push("", `### 状態`);
    if (snapshot.status.physical) {
      lines.push(`- 身体: ${snapshot.status.physical}`);
    }
    if (snapshot.status.mental) lines.push(`- 精神: ${snapshot.status.mental}`);
    if (snapshot.status.social) lines.push(`- 社会: ${snapshot.status.social}`);
  }

  return lines.join("\n");
}

/**
 * タイムラインをフォーマット
 */
function formatTimeline(
  timeline: Array<{
    phaseId: string | null;
    phaseName: string;
    order: number;
    summary: string;
    transitionType?: string;
    importance?: string;
    keyChanges: string[];
  }>,
): string {
  const lines: string[] = ["# フェーズタイムライン", ""];

  for (const entry of timeline) {
    const phaseLabel = entry.phaseId ? `[${entry.phaseId}]` : "[初期状態]";
    lines.push(`## ${entry.order}. ${entry.phaseName} ${phaseLabel}`);

    if (entry.transitionType) {
      lines.push(`- 遷移タイプ: ${entry.transitionType}`);
    }
    if (entry.importance) {
      lines.push(`- 重要度: ${entry.importance}`);
    }

    lines.push(`- 概要: ${entry.summary}`);

    if (entry.keyChanges.length > 0) {
      lines.push("- 主な変化:");
      for (const change of entry.keyChanges) {
        lines.push(`  - ${change}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}

/**
 * 差分をフォーマット
 */
function formatDiff(diff: {
  fromPhaseId: string | null;
  toPhaseId: string;
  fromPhaseName: string;
  toPhaseName: string;
  changes: {
    traits: { added: string[]; removed: string[] };
    beliefs: { added: string[]; removed: string[] };
    abilities: { added: string[]; removed: string[] };
    relationships: {
      added: Record<string, string>;
      removed: string[];
      changed: Record<string, { from: string; to: string }>;
    };
    goals: { added: string[]; removed: string[] };
  };
}): string {
  const lines: string[] = [
    `# フェーズ差分`,
    "",
    `${diff.fromPhaseName} → ${diff.toPhaseName}`,
    "",
  ];

  // 特性
  if (
    diff.changes.traits.added.length > 0 ||
    diff.changes.traits.removed.length > 0
  ) {
    lines.push("## 特性");
    for (const t of diff.changes.traits.added) {
      lines.push(`+ ${t}`);
    }
    for (const t of diff.changes.traits.removed) {
      lines.push(`- ${t}`);
    }
    lines.push("");
  }

  // 能力
  if (
    diff.changes.abilities.added.length > 0 ||
    diff.changes.abilities.removed.length > 0
  ) {
    lines.push("## 能力");
    for (const a of diff.changes.abilities.added) {
      lines.push(`+ ${a}`);
    }
    for (const a of diff.changes.abilities.removed) {
      lines.push(`- ${a}`);
    }
    lines.push("");
  }

  // 信条
  if (
    diff.changes.beliefs.added.length > 0 ||
    diff.changes.beliefs.removed.length > 0
  ) {
    lines.push("## 信条");
    for (const b of diff.changes.beliefs.added) {
      lines.push(`+ ${b}`);
    }
    for (const b of diff.changes.beliefs.removed) {
      lines.push(`- ${b}`);
    }
    lines.push("");
  }

  // 関係性
  const hasRelChanges =
    Object.keys(diff.changes.relationships.added).length > 0 ||
    diff.changes.relationships.removed.length > 0 ||
    Object.keys(diff.changes.relationships.changed).length > 0;

  if (hasRelChanges) {
    lines.push("## 関係性");
    for (const [k, v] of Object.entries(diff.changes.relationships.added)) {
      lines.push(`+ ${k}: ${v}`);
    }
    for (const k of diff.changes.relationships.removed) {
      lines.push(`- ${k}`);
    }
    for (const [k, v] of Object.entries(diff.changes.relationships.changed)) {
      lines.push(`~ ${k}: ${v.from} → ${v.to}`);
    }
    lines.push("");
  }

  // 目標
  if (
    diff.changes.goals.added.length > 0 || diff.changes.goals.removed.length > 0
  ) {
    lines.push("## 目標");
    for (const g of diff.changes.goals.added) {
      lines.push(`+ ${g}`);
    }
    for (const g of diff.changes.goals.removed) {
      lines.push(`- ${g}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * フェーズ一覧をフォーマット
 */
function formatList(
  snapshots: Array<{
    phaseId: string | null;
    phaseName: string;
  }>,
  character: Character,
): string {
  const lines: string[] = [
    `# ${character.name} のフェーズ一覧`,
    "",
    `現在のフェーズ: ${character.currentPhaseId ?? "初期状態"}`,
    "",
  ];

  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    const isCurrent =
      (snapshot.phaseId === null && !character.currentPhaseId) ||
      snapshot.phaseId === character.currentPhaseId;
    const marker = isCurrent ? " ← 現在" : "";
    lines.push(`${i}. ${snapshot.phaseName}${marker}`);
  }

  return lines.join("\n");
}
