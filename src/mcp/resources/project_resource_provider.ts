/**
 * ProjectResourceProvider
 * プロジェクト構造をMCP Resourcesとして公開する
 */

import type { McpResource } from "../protocol/types.ts";
import type { ResourceProvider } from "./resource_provider.ts";
import { parseResourceUri } from "./uri_parser.ts";
import {
  type ProjectAnalysis,
  ProjectAnalyzer,
} from "../../application/view/project_analyzer.ts";
import { CharacterPhaseResolver } from "../../application/character_phase_resolver.ts";
import type { CharacterSummary } from "../../application/view/project_analyzer.ts";

export class ProjectResourceProvider implements ResourceProvider {
  private cachedAnalysis?: {
    readonly at: number;
    readonly value: ProjectAnalysis;
  };
  private readonly cacheTtlMs = 3_000;
  private readonly phaseResolver: CharacterPhaseResolver;

  constructor(
    private readonly projectPath: string,
    private readonly analyzer: ProjectAnalyzer = new ProjectAnalyzer(),
  ) {
    this.phaseResolver = new CharacterPhaseResolver();
  }

  private async getAnalysis(): Promise<ProjectAnalysis> {
    const now = Date.now();
    const cached = this.cachedAnalysis;
    if (cached && now - cached.at < this.cacheTtlMs) {
      return cached.value;
    }

    const analysis = await this.analyzer.analyzeProject(this.projectPath);
    if (!analysis.ok) {
      throw new Error(analysis.error.message);
    }

    this.cachedAnalysis = { at: now, value: analysis.value };
    return analysis.value;
  }

  async listResources(): Promise<McpResource[]> {
    const analysis = await this.getAnalysis();

    const resources: McpResource[] = [
      {
        uri: "storyteller://project",
        name: "Project",
        mimeType: "application/json",
        description:
          "プロジェクト全体の解析結果（characters/settings/timelines/manuscripts）",
      },
      {
        uri: "storyteller://project/structure",
        name: "Project Structure",
        mimeType: "application/json",
        description: "プロジェクト全体構造（互換エイリアス）",
      },
      {
        uri: "storyteller://characters",
        name: "Characters",
        mimeType: "application/json",
        description: "キャラクター一覧",
      },
      {
        uri: "storyteller://settings",
        name: "Settings",
        mimeType: "application/json",
        description: "設定一覧",
      },
      {
        uri: "storyteller://timelines",
        name: "Timelines",
        mimeType: "application/json",
        description: "タイムライン一覧",
      },
      {
        uri: "storyteller://foreshadowings",
        name: "Foreshadowings",
        mimeType: "application/json",
        description: "伏線一覧",
      },
    ];

    for (const character of analysis.characters) {
      resources.push({
        uri: `storyteller://character/${encodeURIComponent(character.id)}`,
        name: `Character: ${character.id}`,
        mimeType: "application/json",
        description: character.summary ?? character.name,
      });

      // フェーズがあるキャラクターには追加リソースを提供
      if (character.phases && character.phases.length > 0) {
        // フェーズ一覧リソース
        resources.push({
          uri: `storyteller://character/${
            encodeURIComponent(character.id)
          }/phases`,
          name: `Character Phases: ${character.id}`,
          mimeType: "application/json",
          description:
            `${character.name}の成長フェーズ一覧（${character.phases.length}フェーズ）`,
        });

        // 各フェーズのリソース
        for (const phase of character.phases) {
          resources.push({
            uri: `storyteller://character/${
              encodeURIComponent(character.id)
            }/phase/${encodeURIComponent(phase.id)}`,
            name: `Phase: ${character.id}/${phase.id}`,
            mimeType: "application/json",
            description: `${phase.name}: ${phase.summary}`,
          });

          // スナップショットリソース
          resources.push({
            uri: `storyteller://character/${
              encodeURIComponent(character.id)
            }/snapshot/${encodeURIComponent(phase.id)}`,
            name: `Snapshot: ${character.id}@${phase.id}`,
            mimeType: "application/json",
            description:
              `${character.name}の${phase.name}時点のスナップショット`,
          });
        }
      }
    }

    for (const setting of analysis.settings) {
      resources.push({
        uri: `storyteller://setting/${encodeURIComponent(setting.id)}`,
        name: `Setting: ${setting.id}`,
        mimeType: "application/json",
        description: setting.summary ?? setting.name,
      });
    }

    for (const timeline of analysis.timelines) {
      resources.push({
        uri: `storyteller://timeline/${encodeURIComponent(timeline.id)}`,
        name: `Timeline: ${timeline.id}`,
        mimeType: "application/json",
        description: timeline.summary ?? timeline.name,
      });
    }

    for (const foreshadowing of analysis.foreshadowings) {
      resources.push({
        uri: `storyteller://foreshadowing/${
          encodeURIComponent(foreshadowing.id)
        }`,
        name: `Foreshadowing: ${foreshadowing.id}`,
        mimeType: "application/json",
        description: foreshadowing.summary ?? foreshadowing.name,
      });
    }

    return resources;
  }

  async readResource(uri: string): Promise<string> {
    const parsed = parseResourceUri(uri);

    const analysis = await this.getAnalysis();

    switch (parsed.type) {
      case "project":
        if (parsed.id && parsed.id !== "structure") {
          throw new Error(`Unsupported project resource id: ${parsed.id}`);
        }
        return JSON.stringify(analysis);
      case "characters":
        return JSON.stringify(analysis.characters);
      case "settings":
        return JSON.stringify(analysis.settings);
      case "character": {
        if (!parsed.id) {
          throw new Error("Missing character id");
        }
        const found = analysis.characters.find((c) => c.id === parsed.id);
        if (!found) {
          throw new Error(`Character not found: ${parsed.id}`);
        }

        // サブリソースの処理
        if (parsed.subResource) {
          return this.handleCharacterSubResource(
            found,
            parsed.subResource,
            parsed.subId,
          );
        }

        return JSON.stringify(found);
      }
      case "setting": {
        if (!parsed.id) {
          throw new Error("Missing setting id");
        }
        const found = analysis.settings.find((s) => s.id === parsed.id);
        if (!found) {
          throw new Error(`Setting not found: ${parsed.id}`);
        }
        return JSON.stringify(found);
      }
      case "timelines":
        return JSON.stringify(analysis.timelines);
      case "timeline": {
        if (!parsed.id) {
          throw new Error("Missing timeline id");
        }
        const found = analysis.timelines.find((t) => t.id === parsed.id);
        if (!found) {
          throw new Error(`Timeline not found: ${parsed.id}`);
        }
        return JSON.stringify(found);
      }
      case "foreshadowings":
        return JSON.stringify(analysis.foreshadowings);
      case "foreshadowing": {
        if (!parsed.id) {
          throw new Error("Missing foreshadowing id");
        }
        const found = analysis.foreshadowings.find((f) => f.id === parsed.id);
        if (!found) {
          throw new Error(`Foreshadowing not found: ${parsed.id}`);
        }
        return JSON.stringify(found);
      }
      default:
        throw new Error(`Unsupported resource type: ${parsed.type}`);
    }
  }

  /**
   * キャラクターのサブリソースを処理
   */
  private handleCharacterSubResource(
    character: CharacterSummary,
    subResource: string,
    subId?: string,
  ): string {
    switch (subResource) {
      case "phases": {
        // フェーズ一覧
        if (!character.phases || character.phases.length === 0) {
          return JSON.stringify({
            characterId: character.id,
            phases: [],
            timeline: [],
          });
        }
        // CharacterSummaryをCharacter互換オブジェクトに変換
        const characterForResolver = this.toCharacterForResolver(character);
        const timeline = this.phaseResolver.getPhaseTimeline(
          characterForResolver,
        );
        return JSON.stringify({
          characterId: character.id,
          phases: character.phases,
          timeline,
        });
      }

      case "phase": {
        // 特定フェーズ
        if (!subId) {
          throw new Error("Missing phase id");
        }
        if (!character.phases || character.phases.length === 0) {
          throw new Error(`Character '${character.id}' has no phases`);
        }
        const phase = character.phases.find((p) => p.id === subId);
        if (!phase) {
          throw new Error(`Phase not found: ${subId}`);
        }
        return JSON.stringify({
          characterId: character.id,
          characterName: character.name,
          phase,
        });
      }

      case "snapshot": {
        // 特定フェーズ時点のスナップショット
        if (!subId) {
          throw new Error("Missing phase id");
        }
        if (!character.phases || character.phases.length === 0) {
          throw new Error(`Character '${character.id}' has no phases`);
        }
        // CharacterSummaryをCharacter互換オブジェクトに変換
        const characterForResolver = this.toCharacterForResolver(character);
        const snapshot = this.phaseResolver.resolveAtPhase(
          characterForResolver,
          subId,
        );
        return JSON.stringify(snapshot);
      }

      default:
        throw new Error(`Unsupported character sub-resource: ${subResource}`);
    }
  }

  /**
   * CharacterSummaryをCharacterPhaseResolver互換のオブジェクトに変換
   */
  private toCharacterForResolver(
    summary: CharacterSummary,
  ): import("../../type/v2/character.ts").Character {
    return {
      id: summary.id,
      name: summary.name,
      role: (summary.role ??
        "supporting") as import("../../type/v2/character.ts").CharacterRole,
      traits: [...(summary.traits ?? [])],
      relationships: { ...(summary.relationships ?? {}) },
      appearingChapters: [],
      summary: summary.summary ?? "",
      displayNames: [...summary.displayNames],
      phases: summary.phases ? [...summary.phases] : undefined,
      initialState: summary.initialState,
      currentPhaseId: summary.currentPhaseId,
    };
  }
}
