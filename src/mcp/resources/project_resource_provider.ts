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

export class ProjectResourceProvider implements ResourceProvider {
  private cachedAnalysis?: {
    readonly at: number;
    readonly value: ProjectAnalysis;
  };
  private readonly cacheTtlMs = 3_000;

  constructor(
    private readonly projectPath: string,
    private readonly analyzer: ProjectAnalyzer = new ProjectAnalyzer(),
  ) {}

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
          "プロジェクト全体の解析結果（characters/settings/manuscripts）",
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
    ];

    for (const character of analysis.characters) {
      resources.push({
        uri: `storyteller://character/${encodeURIComponent(character.id)}`,
        name: `Character: ${character.id}`,
        mimeType: "application/json",
        description: character.summary ?? character.name,
      });
    }

    for (const setting of analysis.settings) {
      resources.push({
        uri: `storyteller://setting/${encodeURIComponent(setting.id)}`,
        name: `Setting: ${setting.id}`,
        mimeType: "application/json",
        description: setting.summary ?? setting.name,
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
      default:
        throw new Error(`Unsupported resource type: ${parsed.type}`);
    }
  }
}
