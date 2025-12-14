/**
 * 日本語パターンマッチャー
 * 基本助詞を使用したパターン生成と信頼度計算
 */

/**
 * 基本助詞（8種類）
 * は: 主題/対比
 * が: 主格/対象
 * を: 目的格
 * に: 場所/時間/対象
 * の: 所有/修飾
 * と: 並列/相手
 * で: 場所/手段
 * へ: 方向
 */
export const BASIC_PARTICLES = ["は", "が", "を", "に", "の", "と", "で", "へ"] as const;

export type BasicParticle = (typeof BASIC_PARTICLES)[number];

/**
 * マッチ結果
 */
export type PatternMatch = {
  readonly position: number;
  readonly length: number;
};

/**
 * 信頼度付きマッチ結果
 */
export type PatternMatchWithConfidence = {
  readonly position: number;
  readonly length: number;
  readonly confidence: number;
};

/**
 * 助詞による信頼度の基準値
 */
const PARTICLE_CONFIDENCE: Record<BasicParticle, number> = {
  "は": 0.98, // 主題マーカー - 最も信頼度が高い
  "が": 0.95, // 主格 - 高信頼度
  "を": 0.90, // 目的格 - 中～高信頼度
  "に": 0.85, // 場所/対象 - 中信頼度
  "の": 0.85, // 所有格 - 中信頼度
  "と": 0.80, // 並列/相手 - 中信頼度
  "で": 0.80, // 場所/手段 - 中信頼度
  "へ": 0.75, // 方向 - やや低信頼度
};

/**
 * 日本語パターンマッチャー
 */
export class JapanesePatternMatcher {
  private excludePatterns: string[] = [];

  /**
   * 単語に助詞を付加したパターンを生成
   */
  expandWithParticles(word: string): string[] {
    const patterns = [word];

    for (const particle of BASIC_PARTICLES) {
      patterns.push(word + particle);
    }

    return patterns;
  }

  /**
   * コンテンツ内のパターンを全て検索
   */
  findMatches(content: string, word: string): PatternMatch[] {
    if (!content || !word) {
      return [];
    }

    const matches: PatternMatch[] = [];
    let searchStart = 0;

    while (true) {
      const index = content.indexOf(word, searchStart);
      if (index === -1) break;

      // 除外パターンのチェック
      if (!this.isExcluded(content, index, word)) {
        matches.push({
          position: index,
          length: word.length,
        });
      }

      searchStart = index + word.length;
    }

    return matches;
  }

  /**
   * 信頼度付きでパターンを検索
   */
  findMatchesWithConfidence(content: string, word: string): PatternMatchWithConfidence[] {
    const basicMatches = this.findMatches(content, word);

    return basicMatches.map((match) => ({
      ...match,
      confidence: this.calculateConfidence(content, word, match.position),
    }));
  }

  /**
   * 文脈に基づく信頼度を計算
   * @param content 全体のテキスト
   * @param word マッチした単語
   * @param position 単語の開始位置
   */
  calculateConfidence(content: string, word: string, position: number): number {
    const afterWord = content.substring(position + word.length);

    // 直後の文字を確認
    if (afterWord.length === 0) {
      return 0.7; // 文末
    }

    const nextChar = afterWord[0];

    // 助詞が続く場合
    for (const particle of BASIC_PARTICLES) {
      if (nextChar === particle) {
        return PARTICLE_CONFIDENCE[particle];
      }
    }

    // 助詞が続かない場合（連体修飾など）
    return 0.75;
  }

  /**
   * 除外パターンを追加
   */
  addExcludePattern(pattern: string): void {
    if (!this.excludePatterns.includes(pattern)) {
      this.excludePatterns.push(pattern);
    }
  }

  /**
   * 除外パターンをクリア
   */
  clearExcludePatterns(): void {
    this.excludePatterns = [];
  }

  /**
   * 指定位置のマッチが除外パターンに該当するかチェック
   */
  private isExcluded(content: string, position: number, word: string): boolean {
    for (const excludePattern of this.excludePatterns) {
      if (!excludePattern.includes(word)) continue;

      // 除外パターンがこの位置で始まるかチェック
      const wordIndexInExclude = excludePattern.indexOf(word);
      const excludeStartPos = position - wordIndexInExclude;

      if (excludeStartPos < 0) continue;

      const potentialExclude = content.substring(
        excludeStartPos,
        excludeStartPos + excludePattern.length
      );

      if (potentialExclude === excludePattern) {
        return true;
      }
    }

    return false;
  }
}
