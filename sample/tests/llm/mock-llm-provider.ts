/**
 * モックLLMプロバイダー
 * 実際のLLM APIを使わずにテストシステムをデモンストレーションするための実装
 */

import type { LLMProvider, LLMResponse } from "./llm-test-runner.ts";

/**
 * モックLLMプロバイダー
 * テスト用に事前定義された応答を返す
 */
export class MockLLMProvider implements LLMProvider {
  private testResponses: Map<string, LLMResponse> = new Map();
  
  constructor() {
    this.initializeResponses();
  }
  
  async analyze(prompt: string): Promise<LLMResponse> {
    // プロンプトから評価項目を抽出（簡易的な実装）
    const testId = this.extractTestId(prompt);
    
    // 少し遅延を入れてLLM呼び出しをシミュレート
    await this.delay(300);
    
    // 事前定義された応答を返す、なければデフォルト応答
    return this.testResponses.get(testId) || this.getDefaultResponse();
  }
  
  /**
   * テスト用の応答を初期化
   */
  private initializeResponses(): void {
    // キャラクター描写のテスト
    this.testResponses.set("hero_personality_consistency", {
      verdict: true,
      confidence: 0.85,
      reasoning: "勇者アレクスの描写は概ね性格設定と一致しています。正義感の強さは村を出る決意や、エリーゼを助けようとする行動に表れています。天然さは「黎明」の真の価値を知らない点などに見られます。",
      suggestions: [
        "天然さをもう少し具体的なエピソードで表現すると良いでしょう",
        "内面の葛藤をもう少し深く描写することで、キャラクターに深みが出ます"
      ]
    });
    
    this.testResponses.set("heroine_introduction", {
      verdict: true,
      confidence: 0.92,
      reasoning: "エリーゼの登場シーンは印象的です。「ちょっと、そこの人！」という気さくな呼びかけから始まり、自由奔放さが表現されています。高位の杖を持つ描写で天才性も示されています。",
      suggestions: [
        "魔法の実演シーンを追加すると、より天才性が際立ちます"
      ]
    });
    
    // 感情・関係性のテスト
    this.testResponses.set("meeting_naturalness", {
      verdict: false,
      confidence: 0.78,
      reasoning: "出会いから仲間になるまでの流れがやや急すぎます。初対面で即座に一緒に旅をする決定は、もう少し段階的な信頼構築が必要です。",
      suggestions: [
        "共通の目的や価値観を共有するシーンを追加",
        "小さな共闘シーンを入れて信頼関係を構築",
        "お互いの背景をもう少し共有する対話を追加"
      ]
    });
    
    this.testResponses.set("emotional_depth", {
      verdict: true,
      confidence: 0.80,
      reasoning: "勇者の旅立ちへの不安と決意は「今日という日が、ついに来たか...」という台詞に表れています。18年間過ごした部屋との別れのシーンも感情的です。",
      suggestions: [
        "不安の具体的な内容（失敗への恐れ、未知への恐怖など）を描写",
        "決意に至った内的な変化のプロセスを詳しく"
      ]
    });
    
    // 世界観・設定のテスト
    this.testResponses.set("setting_consistency", {
      verdict: true,
      confidence: 0.88,
      reasoning: "王都の描写は魔法と剣術の共存を適切に表現しています。勇者の剣と、エリーゼの魔法の杖が自然に共存し、冒険者ギルドの存在も世界観を支えています。",
      suggestions: [
        "日常生活での魔法使用例を追加すると、より世界観が深まります"
      ]
    });
    
    this.testResponses.set("atmosphere_building", {
      verdict: true,
      confidence: 0.75,
      reasoning: "冒険の始まりの期待感は表現されていますが、緊張感がやや不足しています。",
      suggestions: [
        "魔王復活の兆候をもう少し不穏に描写",
        "旅の危険性を示唆するエピソードを追加"
      ]
    });
    
    // 文章技術のテスト
    this.testResponses.set("show_dont_tell", {
      verdict: false,
      confidence: 0.82,
      reasoning: "一部で説明的な文章が見られます。特にキャラクターの性格説明が直接的すぎる箇所があります。",
      suggestions: [
        "「正義感が強い」という説明ではなく、具体的な行動で示す",
        "感情を直接述べるのではなく、仕草や表情で表現",
        "世界観の説明を会話や行動の中に自然に織り込む"
      ]
    });
    
    this.testResponses.set("dialogue_naturalness", {
      verdict: true,
      confidence: 0.87,
      reasoning: "対話は概ね自然で、各キャラクターの個性が反映されています。エリーゼの自由奔放さ、アレクスの真面目さが台詞に表れています。",
      suggestions: [
        "もう少し口語的な表現を増やすとより自然になります"
      ]
    });
    
    // プロット・構成のテスト
    this.testResponses.set("chapter_opening", {
      verdict: false,
      confidence: 0.70,
      reasoning: "「勇者は朝日とともに目を覚ました」という始まりは、ファンタジーとしてはありきたりです。",
      suggestions: [
        "アクションシーンから始める",
        "謎めいた描写から始める",
        "印象的な対話から始める"
      ]
    });
    
    this.testResponses.set("foreshadowing", {
      verdict: true,
      confidence: 0.83,
      reasoning: "伏線は適切に配置されています。黎明の剣の真の価値、勇者の出自の秘密、魔王復活の兆候が自然に示されています。",
      suggestions: [
        "伏線をもう少し subtleに配置すると、再読時の楽しみが増えます"
      ]
    });
    
    this.testResponses.set("pacing", {
      verdict: true,
      confidence: 0.79,
      reasoning: "全体的なペースは適切ですが、中盤がやや冗長です。",
      suggestions: [
        "王都の描写を少し簡潔に",
        "アクションシーンを追加してメリハリをつける"
      ]
    });
    
    // 読者体験のテスト
    this.testResponses.set("engagement", {
      verdict: true,
      confidence: 0.88,
      reasoning: "章の終わりで魔法の森への言及があり、次章への期待を高めています。キャラクター間の関係性も読者の興味を引きます。",
      suggestions: [
        "章末にもう一つ強いフックを追加すると更に効果的"
      ]
    });
    
    this.testResponses.set("immersion", {
      verdict: false,
      confidence: 0.73,
      reasoning: "視覚的な描写は良いですが、他の感覚への訴求が不足しています。",
      suggestions: [
        "音（市場の喧騒、風の音など）の描写を追加",
        "匂い（朝の空気、市場の匂いなど）の描写を追加",
        "触感（剣の重さ、石畳の感触など）の描写を追加"
      ]
    });
    
    // テーマのテスト
    this.testResponses.set("theme_introduction", {
      verdict: true,
      confidence: 0.81,
      reasoning: "成長と友情のテーマが自然に導入されています。説教臭さはなく、物語の中で自然に表現されています。",
      suggestions: []
    });
    
    // 総合評価
    this.testResponses.set("chapter_quality", {
      verdict: true,
      confidence: 0.77,
      reasoning: "第1章として必要な要素は揃っていますが、いくつかの改善点があります。キャラクターは魅力的で、世界観も明確です。",
      suggestions: [
        "冒頭をもっとインパクトのあるものに変更",
        "五感に訴える描写を増やして没入感を高める",
        "出会いのシーンにもう少し時間をかける"
      ],
      score: 7.5
    });
  }
  
  /**
   * プロンプトからテストIDを抽出（簡易実装）
   */
  private extractTestId(prompt: string): string {
    // 評価項目の特徴的な文字列からテストIDを推測
    if (prompt.includes("勇者アレクスは「正義感が強い")) {
      return "hero_personality_consistency";
    }
    if (prompt.includes("エリーゼの初登場シーン")) {
      return "heroine_introduction";
    }
    if (prompt.includes("出会いから仲間になるまで")) {
      return "meeting_naturalness";
    }
    if (prompt.includes("感情が表面的でなく")) {
      return "emotional_depth";
    }
    if (prompt.includes("魔法と剣術が共存する")) {
      return "setting_consistency";
    }
    if (prompt.includes("冒険の始まりにふさわしい")) {
      return "atmosphere_building";
    }
    if (prompt.includes("Show Don't Tell")) {
      return "show_dont_tell";
    }
    if (prompt.includes("対話が自然で")) {
      return "dialogue_naturalness";
    }
    if (prompt.includes("第1章の冒頭")) {
      return "chapter_opening";
    }
    if (prompt.includes("伏線が適切に")) {
      return "foreshadowing";
    }
    if (prompt.includes("ペース配分")) {
      return "pacing";
    }
    if (prompt.includes("次の章を読みたくなる")) {
      return "engagement";
    }
    if (prompt.includes("物語世界に没入")) {
      return "immersion";
    }
    if (prompt.includes("テーマ（成長、友情")) {
      return "theme_introduction";
    }
    if (prompt.includes("第1章として総合的に")) {
      return "chapter_quality";
    }
    
    return "unknown";
  }
  
  /**
   * デフォルトの応答
   */
  private getDefaultResponse(): LLMResponse {
    return {
      verdict: true,
      confidence: 0.7,
      reasoning: "テストは正常に実行されました。",
      suggestions: []
    };
  }
  
  /**
   * 遅延をシミュレート
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}