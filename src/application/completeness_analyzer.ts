/**
 * CompletenessAnalyzer
 *
 * キャラクター要素の詳細完成度を分析するエンジン
 */

import type {
  Character,
  CharacterDetails,
  CharacterDevelopment,
  CharacterRole,
} from "../type/v2/character.ts";

/**
 * 単一キャラクターの完成度分析結果
 */
export type CharacterCompletenessResult = {
  /** 対象のキャラクター */
  character: Character;
  /** 完成度（0～100%） */
  completenessRate: number;
  /** 必須フィールドの総数 */
  requiredFieldsCount: number;
  /** 必須フィールドの入力済み数 */
  filledRequiredFieldsCount: number;
  /** オプショナルフィールドの総数 */
  optionalFieldsCount: number;
  /** オプショナルフィールドの入力済み数 */
  filledOptionalFieldsCount: number;
  /** TODOマーカーを含むフィールドのパス */
  todoFields: string[];
  /** ファイル参照のパス */
  fileReferences: string[];
};

/**
 * 複数キャラクターの完成度分析結果
 */
export type MultipleCharactersCompletenessResult = {
  /** 総キャラクター数 */
  totalCount: number;
  /** 平均完成度 */
  averageCompleteness: number;
  /** 各キャラクターの結果 */
  characterResults: CharacterCompletenessResult[];
  /** TODO総数 */
  totalTodoCount: number;
};

/**
 * 分析オプション
 */
export type AnalysisOptions = {
  /** 役割フィルタ */
  roleFilter?: CharacterRole[];
  /** チャプターフィルタ */
  chapterFilter?: string[];
};

/**
 * CompletenessAnalyzer
 *
 * キャラクター要素の詳細完成度を分析する
 */
export class CompletenessAnalyzer {
  /**
   * 単一キャラクターの完成度を分析する
   *
   * @param character 対象のキャラクター
   * @returns 完成度分析結果
   */
  analyzeCharacter(character: Character): CharacterCompletenessResult {
    // 必須フィールド（Character型の必須プロパティ）
    const requiredFields: (keyof Character)[] = [
      "id",
      "name",
      "role",
      "traits",
      "relationships",
      "appearingChapters",
      "summary",
    ];

    // オプショナルフィールド（details内のフィールド）
    const optionalFields: (keyof CharacterDetails)[] = [
      "appearance",
      "personality",
      "backstory",
      "relationships_detail",
      "goals",
      "development",
    ];

    const requiredFieldsCount = requiredFields.length;
    const filledRequiredFieldsCount = requiredFields.filter((field) => {
      const value = character[field];
      // 配列やオブジェクトでも存在していれば「入力済み」とみなす
      // （空配列でもtraitsフィールドは定義されている）
      if (value === undefined || value === null) {
        return false;
      }
      if (typeof value === "string" && value === "") {
        return false;
      }
      return true;
    }).length;

    const optionalFieldsCount = optionalFields.length;
    let filledOptionalFieldsCount = 0;
    const todoFields: string[] = [];
    const fileReferences: string[] = [];

    // 必須フィールドのTODOチェック
    for (const field of requiredFields) {
      const value = character[field];
      if (typeof value === "string" && this.containsTodoMarker(value)) {
        todoFields.push(field);
      }
    }

    // オプショナルフィールドの分析
    if (character.details) {
      for (const field of optionalFields) {
        const value = character.details[field as keyof CharacterDetails];
        if (value !== undefined && value !== null) {
          filledOptionalFieldsCount++;

          // TODOマーカーのチェック
          if (typeof value === "string") {
            if (this.containsTodoMarker(value)) {
              todoFields.push(`details.${field}`);
            }
          } else if (typeof value === "object" && "file" in value) {
            // ファイル参照
            fileReferences.push(value.file);
          } else if (field === "development") {
            // CharacterDevelopment のチェック
            const dev = value as CharacterDevelopment;
            this.checkDevelopmentTodos(dev, todoFields);
          }
        }
      }
    }

    // 完成度の計算
    // 必須フィールド: 50%の重み
    // オプショナルフィールド: 50%の重み
    const requiredScore = (filledRequiredFieldsCount / requiredFieldsCount) *
      50;
    const optionalScore = (filledOptionalFieldsCount / optionalFieldsCount) *
      50;
    const completenessRate = Math.round(requiredScore + optionalScore);

    return {
      character,
      completenessRate,
      requiredFieldsCount,
      filledRequiredFieldsCount,
      optionalFieldsCount,
      filledOptionalFieldsCount,
      todoFields,
      fileReferences,
    };
  }

  /**
   * 複数キャラクターの完成度を分析する
   *
   * @param characters キャラクターの配列
   * @param options 分析オプション
   * @returns 複数キャラクターの完成度分析結果
   */
  analyzeMultipleCharacters(
    characters: Character[],
    options?: AnalysisOptions,
  ): MultipleCharactersCompletenessResult {
    // フィルタリング
    let filteredCharacters = characters;

    if (options?.roleFilter && options.roleFilter.length > 0) {
      filteredCharacters = filteredCharacters.filter((c) =>
        options.roleFilter!.includes(c.role)
      );
    }

    if (options?.chapterFilter && options.chapterFilter.length > 0) {
      filteredCharacters = filteredCharacters.filter((c) =>
        c.appearingChapters.some((ch) => options.chapterFilter!.includes(ch))
      );
    }

    // 各キャラクターを分析
    const characterResults = filteredCharacters.map((c) =>
      this.analyzeCharacter(c)
    );

    // 集計
    const totalCount = characterResults.length;
    const averageCompleteness = totalCount > 0
      ? Math.round(
        characterResults.reduce((sum, r) => sum + r.completenessRate, 0) /
          totalCount,
      )
      : 0;
    const totalTodoCount = characterResults.reduce(
      (sum, r) => sum + r.todoFields.length,
      0,
    );

    return {
      totalCount,
      averageCompleteness,
      characterResults,
      totalTodoCount,
    };
  }

  /**
   * 完成度レポートをテキスト形式で生成する
   *
   * @param result 複数キャラクターの完成度分析結果
   * @returns テキスト形式のレポート
   */
  generateCompletenessReport(
    result: MultipleCharactersCompletenessResult,
  ): string {
    const lines: string[] = [];

    lines.push("=".repeat(60));
    lines.push("Completeness Report");
    lines.push("=".repeat(60));
    lines.push("");
    lines.push(`Total Characters: ${result.totalCount}`);
    lines.push(`Average Completeness: ${result.averageCompleteness}%`);
    lines.push(`Total TODOs: ${result.totalTodoCount}`);
    lines.push("");
    lines.push("-".repeat(60));
    lines.push("Character Details:");
    lines.push("-".repeat(60));

    for (const charResult of result.characterResults) {
      lines.push("");
      lines.push(
        `[${charResult.character.id}] ${charResult.character.name} (${charResult.character.role})`,
      );
      lines.push(`  Completeness: ${charResult.completenessRate}%`);
      lines.push(
        `  Required Fields: ${charResult.filledRequiredFieldsCount}/${charResult.requiredFieldsCount}`,
      );
      lines.push(
        `  Optional Fields: ${charResult.filledOptionalFieldsCount}/${charResult.optionalFieldsCount}`,
      );

      if (charResult.todoFields.length > 0) {
        lines.push(`  TODOs:`);
        for (const field of charResult.todoFields) {
          lines.push(`    - ${field}`);
        }
      }

      if (charResult.fileReferences.length > 0) {
        lines.push(`  File References:`);
        for (const ref of charResult.fileReferences) {
          lines.push(`    - ${ref}`);
        }
      }
    }

    lines.push("");
    lines.push("=".repeat(60));

    return lines.join("\n");
  }

  /**
   * TODOマーカーを含むかチェック
   *
   * @param value 文字列値
   * @returns TODOマーカーを含む場合true
   */
  private containsTodoMarker(value: string): boolean {
    return /TODO|FIXME|XXX/i.test(value);
  }

  /**
   * CharacterDevelopment のTODOをチェック
   *
   * @param dev CharacterDevelopment
   * @param todoFields TODOフィールドの配列（出力）
   */
  private checkDevelopmentTodos(
    dev: CharacterDevelopment,
    todoFields: string[],
  ): void {
    if (this.containsTodoMarker(dev.initial)) {
      todoFields.push("details.development.initial");
    }
    if (this.containsTodoMarker(dev.goal)) {
      todoFields.push("details.development.goal");
    }
    if (this.containsTodoMarker(dev.obstacle)) {
      todoFields.push("details.development.obstacle");
    }
    if (dev.resolution && this.containsTodoMarker(dev.resolution)) {
      todoFields.push("details.development.resolution");
    }
    if (dev.arc_notes) {
      if (
        typeof dev.arc_notes === "string" &&
        this.containsTodoMarker(dev.arc_notes)
      ) {
        todoFields.push("details.development.arc_notes");
      }
    }
  }
}
