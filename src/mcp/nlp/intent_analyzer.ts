/**
 * Intent analyzer (MVP)
 * 自然言語入力から実行したいアクション（インテント）を抽出する
 */

export type Intent = {
  readonly action: string;
  readonly params: Record<string, unknown>;
  readonly confidence: number;
};

type Rule = {
  readonly action: string;
  readonly confidence: number;
  readonly pattern: RegExp;
  readonly params?: (
    input: string,
    match: RegExpExecArray,
  ) => Record<string, unknown>;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class IntentAnalyzer {
  private readonly rules: readonly Rule[] = [
    {
      action: "element_create",
      confidence: 0.9,
      pattern: /(キャラクター|登場人物).*(作(って|成)|追加)/,
      params: () => ({ type: "character" }),
    },
    {
      action: "meta_check",
      confidence: 0.85,
      pattern: /(メタデータ|frontmatter|フロントマター).*(チェック|検証|確認)/i,
    },
    {
      action: "lsp_validate",
      confidence: 0.8,
      pattern: /(原稿|文章).*(整合性|診断|チェック|確認)/,
    },
  ];

  analyze(input: string): Intent {
    const trimmed = input.trim();
    if (trimmed.length === 0) {
      return { action: "unknown", params: {}, confidence: 0.0 };
    }

    for (const rule of this.rules) {
      const match = rule.pattern.exec(trimmed);
      if (!match) continue;
      return {
        action: rule.action,
        params: rule.params ? rule.params(trimmed, match) : {},
        confidence: clamp01(rule.confidence),
      };
    }

    return { action: "unknown", params: {}, confidence: 0.0 };
  }
}
