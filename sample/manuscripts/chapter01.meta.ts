import type { ChapterMeta } from "../src/types/chapter.ts";
import { hero } from "../src/characters/hero.ts";
import { heroine } from "../src/characters/heroine.ts";
import { kingdom } from "../src/settings/kingdom.ts";
import { legendarySword } from "../src/terms/legendary_sword.ts";
import { adventurerGuild } from "../src/terms/adventurer_guild.ts";
import { demonLordTitle } from "../src/terms/demon_lord_title.ts";

export const chapter01Meta: ChapterMeta = {
  id: "chapter01",
  title: "旅の始まり",
  order: 1,
  characters: [hero, heroine],
  settings: [kingdom],

  summary:
    "勇者アレクスが故郷を離れ、運命の旅に出発する。王都でエリーゼと出会い、共に冒険へ。",

  plotPoints: [
    "アレクスの旅立ちの決意",
    "王都での偶然の出会い",
    "エリーゼとの運命的な邂逅",
    "二人の共通点の発見",
    "魔法の森への旅の始まり",
  ],

  // 章固有の検証ルール
  validations: [
    {
      type: "character_presence",
      validate: (content: string) => {
        // 主人公が必ず登場していることを確認
        return content.includes("勇者") || content.includes("アレクス");
      },
      message: "主人公（勇者/アレクス）が章内に登場していません",
    },
    {
      type: "character_presence",
      validate: (content: string) => {
        // ヒロインが必ず登場していることを確認
        return content.includes("エリーゼ") || content.includes("魔法使い");
      },
      message: "ヒロイン（エリーゼ）が章内に登場していません",
    },
    {
      type: "setting_consistency",
      validate: (content: string) => {
        // 王都が舞台として登場していることを確認
        return content.includes("王都") || content.includes("城門");
      },
      message: "設定（王都）が章内に登場していません",
    },
    {
      type: "plot_advancement",
      validate: (content: string) => {
        // 出会いのシーンが含まれていることを確認
        const hasEncounter = content.includes("出会") ||
          content.includes("初めて");
        const hasJourney = content.includes("旅") || content.includes("出発");
        return hasEncounter && hasJourney;
      },
      message: "重要なプロットポイント（出会い・旅立ち）が不足しています",
    },
  ],

  // 参照マッピング（LSP用）
  references: {
    "勇者": hero,
    "アレクス": hero,
    "主人公": hero,
    "彼": hero, // 文脈依存
    "エリーゼ": heroine,
    "魔法使い": heroine,
    "エリー": heroine,
    "彼女": heroine, // 文脈依存
    "王都": kingdom,
    "王国": kingdom,
    "エルフィード": kingdom,
    "城門": kingdom,
    "中央市場": kingdom,
    "黎明": legendarySword,
    "愛剣": legendarySword,
    "冒険者ギルド": adventurerGuild,
    "ギルド": adventurerGuild,
    "魔王": demonLordTitle,
  },
};
