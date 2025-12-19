/**
 * CharacterPlugin
 *
 * Character要素の作成、検証、スキーマエクスポートを担当するプラグイン
 */

import { err, ok } from "../../../shared/result.ts";
import type { Result } from "../../../shared/result.ts";
import type {
  CreateElementOptions,
  ElementCreationResult,
  ElementPlugin,
  PluginMetadata,
  TypeSchema,
  ValidationResult,
} from "../../../core/plugin_system.ts";
import type { Character } from "../../../type/v2/character.ts";
import { validateCharacter } from "./validator.ts";
import { join } from "@std/path";

export class CharacterPlugin implements ElementPlugin {
  readonly meta: PluginMetadata = {
    id: "storyteller.element.character",
    version: "1.0.0",
    name: "Character Element Plugin",
    description: "Manages Character element creation and validation",
  };

  readonly elementType = "character";

  /**
   * Character要素ファイルを作成する
   */
  async createElementFile(
    options: CreateElementOptions,
  ): Promise<Result<ElementCreationResult, Error>> {
    try {
      // optionsからCharacterオブジェクトを構築
      const character = options as Partial<Character>;

      // 必須フィールドの検証
      if (
        !character.id || !character.name || !character.role ||
        !character.summary
      ) {
        return err(
          new Error("Missing required fields: id, name, role, summary"),
        );
      }

      // デフォルト値の設定
      const fullCharacter: Character = {
        id: character.id,
        name: character.name,
        role: character.role,
        traits: character.traits ?? [],
        relationships: character.relationships ?? {},
        appearingChapters: character.appearingChapters ?? [],
        summary: character.summary,
        ...(character.displayNames && { displayNames: character.displayNames }),
        ...(character.aliases && { aliases: character.aliases }),
        ...(character.pronouns && { pronouns: character.pronouns }),
        ...(character.details && { details: character.details }),
        ...(character.detectionHints &&
          { detectionHints: character.detectionHints }),
      };

      // 検証
      const validationResult = validateCharacter(fullCharacter);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors?.map((e) =>
          e.message
        ).join(", ") ?? "";
        return err(new Error(`Validation failed: ${errorMessages}`));
      }

      // TypeScriptファイルの内容を生成
      const content = this.generateTypeScriptFile(fullCharacter);
      const filePath = `src/characters/${character.id}.ts`;

      return ok({
        filePath,
        content,
      });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Character要素を検証する
   */
  validateElement(element: unknown): ValidationResult {
    return validateCharacter(element);
  }

  /**
   * Character型のスキーマをエクスポートする
   */
  exportElementSchema(): TypeSchema {
    return {
      type: "character",
      properties: {
        id: { type: "string", description: "Unique identifier" },
        name: { type: "string", description: "Character name" },
        role: {
          type: "CharacterRole",
          description:
            "Character role (protagonist, antagonist, supporting, guest)",
        },
        traits: { type: "string[]", description: "Character traits" },
        relationships: {
          type: "Record<string, RelationType>",
          description: "Relationships with other characters",
        },
        appearingChapters: {
          type: "string[]",
          description: "Chapters where character appears",
        },
        summary: { type: "string", description: "Short summary" },
        displayNames: {
          type: "string[]",
          description: "Display name variations",
          optional: true,
        },
        aliases: {
          type: "string[]",
          description: "Aliases and nicknames",
          optional: true,
        },
        pronouns: {
          type: "string[]",
          description: "Pronouns for LSP",
          optional: true,
        },
        details: {
          type: "CharacterDetails",
          description: "Detailed information",
          optional: true,
        },
        detectionHints: {
          type: "DetectionHints",
          description: "LSP detection hints",
          optional: true,
        },
      },
      required: [
        "id",
        "name",
        "role",
        "traits",
        "relationships",
        "appearingChapters",
        "summary",
      ],
    };
  }

  /**
   * Character要素のファイルパスを取得する
   */
  getElementPath(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "characters", `${elementId}.ts`);
  }

  /**
   * Character詳細のディレクトリパスを取得する
   */
  getDetailsDir(elementId: string, projectRoot: string): string {
    return join(projectRoot, "src", "characters", elementId, "details");
  }

  /**
   * TypeScriptファイルを生成する
   * 全フィールドをコメント付きで出力し、ユーザーが設定可能な項目を把握できるようにする
   */
  private generateTypeScriptFile(character: Character): string {
    // 値をJSONリテラルに変換するヘルパー
    const toJson = (value: unknown): string => JSON.stringify(value, null, 2);
    const indent = (str: string, spaces: number): string =>
      str.split("\n").map((line, i) =>
        i === 0 ? line : " ".repeat(spaces) + line
      ).join("\n");

    // detailsのデフォルト値をマージ
    const details = {
      description: "",
      appearance: "",
      personality: "",
      backstory: "",
      relationships_detail: "",
      goals: "",
      ...character.details,
    };

    // detectionHintsのデフォルト値をマージ
    const detectionHints = {
      commonPatterns: [],
      excludePatterns: [],
      confidence: 1.0,
      ...character.detectionHints,
    };

    // initialStateのデフォルト値をマージ
    const initialState = {
      traits: [],
      beliefs: [],
      abilities: [],
      relationships: {},
      appearance: [],
      goals: [],
      ...character.initialState,
    };

    return `import type { Character } from "@storyteller/types/v2/character.ts";

/**
 * ${character.name}
 * ${character.summary}
 */
export const ${character.id}: Character = {
  // =============================================
  // 必須メタデータ
  // =============================================

  /** 一意なID（プログラム的な識別子） */
  id: ${toJson(character.id)},

  /** キャラクター名（物語内での名前） */
  name: ${toJson(character.name)},

  /** 役割: "protagonist" | "antagonist" | "supporting" | "guest" */
  role: ${toJson(character.role)},

  /** 特徴・属性のリスト */
  traits: ${indent(toJson(character.traits ?? []), 2)},

  /** 他キャラクターとの関係性マップ { characterId: RelationType } */
  // RelationType: "ally" | "enemy" | "neutral" | "romantic" | "respect" | "competitive" | "mentor"
  relationships: ${indent(toJson(character.relationships ?? {}), 2)},

  /** 登場するチャプターのIDリスト */
  appearingChapters: ${indent(toJson(character.appearingChapters ?? []), 2)},

  /** 短い概要（必須） */
  summary: ${toJson(character.summary)},

  // =============================================
  // 表示・検出設定（オプショナル）
  // =============================================

  /** 表示名のバリエーション（例: ["勇者", "若者"]） - 原稿での検出に使用 */
  displayNames: ${indent(toJson(character.displayNames ?? []), 2)},

  /** 別名・愛称 */
  aliases: ${indent(toJson(character.aliases ?? []), 2)},

  /** 人称代名詞（LSP用、例: ["彼", "彼女"]） */
  pronouns: ${indent(toJson(character.pronouns ?? []), 2)},

  // =============================================
  // 詳細情報（オプショナル）
  // =============================================

  /** 詳細情報 - 各フィールドは文字列 or { file: "path/to/file.md" } */
  details: {
    /** キャラクターの説明（summaryより詳細な紹介文） */
    description: ${toJson(details.description)},
    /** 外見描写 */
    appearance: ${toJson(details.appearance)},
    /** 性格 */
    personality: ${toJson(details.personality)},
    /** 背景ストーリー */
    backstory: ${toJson(details.backstory)},
    /** 関係性の詳細 */
    relationships_detail: ${toJson(details.relationships_detail)},
    /** 目標・動機の詳細 */
    goals: ${toJson(details.goals)},
    /** キャラクター発展（成長アーク） */
    // development: {
    //   initial: "",    // 初期状態
    //   goal: "",       // 目標
    //   obstacle: "",   // 障害
    //   resolution: "", // 解決
    //   arc_notes: "",  // 成長アークのメモ
    // },
  },

  // =============================================
  // LSP検出ヒント（オプショナル）
  // =============================================

  /** LSP用の検出ヒント - 原稿からキャラクターを自動検出する際の設定 */
  detectionHints: {
    /** よく使われるパターン（例: ["勇者は", "勇者が"]） */
    commonPatterns: ${indent(toJson(detectionHints.commonPatterns), 4)},
    /** 除外すべきパターン（例: ["伝説の勇者"]） */
    excludePatterns: ${indent(toJson(detectionHints.excludePatterns), 4)},
    /** 検出の信頼度（0.0～1.0） */
    confidence: ${toJson(detectionHints.confidence)},
  },

  // =============================================
  // キャラクター成長・変化（Phase機能）（オプショナル）
  // =============================================

  /** 初期状態（差分計算のベースライン） - Phase機能を使用する場合に設定 */
  initialState: {
    /** 初期特性 */
    traits: ${indent(toJson(initialState.traits), 4)},
    /** 初期信条 */
    beliefs: ${indent(toJson(initialState.beliefs), 4)},
    /** 初期能力 */
    abilities: ${indent(toJson(initialState.abilities), 4)},
    /** 初期関係性 */
    relationships: ${indent(toJson(initialState.relationships), 4)},
    /** 初期外見 */
    appearance: ${indent(toJson(initialState.appearance), 4)},
    /** 初期状態 { physical?, mental?, social? } */
    // status: {},
    /** 初期目標 */
    goals: ${indent(toJson(initialState.goals), 4)},
  },

  /** 成長フェーズのリスト - キャラクターの変化を段階的に定義 */
  // phases: [
  //   {
  //     id: "phase_01",
  //     name: "覚醒",
  //     order: 1,
  //     summary: "覚醒後の変化",
  //     delta: {
  //       traits: { add: ["勇敢"], remove: ["臆病"] },
  //       beliefs: { add: ["正義を信じる"] },
  //       abilities: { add: ["剣術"], improve: ["体力"] },
  //       relationships: { add: { mentor: "respect" } },
  //     },
  //     transitionType: "revelation",  // "gradual" | "turning_point" | "revelation" | "regression" | "transformation"
  //     importance: "major",           // "major" | "minor" | "subtle"
  //     triggerEventId: "",            // TimelineEventへの参照
  //     startChapter: "",
  //     endChapter: "",
  //   },
  // ],
  phases: ${indent(toJson(character.phases ?? []), 2)},

  /** 現在のフェーズID（執筆進行管理用） */
  currentPhaseId: ${toJson(character.currentPhaseId ?? "")},
};
`;
  }
}
