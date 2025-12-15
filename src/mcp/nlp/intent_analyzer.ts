/**
 * Intent analyzer (MVP)
 * 自然言語入力から実行したいアクション（インテント）を抽出する
 *
 * パターン数: 20+ (キャラクター、設定、メタデータ、LSP、ビュー、プロジェクト管理)
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
    // =====================================================
    // ビュー/表示関連パターン（3個）
    // 優先度高: 「表示」を含む入力は先にview_browserにマッチさせる
    // =====================================================
    {
      action: "view_browser",
      confidence: 0.9,
      pattern: /(一覧|リスト).*(表示|見)/,
    },
    {
      action: "view_browser",
      confidence: 0.88,
      pattern: /(プロジェクト|キャラクター|設定|章).*(表示|見る)/,
    },
    {
      action: "view_browser",
      confidence: 0.85,
      pattern: /(ビュー|ブラウザ).*(開|表示)/,
    },
    {
      action: "view_browser",
      confidence: 0.85,
      pattern: /可視化/,
    },

    // =====================================================
    // キャラクター関連パターン（5個）
    // =====================================================
    {
      action: "element_create",
      confidence: 0.9,
      pattern: /(キャラクター|登場人物).*(作(って|成)|追加)/,
      params: () => ({ type: "character" }),
    },
    {
      action: "element_create",
      confidence: 0.88,
      pattern: /(主人公|ヒロイン|敵キャラ|敵役).*(作(って|成|る)|追加)/,
      params: () => ({ type: "character" }),
    },
    {
      action: "element_create",
      confidence: 0.85,
      pattern: /(キャラ|人物).*(作(って|成|る)|追加)/,
      params: () => ({ type: "character" }),
    },
    {
      action: "element_create",
      confidence: 0.85,
      pattern: /新しい(キャラクター|キャラ|登場人物)/,
      params: () => ({ type: "character" }),
    },

    // =====================================================
    // 設定関連パターン（3個）
    // =====================================================
    {
      action: "element_create",
      confidence: 0.88,
      pattern: /(世界観|舞台|背景設定|場所).*(作成|追加|作る|作って)/,
      params: () => ({ type: "setting" }),
    },

    // =====================================================
    // メタデータ関連パターン（3個）
    // =====================================================
    {
      action: "meta_check",
      confidence: 0.9,
      pattern: /(メタデータ|frontmatter|フロントマター).*(チェック|検証|確認)/i,
    },
    {
      action: "meta_check",
      confidence: 0.85,
      pattern: /(メタ情報|章情報|章データ).*(チェック|検証|確認)/,
    },
    {
      action: "meta_check",
      confidence: 0.85,
      pattern: /(設定|バージョン).*(確認|チェック)/,
    },

    // =====================================================
    // LSP/検証関連パターン（3個）
    // =====================================================
    {
      action: "lsp_validate",
      confidence: 0.88,
      pattern: /(原稿|文章|ファイル).*(整合性|診断|チェック|確認)/,
    },
    {
      action: "lsp_validate",
      confidence: 0.85,
      pattern: /(検証|診断).*(実行|開始|する)/,
    },
    {
      action: "lsp_validate",
      confidence: 0.85,
      pattern: /整合性(を|の)?(チェック|確認|検証)/,
    },

    // =====================================================
    // 参照検索パターン（lsp_find_references）
    // =====================================================
    {
      action: "lsp_find_references",
      confidence: 0.88,
      pattern: /(参照|参照先|リファレンス).*(検索|探|見つけ|確認)/,
    },
    {
      action: "lsp_find_references",
      confidence: 0.85,
      pattern: /(どこで|どこに).*(使われ|参照)/,
    },

    // =====================================================
    // プロジェクト管理関連パターン（3個）
    // =====================================================
    {
      action: "meta_generate",
      confidence: 0.9,
      pattern: /(プロジェクト|新規プロジェクト).*(初期化|作成|セットアップ)/,
    },
    {
      action: "meta_generate",
      confidence: 0.85,
      pattern: /初期化(して|する|を)/,
    },
    {
      action: "meta_generate",
      confidence: 0.85,
      pattern: /(設定ファイル|config).*(生成|作成)/,
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
