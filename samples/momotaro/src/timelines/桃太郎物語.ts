import type { Timeline } from "@storyteller/types/v2/timeline.ts";

/**
 * 桃太郎物語
 * 桃から生まれた少年が仲間と共に鬼退治する物語
 */
export const momotaro_story: Timeline = {
  "id": "momotaro_story",
  "name": "桃太郎物語",
  "scope": "story",
  "summary": "桃から生まれた少年が仲間と共に鬼退治する物語",
  "events": [
    {
      "id": "event_01_peach_arrives",
      "title": "桃が流れてくる",
      "category": "plot_point",
      "time": { "order": 1 },
      "summary": "おばあさんが川で洗濯中に大きな桃が流れてくる",
      "characters": ["おばあさん"],
      "settings": ["川"],
      "chapters": ["chapter_01"]
    },
    {
      "id": "event_02_momotaro_born",
      "title": "桃太郎誕生",
      "category": "plot_point",
      "time": { "order": 2 },
      "summary": "桃を割ると中から元気な男の子が生まれる",
      "characters": ["おじいさん", "おばあさん", "桃太郎"],
      "settings": ["おじいさんの家"],
      "chapters": ["chapter_01"]
    },
    {
      "id": "event_03_momotaro_grows",
      "title": "桃太郎成長",
      "category": "character_event",
      "time": { "order": 3 },
      "summary": "桃太郎はすくすくと育ち、立派な若者になる",
      "characters": ["桃太郎", "おじいさん", "おばあさん"],
      "settings": ["おじいさんの家"],
      "chapters": ["chapter_01"]
    },
    {
      "id": "event_04_decision",
      "title": "鬼退治を決意",
      "category": "plot_point",
      "time": { "order": 4 },
      "summary": "村を襲う鬼の話を聞き、桃太郎は鬼退治を決意する",
      "characters": ["桃太郎", "おじいさん", "おばあさん"],
      "settings": ["おじいさんの家"],
      "chapters": ["chapter_02"]
    },
    {
      "id": "event_05_departure",
      "title": "旅立ち",
      "category": "plot_point",
      "time": { "order": 5 },
      "summary": "きびだんごを持って桃太郎は旅に出る",
      "characters": ["桃太郎", "おじいさん", "おばあさん"],
      "settings": ["おじいさんの家"],
      "chapters": ["chapter_02"]
    },
    {
      "id": "event_06_meet_dog",
      "title": "犬との出会い",
      "category": "character_event",
      "time": { "order": 6 },
      "summary": "山道で犬と出会い、きびだんごを与えて家来にする",
      "characters": ["桃太郎", "犬"],
      "settings": ["山道"],
      "chapters": ["chapter_02"]
    },
    {
      "id": "event_07_meet_monkey",
      "title": "猿との出会い",
      "category": "character_event",
      "time": { "order": 7 },
      "summary": "山道で猿と出会い、きびだんごを与えて家来にする",
      "characters": ["桃太郎", "犬", "猿"],
      "settings": ["山道"],
      "chapters": ["chapter_02"]
    },
    {
      "id": "event_08_meet_pheasant",
      "title": "雉との出会い",
      "category": "character_event",
      "time": { "order": 8 },
      "summary": "山道で雉と出会い、きびだんごを与えて家来にする",
      "characters": ["桃太郎", "犬", "猿", "雉"],
      "settings": ["山道"],
      "chapters": ["chapter_02"]
    },
    {
      "id": "event_09_arrive_onigashima",
      "title": "鬼ヶ島到着",
      "category": "plot_point",
      "time": { "order": 9 },
      "summary": "船で海を渡り、鬼ヶ島に上陸する",
      "characters": ["桃太郎", "犬", "猿", "雉"],
      "settings": ["鬼ヶ島"],
      "chapters": ["chapter_03"]
    },
    {
      "id": "event_10_battle",
      "title": "鬼との戦い",
      "category": "climax",
      "time": { "order": 10 },
      "summary": "桃太郎と仲間たちが鬼たちと激しく戦う",
      "characters": ["桃太郎", "犬", "猿", "雉", "鬼の大将"],
      "settings": ["鬼ヶ島"],
      "chapters": ["chapter_03"]
    },
    {
      "id": "event_11_victory",
      "title": "勝利",
      "category": "climax",
      "time": { "order": 11 },
      "summary": "鬼の大将が降参し、宝物を差し出す",
      "characters": ["桃太郎", "犬", "猿", "雉", "鬼の大将"],
      "settings": ["鬼ヶ島"],
      "chapters": ["chapter_03"]
    },
    {
      "id": "event_12_return",
      "title": "凱旋帰郷",
      "category": "resolution",
      "time": { "order": 12 },
      "summary": "宝物を持って村に帰り、幸せに暮らす",
      "characters": ["桃太郎", "犬", "猿", "雉", "おじいさん", "おばあさん"],
      "settings": ["おじいさんの家"],
      "chapters": ["chapter_04"]
    }
  ]
};
