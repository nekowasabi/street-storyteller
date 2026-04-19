# Process 202: cinderella サンプル subplot 追加

**Documentation** | N=202

## Overview

学習用に cinderella プロジェクトに subplot サンプルを 2-3 個追加し、実装パターンを示す。

## Affected

- 新規: `samples/cinderella/src/subplots/cinderella_growth.ts` (主人公成長 subplot)
- 新規: `samples/cinderella/src/subplots/prince_search.ts` (王子の花嫁探し subplot)
- 新規: `samples/cinderella/src/subplots/stepsisters_rivalry.ts` (継姉妹の対立 subplot)
- 修正: `samples/cinderella/manuscripts/chapter_*.md` FrontMatter に subplots フィールド追加
- 修正: `samples/cinderella/deno.json` に subplot リソースパス定義（必要に応じて）

## Implementation Notes

### Subplot 1: cinderella_growth

```typescript
// samples/cinderella/src/subplots/cinderella_growth.ts

export const cinderella_growth: Subplot = {
  id: "cinderella_growth",
  name: "シンデレラの成長",
  type: "main",
  summary: "虐げられた従者から、自分の価値を認識し、王子に選ばれるまでの成長物語",
  focusCharacters: {
    hero: { weight: "high", description: "主人公" }
  },
  beats: [
    {
      id: "beat_001",
      title: "従者としての日々",
      order: 1,
      position: "setup",
      summary: "シンデレラが継母に虐げられている日常"
    },
    {
      id: "beat_002",
      title: "舞踏会への夢",
      order: 2,
      position: "rising_action",
      summary: "舞踏会開催の知らせを聞き、希望を抱く"
    },
    {
      id: "beat_003",
      title: "魔法による変身",
      order: 3,
      position: "rising_action",
      summary: "魔法使いの助けで、美しいドレスに身を包む"
    },
    {
      id: "beat_004",
      title: "王子との出会い",
      order: 4,
      position: "climax",
      summary: "舞踏会で王子と出会い、認められる"
    },
    {
      id: "beat_005",
      title: "ガラスの靴による確認",
      order: 5,
      position: "falling_action",
      summary: "ガラスの靴がシンデレラの足に合う"
    },
    {
      id: "beat_006",
      title: "王妃への道",
      order: 6,
      position: "resolution",
      summary: "王子に選ばれ、城に迎えられる"
    }
  ]
};
```

### Subplot 2: prince_search

```typescript
// samples/cinderella/src/subplots/prince_search.ts

export const prince_search: Subplot = {
  id: "prince_search",
  name: "王子の花嫁探し",
  type: "subplot",
  summary: "王子が自分の相手を探す過程。舞踏会での出会いがターニングポイント",
  focusCharacters: {
    prince: { weight: "high", description: "主役の王子" }
  },
  beats: [
    {
      id: "beat_001",
      title: "花嫁探しの決意",
      order: 1,
      position: "setup",
      summary: "王国の繁栄のため、相応しい妃を探すことを決意"
    },
    {
      id: "beat_002",
      title: "舞踏会の開催",
      order: 2,
      position: "rising_action",
      summary: "王妃候補を見つけるため、盛大な舞踏会を開催"
    },
    {
      id: "beat_003",
      title: "謎の美女との邂逅",
      order: 3,
      position: "climax",
      summary: "舞踏会でシンデレラと出会い、一目惚れする"
    },
    {
      id: "beat_004",
      title: "ガラスの靴による探索",
      order: 4,
      position: "falling_action",
      summary: "落とされたガラスの靴で、謎の美女を探し出す"
    },
    {
      id: "beat_005",
      title: "最愛の人との再会",
      order: 5,
      position: "resolution",
      summary: "シンデレラを見つけ、愛を確認し、妃に迎える"
    }
  ]
};
```

### Subplot 3: stepsisters_rivalry

```typescript
// samples/cinderella/src/subplots/stepsisters_rivalry.ts

export const stepsisters_rivalry: Subplot = {
  id: "stepsisters_rivalry",
  name: "継姉妹の対立",
  type: "parallel",
  summary: "継姉妹がシンデレラに対して競い、舞踏会での失望を経験する物語",
  focusCharacters: {
    stepsister_1: { weight: "medium", description: "継姉1" },
    stepsister_2: { weight: "medium", description: "継姉2" }
  },
  beats: [
    {
      id: "beat_001",
      title: "舞踏会への執着",
      order: 1,
      position: "setup",
      summary: "継姉妹が舞踏会で王子に気に入られようと執着する"
    },
    {
      id: "beat_002",
      title: "シンデレラへの嫌がらせ",
      order: 2,
      position: "rising_action",
      summary: "シンデレラの邪魔をして、優越感を保つ"
    },
    {
      id: "beat_003",
      title: "舞踏会での失敗",
      order: 3,
      position: "climax",
      summary: "王子に相手にされず、謎の美女に奪われる"
    },
    {
      id: "beat_004",
      title: "シンデレラが王妃に",
      order: 4,
      position: "falling_action",
      summary: "シンデレラが王子に選ばれたことを知る"
    },
    {
      id: "beat_005",
      title: "新しい関係性",
      order: 5,
      position: "resolution",
      summary: "継姉妹は王妃となったシンデレラの下に仕える立場に"
    }
  ]
};
```

### Intersection 設計

```typescript
// samples/cinderella/src/subplots/intersections.ts

export const intersections: PlotIntersection[] = [
  {
    id: "intersection_001",
    subplotIds: ["cinderella_growth", "prince_search"],
    beatId: "cinderella_growth:beat_004", // 王子との出会い
    description: "シンデレラと王子が舞踏会で出会い、互いに引き寄せられる",
    chapters: ["chapter_03"]
  },
  {
    id: "intersection_002",
    subplotIds: ["cinderella_growth", "stepsisters_rivalry"],
    beatId: "cinderella_growth:beat_002", // 舞踏会への夢
    description: "継姉妹はシンデレラを邪魔しようとするが、シンデレラは密かに夢を抱く",
    chapters: ["chapter_02"]
  },
  {
    id: "intersection_003",
    subplotIds: ["prince_search", "stepsisters_rivalry"],
    beatId: "prince_search:beat_003", // 謎の美女との邂逅
    description: "王子が継姉妹ではなく、謎の美女（シンデレラ）を選ぶ",
    chapters: ["chapter_03"]
  }
];
```

### Manuscript FrontMatter 更新

```yaml
# samples/cinderella/manuscripts/chapter_02.md

---
title: "第2章 舞踏会への夢"
characters: ["hero", "stepmother", "stepsister_1", "stepsister_2"]
settings: ["servant_quarters", "royal_capital"]
timelines: ["main_story"]
subplots: ["cinderella_growth", "stepsisters_rivalry"]
timeline_events: ["event_002"]
foreshadowings: ["glass_slipper", "pumpkin_carriage"]
---

# 第2章 舞踏会への夢
...
```

## TDD: Red Phase

ドキュメント・サンプル作成には Red Phase なし。

## TDD: Green Phase

### Implementation Checklist

- [ ] `samples/cinderella/src/subplots/cinderella_growth.ts` 作成
- [ ] `samples/cinderella/src/subplots/prince_search.ts` 作成
- [ ] `samples/cinderella/src/subplots/stepsisters_rivalry.ts` 作成
- [ ] intersections 配列を作成 (3個以上の交点)
- [ ] `samples/cinderella/manuscripts/chapter_*.md` の FrontMatter に subplots フィールド追加
- [ ] `storyteller meta check` で cinderella プロジェクト検証 → 成功確認
- [ ] `storyteller view subplot --list` で3個全て表示確認
- [ ] `storyteller view subplot --id cinderella_growth --format mermaid` でグラフ表示確認

### Verification

```bash
cd samples/cinderella
storyteller meta check
# Expected: no errors, no warnings

storyteller view subplot --list
# Expected: 3 subplots (cinderella_growth, prince_search, stepsisters_rivalry)

storyteller view subplot --id cinderella_growth
# Expected: subplot details with 6 beats

storyteller view subplot --id cinderella_growth --format mermaid
# Expected: Mermaid graph visualization
```

## TDD: Refactor Phase

- サブプロット構造の一貫性確認（beat数、focusCharacters整合性）
- Intersection 設計の意味的確認（章番号、説明の自然さ）
- 他のサンプルプロジェクトとの パターン統一性

## Requires

- Process 100: 後方互換性検証完了

## Blocks

- Process 300: OODA 振り返り
