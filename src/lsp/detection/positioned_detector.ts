/**
 * 位置追跡付き検出エンジン
 * 既存のReferenceDetectorのロジックを拡張し、位置情報を追跡
 * @see src/application/meta/reference_detector.ts
 */

/**
 * LSP Position型
 * 0-based line and character
 */
export type Position = {
  readonly line: number;
  readonly character: number;
};

/**
 * 伏線のステータス型（foreshadowing用）
 */
export type ForeshadowingStatus =
  | "planted"
  | "partially_resolved"
  | "resolved"
  | "abandoned";

/**
 * 位置情報付きマッチ結果
 */
export type PositionedMatch = {
  readonly kind: "character" | "setting" | "foreshadowing";
  readonly id: string;
  readonly filePath: string;
  readonly matchedPattern: string;
  readonly positions: ReadonlyArray<{
    readonly line: number;
    readonly character: number;
    readonly length: number;
  }>;
  readonly confidence: number;
  /** 伏線の場合のみ: ステータス */
  readonly status?: ForeshadowingStatus;
};

/**
 * エンティティ情報（検出対象）
 */
export type DetectableEntity = {
  readonly kind: "character" | "setting" | "foreshadowing";
  readonly id: string;
  readonly name: string;
  readonly displayNames?: readonly string[];
  readonly aliases?: readonly string[];
  readonly filePath: string;
  /** 伏線の場合のみ: ステータス */
  readonly status?: ForeshadowingStatus;
};

/**
 * 位置追跡付き検出器
 */
export class PositionedDetector {
  private readonly entities: DetectableEntity[];
  private lastResults: PositionedMatch[] = [];
  private lastContent: string = "";

  constructor(entities: DetectableEntity[]) {
    this.entities = entities;
  }

  /**
   * コンテンツ内のエンティティ参照を位置情報付きで検出
   */
  detectWithPositions(content: string): PositionedMatch[] {
    this.lastContent = content;
    this.lastResults = [];

    // 既存のエンティティ名検出
    for (const entity of this.entities) {
      const matches = this.detectEntity(content, entity);
      if (matches.length > 0) {
        this.lastResults.push(...matches);
      }
    }

    // HTMLコメントアノテーション検出（新規）
    const annotationMatches = this.detectAnnotations(content);
    this.lastResults.push(...annotationMatches);

    // 同じエンティティIDを持つマッチをマージ
    this.lastResults = this.mergeMatchesByEntityId(this.lastResults);

    return this.lastResults;
  }

  /**
   * 指定位置にあるエンティティを取得
   */
  getEntityAtPosition(
    content: string,
    position: Position,
  ): PositionedMatch | undefined {
    // キャッシュされた結果がない、またはコンテンツが変わっていれば再検出
    if (this.lastContent !== content) {
      this.detectWithPositions(content);
    }

    for (const match of this.lastResults) {
      for (const pos of match.positions) {
        if (
          pos.line === position.line &&
          position.character >= pos.character &&
          position.character < pos.character + pos.length
        ) {
          return match;
        }
      }
    }

    return undefined;
  }

  /**
   * エンティティを検出
   */
  private detectEntity(
    content: string,
    entity: DetectableEntity,
  ): PositionedMatch[] {
    const results: PositionedMatch[] = [];
    const patterns = this.getPatternsWithConfidence(entity);

    for (const { pattern, confidence } of patterns) {
      const positions = this.findAllPositions(content, pattern);
      if (positions.length > 0) {
        results.push({
          kind: entity.kind,
          id: entity.id,
          filePath: entity.filePath,
          matchedPattern: pattern,
          positions,
          confidence,
          status: entity.status,
        });
      }
    }

    // 同じエンティティの複数パターンマッチをマージ
    return this.mergeMatches(results);
  }

  /**
   * エンティティからパターンと信頼度のペアを取得
   */
  private getPatternsWithConfidence(
    entity: DetectableEntity,
  ): Array<{ pattern: string; confidence: number }> {
    const patterns: Array<{ pattern: string; confidence: number }> = [];

    // @id: confidence 1.0 (明示的参照 - 最優先)
    if (entity.id) {
      patterns.push({ pattern: `@${entity.id}`, confidence: 1.0 });
    }

    // @name: confidence 1.0 (明示的参照)
    if (entity.name && entity.name !== entity.id) {
      patterns.push({ pattern: `@${entity.name}`, confidence: 1.0 });
    }

    // id: confidence 1.0 (Frontmatter内のID参照用)
    if (entity.id) {
      patterns.push({ pattern: entity.id, confidence: 1.0 });
    }

    // name: confidence 1.0
    if (entity.name && entity.name !== entity.id) {
      patterns.push({ pattern: entity.name, confidence: 1.0 });
    }

    // displayNames: confidence 0.9
    for (const displayName of entity.displayNames ?? []) {
      if (
        displayName && displayName !== entity.name && displayName !== entity.id
      ) {
        patterns.push({ pattern: displayName, confidence: 0.9 });
      }
    }

    // aliases: confidence 0.8
    for (const alias of entity.aliases ?? []) {
      if (alias) {
        patterns.push({ pattern: alias, confidence: 0.8 });
      }
    }

    return patterns;
  }

  /**
   * コンテンツ内のパターン位置を全て検出
   */
  private findAllPositions(
    content: string,
    pattern: string,
  ): Array<{ line: number; character: number; length: number }> {
    const positions: Array<
      { line: number; character: number; length: number }
    > = [];
    const lines = content.split("\n");

    let currentLine = 0;
    let lineStartOffset = 0;

    for (const line of lines) {
      let searchStart = 0;
      while (true) {
        const index = line.indexOf(pattern, searchStart);
        if (index === -1) break;

        positions.push({
          line: currentLine,
          character: index,
          length: pattern.length,
        });

        searchStart = index + pattern.length;
      }

      currentLine++;
      lineStartOffset += line.length + 1; // +1 for newline
    }

    return positions;
  }

  /**
   * 同じエンティティの複数パターンマッチをマージ
   */
  private mergeMatches(matches: PositionedMatch[]): PositionedMatch[] {
    if (matches.length <= 1) return matches;

    // 最も高い信頼度を持つマッチを基準に全ての位置をマージ
    const allPositions: Array<
      { line: number; character: number; length: number }
    > = [];
    let bestConfidence = 0;
    let matchedPattern = "";

    for (const match of matches) {
      if (match.confidence > bestConfidence) {
        bestConfidence = match.confidence;
        matchedPattern = match.matchedPattern;
      }
      allPositions.push(...match.positions);
    }

    // 重複位置を削除（同じ位置で異なるパターンがマッチする場合）
    const uniquePositions = this.deduplicatePositions(allPositions);

    return [
      {
        kind: matches[0].kind,
        id: matches[0].id,
        filePath: matches[0].filePath,
        matchedPattern,
        positions: uniquePositions,
        confidence: bestConfidence,
        status: matches[0].status,
      },
    ];
  }

  /**
   * 重複した位置を削除
   */
  private deduplicatePositions(
    positions: Array<{ line: number; character: number; length: number }>,
  ): Array<{ line: number; character: number; length: number }> {
    const seen = new Set<string>();
    const unique: Array<{ line: number; character: number; length: number }> =
      [];

    // 位置でソート
    positions.sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.character - b.character;
    });

    for (const pos of positions) {
      const key = `${pos.line}:${pos.character}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(pos);
      }
    }

    return unique;
  }

  /**
   * HTMLコメント形式のアノテーションを検出
   * 形式: <!-- @foreshadowing:ID --> または <!-- @fs:ID -->
   */
  private detectAnnotations(content: string): PositionedMatch[] {
    const matches: PositionedMatch[] = [];
    const lines = content.split("\n");

    // アノテーション内のIDを抽出するパターン
    const idPattern = /@(?:foreshadowing|fs):([^\s>@]+)/g;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      // HTMLコメントを検出
      const commentMatch = line.match(/<!--(.+?)-->/);
      if (!commentMatch) continue;

      const commentContent = commentMatch[1];
      const commentStart = line.indexOf("<!--");
      const commentEnd = line.indexOf("-->") + 3;
      const commentLength = commentEnd - commentStart;

      // コメント内のアノテーションIDを抽出
      idPattern.lastIndex = 0;
      let idMatch;
      while ((idMatch = idPattern.exec(commentContent)) !== null) {
        const annotationId = idMatch[1];

        // IDまたはnameでforeshadowingエンティティを検索
        const entity = this.entities.find(
          (e) =>
            e.kind === "foreshadowing" &&
            (e.id === annotationId || e.name === annotationId),
        );

        if (entity) {
          matches.push({
            kind: "foreshadowing",
            id: entity.id,
            filePath: entity.filePath,
            matchedPattern: `@foreshadowing:${annotationId}`,
            positions: [
              {
                line: lineIndex,
                character: commentStart,
                length: commentLength,
              },
            ],
            confidence: 1.0, // 明示的アノテーションは最高信頼度
            status: entity.status,
          });
        }
      }
    }

    return matches;
  }

  /**
   * 同じエンティティIDを持つ複数のマッチをマージ
   * アノテーション検出とdisplayNames検出が重複した場合に統合
   */
  private mergeMatchesByEntityId(
    matches: PositionedMatch[],
  ): PositionedMatch[] {
    const mergedMap = new Map<string, PositionedMatch>();

    for (const match of matches) {
      const key = `${match.kind}:${match.id}`;
      const existing = mergedMap.get(key);

      if (existing) {
        // 既存のマッチとマージ
        const allPositions = [...existing.positions, ...match.positions];
        const uniquePositions = this.deduplicatePositions([...allPositions]);

        // より高い信頼度を採用
        const betterConfidence = Math.max(
          existing.confidence,
          match.confidence,
        );

        mergedMap.set(key, {
          ...existing,
          positions: uniquePositions,
          confidence: betterConfidence,
          matchedPattern: match.confidence >= existing.confidence
            ? match.matchedPattern
            : existing.matchedPattern,
        });
      } else {
        mergedMap.set(key, match);
      }
    }

    return Array.from(mergedMap.values());
  }
}
