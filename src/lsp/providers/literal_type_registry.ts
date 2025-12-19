/**
 * リテラル型定義レジストリ
 * storytellerで使用するリテラル型（Union型）の定義を一元管理
 */

/**
 * フィールドパターン
 * どのフィールド名・親型でこのリテラル型が使われるかを定義
 */
export type FieldPattern = {
  /** フィールド名（例: "type", "status", "role"） */
  readonly fieldName: string;
  /** 親型（例: ["Foreshadowing", "Setting"]） */
  readonly parentTypes: readonly string[];
  /** オブジェクトパス（例: "relationships" - relationships.*のマッチ用） */
  readonly objectPath?: string;
};

/**
 * リテラル型定義
 */
export type LiteralTypeDefinition = {
  /** 型名（例: "ForeshadowingType"） */
  readonly typeName: string;
  /** 値リスト */
  readonly values: readonly string[];
  /** フィールドパターン */
  readonly fieldPatterns: readonly FieldPattern[];
  /** 値ごとのドキュメント */
  readonly documentation?: Record<string, string>;
};

/**
 * フィールドコンテキスト
 * カーソル位置のフィールド情報
 */
export type FieldContext = {
  /** フィールド名 */
  readonly fieldName: string;
  /** 推定される親型 */
  readonly parentType: string | null;
  /** オブジェクトパス（ネスト構造） */
  readonly objectPath: readonly string[];
  /** 文字列リテラル内かどうか */
  readonly inStringLiteral: boolean;
  /** 文字列の開始位置 */
  readonly stringStart: number;
  /** 文字列の終了位置（-1は未閉じ） */
  readonly stringEnd: number;
};

/**
 * リテラル型定義のリスト
 */
const LITERAL_TYPE_DEFINITIONS: LiteralTypeDefinition[] = [
  // ForeshadowingType
  {
    typeName: "ForeshadowingType",
    values: ["hint", "prophecy", "mystery", "symbol", "chekhov", "red_herring"],
    fieldPatterns: [
      { fieldName: "type", parentTypes: ["Foreshadowing"] },
    ],
    documentation: {
      hint: "後の展開を示唆するヒント",
      prophecy: "予言・予告",
      mystery: "謎・疑問",
      symbol: "象徴的な要素",
      chekhov: "チェーホフの銃（物理的伏線）",
      red_herring: "レッドヘリング（ミスリード）",
    },
  },
  // ForeshadowingStatus
  {
    typeName: "ForeshadowingStatus",
    values: ["planted", "partially_resolved", "resolved", "abandoned"],
    fieldPatterns: [
      { fieldName: "status", parentTypes: ["Foreshadowing"] },
    ],
    documentation: {
      planted: "設置済み（未回収）",
      partially_resolved: "部分的に回収",
      resolved: "完全に回収済み",
      abandoned: "放棄（回収しない）",
    },
  },
  // ForeshadowingImportance
  {
    typeName: "ForeshadowingImportance",
    values: ["major", "minor", "subtle"],
    fieldPatterns: [
      { fieldName: "importance", parentTypes: ["Foreshadowing"] },
    ],
    documentation: {
      major: "主要な伏線（物語の根幹）",
      minor: "副次的な伏線",
      subtle: "微細な伏線（気づく人だけ）",
    },
  },
  // EventCategory
  {
    typeName: "EventCategory",
    values: [
      "plot_point",
      "character_event",
      "world_event",
      "backstory",
      "foreshadow",
      "climax",
      "resolution",
    ],
    fieldPatterns: [
      { fieldName: "category", parentTypes: ["TimelineEvent"] },
    ],
    documentation: {
      plot_point: "プロットの転換点",
      character_event: "キャラクターに関するイベント",
      world_event: "世界に関するイベント",
      backstory: "過去の出来事",
      foreshadow: "伏線イベント",
      climax: "クライマックス",
      resolution: "解決・結末",
    },
  },
  // EventImportance
  {
    typeName: "EventImportance",
    values: ["major", "minor", "background"],
    fieldPatterns: [
      { fieldName: "importance", parentTypes: ["TimelineEvent"] },
    ],
    documentation: {
      major: "主要イベント",
      minor: "副次的イベント",
      background: "背景イベント",
    },
  },
  // TimelineScope
  {
    typeName: "TimelineScope",
    values: ["story", "world", "character", "arc"],
    fieldPatterns: [
      { fieldName: "scope", parentTypes: ["Timeline"] },
    ],
    documentation: {
      story: "物語全体のタイムライン",
      world: "世界のタイムライン",
      character: "キャラクター個別のタイムライン",
      arc: "アーク（章）のタイムライン",
    },
  },
  // CharacterRole
  {
    typeName: "CharacterRole",
    values: ["protagonist", "antagonist", "supporting", "guest"],
    fieldPatterns: [
      { fieldName: "role", parentTypes: ["Character"] },
    ],
    documentation: {
      protagonist: "主人公",
      antagonist: "敵対者",
      supporting: "サブキャラクター",
      guest: "ゲストキャラクター",
    },
  },
  // RelationType
  {
    typeName: "RelationType",
    values: [
      "ally",
      "enemy",
      "neutral",
      "romantic",
      "respect",
      "competitive",
      "mentor",
    ],
    fieldPatterns: [
      // relationships オブジェクト内の任意のキーに対応
      {
        fieldName: "*",
        parentTypes: ["Character"],
        objectPath: "relationships",
      },
    ],
    documentation: {
      ally: "味方・仲間",
      enemy: "敵対関係",
      neutral: "中立",
      romantic: "恋愛関係",
      respect: "尊敬・敬意",
      competitive: "競争・ライバル関係",
      mentor: "師弟関係（指導者）",
    },
  },
  // SettingType
  {
    typeName: "SettingType",
    values: ["location", "world", "culture", "organization"],
    fieldPatterns: [
      { fieldName: "type", parentTypes: ["Setting"] },
    ],
    documentation: {
      location: "場所・地点",
      world: "世界観",
      culture: "文化・風習",
      organization: "組織・団体",
    },
  },
  // TransitionType
  {
    typeName: "TransitionType",
    values: [
      "gradual",
      "turning_point",
      "revelation",
      "regression",
      "transformation",
    ],
    fieldPatterns: [
      { fieldName: "transitionType", parentTypes: ["CharacterPhase"] },
    ],
    documentation: {
      gradual: "段階的変化",
      turning_point: "転換点",
      revelation: "啓示・発見",
      regression: "後退・退行",
      transformation: "変容・変身",
    },
  },
];

/**
 * リテラル型レジストリクラス
 */
export class LiteralTypeRegistry {
  private readonly definitions: readonly LiteralTypeDefinition[];

  constructor() {
    this.definitions = LITERAL_TYPE_DEFINITIONS;
  }

  /**
   * 全定義を取得
   */
  getDefinitions(): readonly LiteralTypeDefinition[] {
    return this.definitions;
  }

  /**
   * フィールドコンテキストからマッチするリテラル型定義を検索
   * @param context フィールドコンテキスト
   * @returns マッチする定義、見つからない場合はnull
   */
  findByFieldContext(context: FieldContext): LiteralTypeDefinition | null {
    // 文字列リテラル外なら補完しない
    if (!context.inStringLiteral) {
      return null;
    }

    for (const def of this.definitions) {
      for (const pattern of def.fieldPatterns) {
        // フィールド名のマッチ
        const fieldMatches = pattern.fieldName === context.fieldName ||
          pattern.fieldName === "*";

        if (!fieldMatches) continue;

        // 親型のマッチ
        // 親型がnullの場合、複数の親型を持つフィールドはマッチしない（曖昧性を避ける）
        if (context.parentType === null) {
          // 単一の親型を持つフィールドのみマッチを許可
          // ただし、複数の親型がある場合は曖昧なのでマッチしない
          // 現在の定義では各パターンは単一の親型セットを持つため、
          // 同じフィールド名で異なる親型を持つパターンがあるかチェック
          const sameFieldPatterns = this.definitions.flatMap((d) =>
            d.fieldPatterns.filter((p) => p.fieldName === pattern.fieldName)
          );
          if (sameFieldPatterns.length > 1) {
            // 同じフィールド名が複数の定義で使われている場合は曖昧
            continue;
          }
        } else {
          // 親型が指定されている場合は親型マッチが必要
          if (!pattern.parentTypes.includes(context.parentType)) {
            continue;
          }
        }

        // objectPathのマッチ
        if (pattern.objectPath) {
          // objectPathが指定されている場合、コンテキストのパスに含まれている必要がある
          if (!context.objectPath.includes(pattern.objectPath)) {
            continue;
          }
        }

        return def;
      }
    }

    return null;
  }
}
