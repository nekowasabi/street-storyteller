# 用語管理システム設計

## 問題提起
現在の`SettingType`（location/world/culture/organization）では、物語で重要な以下の要素が管理できません：
- 魔法・呪文名
- アイテム・武器
- 称号・階級
- 技能・必殺技
- 概念・世界観用語

## 解決策：Term型の導入

### 設計方針
`Setting`とは別に、`Term`型を新設して用語・概念を管理します。

```typescript
Setting  → 場所・世界観（王国、森、城など）
Term     → 用語・概念（呪文、アイテム、称号など）
Character → キャラクター
```

## Term型の構造

### 基本構造
```typescript
export type Term = {
  id: string;
  name: string;
  displayNames?: string[];
  category: TermCategory;
  summary: string;
  details?: TermDetails;
  constraints?: TermConstraints;
  detectionHints?: DetectionHints;
};
```

### カテゴリー分類
```typescript
export type TermCategory = 
  | "magic"           // 魔法・呪文
  | "skill"           // 技能・必殺技
  | "item"            // アイテム・道具
  | "concept"         // 概念・世界観用語
  | "title"           // 称号・階級
  | "organization"    // 組織・団体
  | "creature"        // 生物・モンスター
  | "technology"      // 技術・発明
  | "language"        // 言語・方言
  | "custom";         // その他
```

## 実装例

### 1. 魔法呪文（MagicSpell）
```typescript
export const fireball: MagicSpell = {
  id: "fireball",
  name: "ファイアボール",
  category: "magic",
  magicProperties: {
    element: "fire",
    manaCost: 20,
    castTime: "2秒",
    incantation: "炎よ、我が意志に従い..."
  }
};
```

### 2. アイテム（Item）
```typescript
export const legendarySword: Item = {
  id: "legendary_sword",
  name: "黎明の剣",
  category: "item",
  itemProperties: {
    rarity: "legendary",
    effects: ["対魔族ダメージ+50%"]
  }
};
```

### 3. 称号（Title）
```typescript
export const demonLordTitle: Term = {
  id: "demon_lord_title",
  name: "魔王",
  category: "title",
  summary: "魔界と魔族を統べる最高位の称号"
};
```

## 原稿での使用

### Markdown内での参照
```markdown
「ファイアボール！」<!-- @fireball:explicit -->
愛剣「黎明」を抜いた。<!-- @legendary_sword:implicit -->
魔王復活の兆候が...<!-- @demon_lord_title:implicit -->
```

### メタデータでの管理
```typescript
// chapter.meta.ts
import { fireball } from "../src/terms/fireball.ts";

references: {
  "ファイアボール": fireball,
  "黎明": legendarySword,
  "魔王": demonLordTitle
}
```

## 利点

### 1. 明確な分類
- 場所/世界観（Setting）と用語/概念（Term）を明確に分離
- カテゴリーによる体系的な管理

### 2. 拡張性
- 新しいカテゴリーの追加が容易
- カテゴリー固有のプロパティを定義可能

### 3. 検索性
- カテゴリー別の検索
- 用語集の自動生成が可能

### 4. 一貫性
- 用語の表記ゆれを管理
- 使用制約の明確化

## 実装優先度

1. **Phase 1**: 基本的なTerm型の実装
2. **Phase 2**: カテゴリー別の拡張型（MagicSpell, Item等）
3. **Phase 3**: 用語集自動生成機能
4. **Phase 4**: LSPでの用語補完・検証

## まとめ

`Term`型の導入により、物語で使用される全ての用語・概念を体系的に管理できます。これにより：

- **執筆時**: 正確な用語使用と補完
- **検証時**: 用語の一貫性チェック
- **出力時**: 用語集の自動生成

が可能になり、より豊かで一貫性のある物語作成を支援します。