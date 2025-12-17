/**
 * View Character Command
 *
 * storyteller view character コマンドの実装
 * キャラクター情報とフェーズ（成長段階）情報を表示する
 */

import { err, ok } from "../../../shared/result.ts";
import type { CommandContext, CommandDescriptor } from "../../types.ts";
import { BaseCliCommand } from "../../base_command.ts";
import { createLegacyCommandDescriptor } from "../../legacy_adapter.ts";
import type { Character } from "../../../type/v2/character.ts";
import type {
  CharacterStateSnapshot,
  PhaseDiffResult,
  PhaseTimelineEntry,
} from "../../../type/v2/character_state.ts";
import { CharacterPhaseResolver } from "../../../application/character_phase_resolver.ts";

/**
 * キャラクターローダーインターフェース
 */
export interface CharacterLoader {
  loadCharacter(id: string): Promise<Character>;
}

/**
 * デフォルトのキャラクターローダー
 * src/characters/ ディレクトリからキャラクターを読み込む
 */
export class DefaultCharacterLoader implements CharacterLoader {
  constructor(private readonly projectRoot: string) {}

  async loadCharacter(id: string): Promise<Character> {
    const filePath = `${this.projectRoot}/src/characters/${id}.ts`;
    try {
      const content = await Deno.readTextFile(filePath);
      const character = this.parseCharacterFromFile(content);
      if (!character) {
        throw new Error(`Failed to parse character from file: ${filePath}`);
      }
      return character;
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        throw new Error(`Character file not found: ${filePath}`);
      }
      throw error;
    }
  }

  private parseCharacterFromFile(content: string): Character | null {
    try {
      // TypeScriptファイルからCharacterオブジェクトを抽出
      const match = content.match(
        /export\s+const\s+\w+\s*:\s*Character\s*=\s*(\{[\s\S]*?\});?\s*$/,
      );
      if (!match) {
        return null;
      }

      // 注意: 本番環境ではより堅牢なパーサーを使用すべき
      // JSON.parseは関数や複雑な式を含むオブジェクトには対応できない
      return JSON.parse(match[1]) as Character;
    } catch {
      return null;
    }
  }
}

/**
 * view character コマンドの結果型
 */
export interface ViewCharacterResult {
  characterId?: string;
  phaseId?: string;
  snapshot?: CharacterStateSnapshot;
  timeline?: PhaseTimelineEntry[];
  diff?: PhaseDiffResult;
}

/**
 * ViewCharacterCommandクラス
 * キャラクター情報の表示コマンド
 */
export class ViewCharacterCommand extends BaseCliCommand {
  override readonly name = "view_character" as const;
  override readonly path = ["view", "character"] as const;

  private readonly resolver: CharacterPhaseResolver;
  private readonly loader?: CharacterLoader;

  constructor(loader?: CharacterLoader) {
    super([]);
    this.resolver = new CharacterPhaseResolver();
    this.loader = loader;
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};

    // プロジェクトルートを取得
    const config = await context.config.resolve();
    const projectRoot = (args.projectRoot as string) ||
      config.runtime.projectRoot || Deno.cwd();

    // キャラクターID
    const characterId = args.id as string | undefined;
    if (!characterId) {
      context.presenter.showInfo(this.renderHelp());
      return ok(undefined);
    }

    const jsonOutput = args.json === true;

    // キャラクターを読み込む
    let character: Character;
    try {
      const loader = this.loader ?? new DefaultCharacterLoader(projectRoot);
      character = await loader.loadCharacter(characterId);
    } catch (error) {
      return err({
        code: "character_not_found",
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const result: ViewCharacterResult = {
      characterId,
    };

    // --all-phases: 全フェーズタイムライン表示
    if (args["all-phases"] === true) {
      const timeline = this.resolver.getPhaseTimeline(character);
      result.timeline = timeline;

      if (jsonOutput) {
        context.presenter.showInfo(JSON.stringify({ timeline }, null, 2));
      } else {
        const output = this.formatTimeline(character, timeline);
        context.presenter.showInfo(output);
      }
      return ok(result);
    }

    // --diff: フェーズ間差分表示
    if (args.diff === true) {
      const fromPhaseId = args.from as string | null ?? null;
      const toPhaseId = args.to as string | undefined;

      if (!toPhaseId) {
        return err({
          code: "missing_to_phase",
          message: "The --to option is required when using --diff",
        });
      }

      if (!character.phases || character.phases.length === 0) {
        return err({
          code: "no_phases",
          message: `Character '${characterId}' has no phases defined`,
        });
      }

      try {
        const diff = this.resolver.comparePhaseDiff(
          character,
          fromPhaseId,
          toPhaseId,
        );
        result.diff = diff;

        if (jsonOutput) {
          context.presenter.showInfo(JSON.stringify({ diff }, null, 2));
        } else {
          const output = this.formatDiff(character, diff);
          context.presenter.showInfo(output);
        }
        return ok(result);
      } catch (error) {
        return err({
          code: "phase_not_found",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // --phase: 特定フェーズのスナップショット表示
    const phaseId = args.phase as string | undefined;
    if (phaseId !== undefined) {
      if (!character.phases || character.phases.length === 0) {
        return err({
          code: "no_phases",
          message: `Character '${characterId}' has no phases defined`,
        });
      }

      try {
        const snapshot = this.resolver.resolveAtPhase(character, phaseId);
        result.phaseId = phaseId;
        result.snapshot = snapshot;

        if (jsonOutput) {
          context.presenter.showInfo(JSON.stringify({ snapshot }, null, 2));
        } else {
          const output = this.formatSnapshot(character, snapshot);
          context.presenter.showInfo(output);
        }
        return ok(result);
      } catch (error) {
        return err({
          code: "phase_not_found",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // フェーズ指定なし: 基本キャラクター情報を表示
    if (jsonOutput) {
      context.presenter.showInfo(JSON.stringify({ character }, null, 2));
    } else {
      const output = this.formatCharacterBasic(character);
      context.presenter.showInfo(output);
    }

    return ok(result);
  }

  /**
   * 基本キャラクター情報をフォーマット
   */
  private formatCharacterBasic(character: Character): string {
    const lines: string[] = [
      `# ${character.name}`,
      "",
      `**ID:** ${character.id}`,
      `**Role:** ${character.role}`,
      `**Summary:** ${character.summary}`,
    ];

    if (character.traits.length > 0) {
      lines.push(`**Traits:** ${character.traits.join(", ")}`);
    }

    if (Object.keys(character.relationships).length > 0) {
      const rels = Object.entries(character.relationships)
        .map(([id, type]) => `${id}(${type})`)
        .join(", ");
      lines.push(`**Relationships:** ${rels}`);
    }

    if (character.displayNames && character.displayNames.length > 0) {
      lines.push(`**Display Names:** ${character.displayNames.join(", ")}`);
    }

    if (character.phases && character.phases.length > 0) {
      lines.push("");
      lines.push(`## Phases (${character.phases.length})`);
      for (const phase of character.phases) {
        const marker = phase.id === character.currentPhaseId
          ? " [current]"
          : "";
        lines.push(`- ${phase.order}. ${phase.name} (${phase.id})${marker}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * スナップショットをフォーマット
   */
  private formatSnapshot(
    character: Character,
    snapshot: CharacterStateSnapshot,
  ): string {
    const lines: string[] = [
      `# ${character.name} - ${snapshot.phaseName}`,
      "",
      `**Character ID:** ${snapshot.characterId}`,
      `**Phase ID:** ${snapshot.phaseId ?? "(initial state)"}`,
      `**Phase Name:** ${snapshot.phaseName}`,
      `**Summary:** ${snapshot.summary}`,
    ];

    if (snapshot.traits.length > 0) {
      lines.push("");
      lines.push("## Traits");
      for (const trait of snapshot.traits) {
        lines.push(`- ${trait}`);
      }
    }

    if (snapshot.beliefs.length > 0) {
      lines.push("");
      lines.push("## Beliefs");
      for (const belief of snapshot.beliefs) {
        lines.push(`- ${belief}`);
      }
    }

    if (snapshot.abilities.length > 0) {
      lines.push("");
      lines.push("## Abilities");
      for (const ability of snapshot.abilities) {
        lines.push(`- ${ability}`);
      }
    }

    if (Object.keys(snapshot.relationships).length > 0) {
      lines.push("");
      lines.push("## Relationships");
      for (const [id, type] of Object.entries(snapshot.relationships)) {
        lines.push(`- ${id}: ${type}`);
      }
    }

    if (snapshot.goals.length > 0) {
      lines.push("");
      lines.push("## Goals");
      for (const goal of snapshot.goals) {
        lines.push(`- ${goal}`);
      }
    }

    if (
      snapshot.status.physical || snapshot.status.mental ||
      snapshot.status.social
    ) {
      lines.push("");
      lines.push("## Status");
      if (snapshot.status.physical) {
        lines.push(`- Physical: ${snapshot.status.physical}`);
      }
      if (snapshot.status.mental) {
        lines.push(`- Mental: ${snapshot.status.mental}`);
      }
      if (snapshot.status.social) {
        lines.push(`- Social: ${snapshot.status.social}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * タイムラインをフォーマット
   */
  private formatTimeline(
    character: Character,
    timeline: PhaseTimelineEntry[],
  ): string {
    const lines: string[] = [
      `# ${character.name} - Phase Timeline`,
      "",
    ];

    for (const entry of timeline) {
      const current = entry.phaseId === character.currentPhaseId
        ? " [current]"
        : "";
      lines.push(`## ${entry.order}. ${entry.phaseName}${current}`);

      if (entry.phaseId) {
        lines.push(`- **Phase ID:** ${entry.phaseId}`);
      }
      lines.push(`- **Summary:** ${entry.summary}`);

      if (entry.transitionType) {
        lines.push(`- **Transition Type:** ${entry.transitionType}`);
      }
      if (entry.importance) {
        lines.push(`- **Importance:** ${entry.importance}`);
      }
      if (entry.startChapter) {
        lines.push(`- **Start Chapter:** ${entry.startChapter}`);
      }
      if (entry.triggerEventId) {
        lines.push(`- **Trigger Event:** ${entry.triggerEventId}`);
      }

      if (entry.keyChanges.length > 0) {
        lines.push("");
        lines.push("### Key Changes");
        for (const change of entry.keyChanges) {
          lines.push(`- ${change}`);
        }
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * 差分をフォーマット
   */
  private formatDiff(
    character: Character,
    diff: PhaseDiffResult,
  ): string {
    const lines: string[] = [
      `# ${character.name} - Phase Diff`,
      "",
      `**From:** ${diff.fromPhaseName} (${diff.fromPhaseId ?? "initial"})`,
      `**To:** ${diff.toPhaseName} (${diff.toPhaseId})`,
      "",
    ];

    // Traits
    if (
      diff.changes.traits.added.length > 0 ||
      diff.changes.traits.removed.length > 0
    ) {
      lines.push("## Traits");
      for (const trait of diff.changes.traits.added) {
        lines.push(`+ ${trait}`);
      }
      for (const trait of diff.changes.traits.removed) {
        lines.push(`- ${trait}`);
      }
      lines.push("");
    }

    // Beliefs
    if (
      diff.changes.beliefs.added.length > 0 ||
      diff.changes.beliefs.removed.length > 0
    ) {
      lines.push("## Beliefs");
      for (const belief of diff.changes.beliefs.added) {
        lines.push(`+ ${belief}`);
      }
      for (const belief of diff.changes.beliefs.removed) {
        lines.push(`- ${belief}`);
      }
      lines.push("");
    }

    // Abilities
    if (
      diff.changes.abilities.added.length > 0 ||
      diff.changes.abilities.removed.length > 0
    ) {
      lines.push("## Abilities");
      for (const ability of diff.changes.abilities.added) {
        lines.push(`+ ${ability}`);
      }
      for (const ability of diff.changes.abilities.removed) {
        lines.push(`- ${ability}`);
      }
      lines.push("");
    }

    // Relationships
    if (
      Object.keys(diff.changes.relationships.added).length > 0 ||
      diff.changes.relationships.removed.length > 0 ||
      Object.keys(diff.changes.relationships.changed).length > 0
    ) {
      lines.push("## Relationships");
      for (
        const [id, type] of Object.entries(diff.changes.relationships.added)
      ) {
        lines.push(`+ ${id}: ${type}`);
      }
      for (const id of diff.changes.relationships.removed) {
        lines.push(`- ${id}`);
      }
      for (
        const [id, change] of Object.entries(diff.changes.relationships.changed)
      ) {
        lines.push(`~ ${id}: ${change.from} -> ${change.to}`);
      }
      lines.push("");
    }

    // Goals
    if (
      diff.changes.goals.added.length > 0 ||
      diff.changes.goals.removed.length > 0
    ) {
      lines.push("## Goals");
      for (const goal of diff.changes.goals.added) {
        lines.push(`+ ${goal}`);
      }
      for (const goal of diff.changes.goals.removed) {
        lines.push(`- ${goal}`);
      }
      lines.push("");
    }

    // Status
    const statusChanges = diff.changes.status;
    if (
      statusChanges.physical || statusChanges.mental || statusChanges.social
    ) {
      lines.push("## Status");
      if (statusChanges.physical) {
        lines.push(
          `Physical: ${statusChanges.physical.from ?? "(none)"} -> ${
            statusChanges.physical.to ?? "(none)"
          }`,
        );
      }
      if (statusChanges.mental) {
        lines.push(
          `Mental: ${statusChanges.mental.from ?? "(none)"} -> ${
            statusChanges.mental.to ?? "(none)"
          }`,
        );
      }
      if (statusChanges.social) {
        lines.push(
          `Social: ${statusChanges.social.from ?? "(none)"} -> ${
            statusChanges.social.to ?? "(none)"
          }`,
        );
      }
      lines.push("");
    }

    // Summary
    if (diff.changes.summary) {
      lines.push("## Summary");
      lines.push(`From: ${diff.changes.summary.from}`);
      lines.push(`To: ${diff.changes.summary.to}`);
    }

    return lines.join("\n");
  }

  /**
   * ヘルプを生成
   */
  private renderHelp(): string {
    const lines: string[] = [];
    lines.push(
      "view character - Display character information with phase support",
    );
    lines.push("");
    lines.push("Usage:");
    lines.push(
      "  storyteller view character --id <id>                      # Basic character info",
    );
    lines.push(
      "  storyteller view character --id <id> --phase <phase-id>   # Phase snapshot",
    );
    lines.push(
      "  storyteller view character --id <id> --all-phases         # Phase timeline",
    );
    lines.push(
      "  storyteller view character --id <id> --diff --to <phase>  # Phase diff",
    );
    lines.push(
      "  storyteller view character --id <id> --diff --from <phase> --to <phase>",
    );
    lines.push("");
    lines.push("Options:");
    lines.push("  --id <id>           Character ID to display (required)");
    lines.push("  --phase <phase-id>  Show snapshot at specific phase");
    lines.push("  --all-phases        Show timeline of all phases");
    lines.push("  --diff              Show diff between phases");
    lines.push(
      "  --from <phase-id>   Starting phase for diff (default: initial state)",
    );
    lines.push(
      "  --to <phase-id>     Ending phase for diff (required with --diff)",
    );
    lines.push("  --json              Output in JSON format");
    return lines.join("\n");
  }
}

/**
 * view character コマンドのハンドラー
 */
export const viewCharacterHandler = new ViewCharacterCommand();

/**
 * view character コマンドの Descriptor
 */
export const viewCharacterCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(viewCharacterHandler, {
    summary: "Display character information with phase (growth) support.",
    usage:
      "storyteller view character --id <id> [--phase <phase-id>] [--all-phases] [--diff ...]",
    path: ["view", "character"],
    options: [
      {
        name: "--id",
        summary: "Character ID to display (required)",
        type: "string",
        required: true,
      },
      {
        name: "--phase",
        summary: "Show snapshot at specific phase",
        type: "string",
      },
      {
        name: "--all-phases",
        summary: "Show timeline of all phases",
        type: "boolean",
      },
      {
        name: "--diff",
        summary: "Show diff between phases",
        type: "boolean",
      },
      {
        name: "--from",
        summary: "Starting phase for diff (default: initial state)",
        type: "string",
      },
      {
        name: "--to",
        summary: "Ending phase for diff (required with --diff)",
        type: "string",
      },
      {
        name: "--json",
        summary: "Output in JSON format",
        type: "boolean",
      },
    ],
    examples: [
      {
        summary: "Show basic character info",
        command: 'storyteller view character --id "hero"',
      },
      {
        summary: "Show character at specific phase",
        command: 'storyteller view character --id "hero" --phase "awakening"',
      },
      {
        summary: "Show all phases timeline",
        command: 'storyteller view character --id "hero" --all-phases',
      },
      {
        summary: "Show diff from initial to awakening",
        command:
          'storyteller view character --id "hero" --diff --to "awakening"',
      },
    ],
  });
