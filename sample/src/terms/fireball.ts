import type { MagicSpell } from "../types/term.ts";

export const fireball: MagicSpell = {
  id: "fireball",
  name: "ファイアボール",
  displayNames: ["ファイアボール", "火球術", "炎の球"],
  category: "magic",
  
  summary: "基本的な攻撃魔法。火の球を生成して敵に放つ。",
  
  details: {
    description: "魔力を炎に変換し、圧縮した火球を作り出す初級攻撃魔法。",
    origin: "古代魔法王国で開発された最初の体系的攻撃魔法の一つ。",
    usage: "詠唱後、杖を敵に向けて解放する。熟練者は無詠唱でも使用可能。",
    limitations: "雨天時は威力が半減。水中では使用不可。",
    variations: ["メガファイアボール", "マルチファイアボール", "ヘルファイア"],
    relatedTerms: ["flame_arrow", "explosion", "inferno"]
  },
  
  magicProperties: {
    element: "fire",
    manaCost: 20,
    castTime: "2秒",
    range: "30メートル",
    effect: "爆発による範囲ダメージ",
    incantation: "炎よ、我が意志に従い、敵を焼き尽くせ——ファイアボール！"
  },
  
  constraints: {
    usableBy: ["heroine", "wizard_npc", "fire_mage"],
    requiresCondition: "火属性の魔法適性が必要",
    appearingChapters: ["chapter01", "chapter03", "chapter08"]
  },
  
  detectionHints: {
    commonPatterns: [
      "ファイアボール",
      "火球",
      "炎の球",
      "火球術を放",
      "ファイアボールを唱え"
    ],
    contextRequired: false,
    confidence: 0.95
  }
};