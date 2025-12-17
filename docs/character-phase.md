# キャラクター成長フェーズ機能

物語の進行に伴うキャラクターの成長・変化を表現する機能です。差分管理方式により、変化した属性のみを記述し、変化しない属性は前フェーズから自動継承します。

## 目次

- [概要](#概要)
- [設計思想](#設計思想)
- [型定義](#型定義)
- [CLI使用方法](#cli使用方法)
- [MCPツール](#mcpツール)
- [MCPリソース](#mcpリソース)
- [MCPプロンプト](#mcpプロンプト)
- [実装時の知見・注意点](#実装時の知見注意点)
- [使用例](#使用例)

---

## 概要

キャラクターは物語の進行に伴い、性格・信条・能力・関係性などが変化することがあります。この機能では：

- **段階的な成長**（gradual）: 少しずつ変化していく
- **大きな転換点**（turning_point）: 劇的な変化が起きる
- **覚醒**（revelation）: 気づきや目覚め
- **退行**（regression）: 失墜や堕落
- **変容**（transformation）: 根本的な変化

これらの成長パターンを統一的に管理できます。

---

## 設計思想

### 差分管理方式

各フェーズでは「前フェーズからの変化（差分）」のみを記述します。

```typescript
// 悪い例：毎回全属性を記述
phase1: { traits: ["臆病", "優しい", "正直"] }
phase2: { traits: ["勇敢", "優しい", "正直"] }  // 重複が多い

// 良い例：差分のみを記述
phase1: { delta: { traits: { add: ["臆病"] } } }
phase2: { delta: { traits: { add: ["勇敢"], remove: ["臆病"] } } }
```

**メリット**:

- 冗長性の排除
- 変化点が明確
- 大規模キャラクターでも管理が容易

### 後方互換性

既存の`Character`型に`phases`フィールドをオプショナルで追加しているため、既存のキャラクターデータはそのまま動作します。

---

## 型定義

### CharacterStateDelta（差分）

```typescript
export type CharacterStateDelta = {
  traits?: ArrayDelta; // 性格・特性
  beliefs?: ArrayDelta; // 信条・価値観
  abilities?: AbilitiesDelta; // 能力・スキル
  relationships?: RelationshipsDelta; // 関係性
  appearance?: ArrayDelta; // 外見
  status?: StatusDelta; // 状態（身体/精神/社会）
  goals?: ArrayDelta; // 目標
  summary?: string; // 概要の上書き
};
```

### ArrayDelta（配列の差分）

```typescript
export type ArrayDelta = {
  add?: string[]; // 追加
  remove?: string[]; // 削除
  modify?: Record<string, string>; // 変更（old → new）
};
```

### CharacterPhase（フェーズ）

```typescript
export type CharacterPhase = {
  // 必須
  id: string; // フェーズID
  name: string; // フェーズ名
  order: number; // 順序
  summary: string; // 概要
  delta: CharacterStateDelta; // 差分

  // オプショナル
  transitionType?: TransitionType; // 遷移タイプ
  importance?: PhaseImportance; // 重要度
  triggerEventId?: string; // TimelineEventへの参照
  startChapter?: string; // 開始チャプター
  displayNames?: string[]; // このフェーズでの呼び名
};
```

---

## CLI使用方法

### フェーズ作成

```bash
# 基本的なフェーズ作成
storyteller element phase \
  --character hero \
  --id awakening \
  --name "覚醒期" \
  --order 1 \
  --summary "真実を知り、力に目覚める"

# オプション付き
storyteller element phase \
  --character hero \
  --id awakening \
  --name "覚醒期" \
  --order 1 \
  --summary "真実を知り、力に目覚める" \
  --transition-type turning_point \
  --importance major \
  --trigger-event discovery_of_truth \
  --start-chapter chapter_05

# 差分を指定
storyteller element phase \
  --character hero \
  --id awakening \
  --name "覚醒期" \
  --order 1 \
  --summary "真実を知り、力に目覚める" \
  --add-trait "勇敢" \
  --remove-trait "臆病" \
  --add-ability "魔法" \
  --add-belief "仲間を守る"
```

### フェーズ表示

```bash
# 特定フェーズの状態（スナップショット）を表示
storyteller view character --id hero --phase awakening

# 全フェーズ一覧
storyteller view character --id hero --all-phases

# フェーズ間の差分表示
storyteller view character --id hero --diff --from initial --to awakening

# JSON形式で出力
storyteller view character --id hero --phase awakening --json
```

---

## MCPツール

### phase_create

キャラクターに成長フェーズを追加します。

```json
{
  "name": "phase_create",
  "arguments": {
    "characterId": "hero",
    "id": "awakening",
    "name": "覚醒期",
    "order": 1,
    "summary": "真実を知り、力に目覚める",
    "transitionType": "turning_point",
    "addTraits": ["勇敢"],
    "removeTraits": ["臆病"],
    "addAbilities": ["魔法"]
  }
}
```

### phase_view

フェーズ情報を表示します。

```json
{
  "name": "phase_view",
  "arguments": {
    "characterId": "hero",
    "mode": "snapshot", // "snapshot" | "timeline" | "diff" | "list"
    "phaseId": "awakening",
    "fromPhaseId": null // diff時に使用
  }
}
```

---

## MCPリソース

| URI                                               | 説明                     |
| ------------------------------------------------- | ------------------------ |
| `storyteller://character/{id}/phases`             | フェーズ一覧             |
| `storyteller://character/{id}/phase/{phaseId}`    | 特定フェーズの差分情報   |
| `storyteller://character/{id}/snapshot/{phaseId}` | 解決済みスナップショット |

---

## MCPプロンプト

### character_arc_suggest

キャラクターの成長アークを提案します。

```json
{
  "name": "character_arc_suggest",
  "arguments": {
    "characterId": "hero",
    "targetTone": "希望" // "希望" | "絶望" | "成長" | "redemption"
  }
}
```

### phase_transition_check

フェーズ遷移の妥当性をチェックします。

```json
{
  "name": "phase_transition_check",
  "arguments": {
    "characterId": "hero",
    "fromPhaseId": "initial",
    "toPhaseId": "awakening"
  }
}
```

---

## 実装時の知見・注意点

### 1. 差分適用の順序

フェーズは`order`フィールドでソートされ、順次適用されます。

```typescript
// CharacterPhaseResolver内の処理
const sortedPhases = [...phases].sort((a, b) => a.order - b.order);
for (const phase of sortedPhases) {
  if (phase.order > targetPhase.order) break;
  snapshot = this.applyPhaseDelta(snapshot, phase);
}
```

**注意**:
`order`の値が重複すると、適用順序が不定になります。必ず一意な値を使用してください。

### 2. initialStateの推論

`initialState`が未定義の場合、既存の`Character`フィールドから自動推論されます。

```typescript
private getInitialState(character: Character): CharacterInitialState {
  if (character.initialState) {
    return character.initialState;
  }
  // 既存フィールドから推論
  return {
    traits: [...character.traits],
    beliefs: [],
    abilities: [],
    relationships: { ...character.relationships },
    appearance: [],
    goals: [],
  };
}
```

**推奨**:
明示的な成長管理を行う場合は、`initialState`を定義することを推奨します。

### 3. MCPスキーマの制限

`McpPropertySchema`型はネストされた`properties`をサポートしないため、MCPツールの`delta`部分はフラット化しています。

```typescript
// 型制約により以下は不可
inputSchema: {
  properties: {
    delta: {
      properties: {  // ← ネスト不可
        traits: { ... }
      }
    }
  }
}

// 代わりにフラット化
inputSchema: {
  properties: {
    addTraits: { type: "array", items: { type: "string" } },
    removeTraits: { type: "array", items: { type: "string" } },
    // ...
  }
}
```

### 4. 関係性の差分

`relationships`は`Record<string, RelationType>`形式のため、差分適用では3つの操作があります：

- `add`: 新しい関係性を追加
- `remove`: 関係性を削除（キャラクターIDのリスト）
- `change`: 既存の関係性を変更

```typescript
// 敵から味方への変化
delta: {
  relationships: {
    change: { "rival": "ally" }  // rivalとの関係をenemyからallyに
  }
}
```

### 5. TimelineEventとの連携

`triggerEventId`でTimelineEventとフェーズを関連付けできます。

```typescript
// キャラクターフェーズ
{
  id: "awakening",
  triggerEventId: "discovery_of_truth",  // このイベントがトリガー
}

// TimelineEventにもphaseChanges追加（オプショナル）
{
  id: "discovery_of_truth",
  phaseChanges: [
    { characterId: "hero", fromPhaseId: null, toPhaseId: "awakening" }
  ]
}
```

### 6. LSP検出でのフェーズ考慮

フェーズ固有の`displayNames`は、LSP検出時に収集されます。

```typescript
// キャラクター定義
{
  id: "hero",
  displayNames: ["勇者", "若者"],
  phases: [
    {
      id: "awakening",
      displayNames: ["覚醒者", "魔法使い"],  // このフェーズでの呼び名
    }
  ]
}
```

原稿中で「覚醒者」と記述されても、heroキャラクターとして検出されます。

### 7. スナップショットの不変性

`CharacterStateSnapshot`は特定時点の状態を表すため、生成後は変更しないでください。新しい状態が必要な場合は、`resolveAtPhase()`で新しいスナップショットを生成します。

### 8. パフォーマンス考慮

多数のフェーズがある場合、`resolveAtPhase()`は初期状態からすべての差分を適用するため、コストがかかります。頻繁にアクセスする場合はキャッシュを検討してください。

```typescript
// キャッシュ例
const snapshotCache = new Map<string, CharacterStateSnapshot>();

function getCachedSnapshot(character: Character, phaseId: string) {
  const key = `${character.id}:${phaseId}`;
  if (!snapshotCache.has(key)) {
    snapshotCache.set(key, resolver.resolveAtPhase(character, phaseId));
  }
  return snapshotCache.get(key)!;
}
```

---

## 使用例

### 完全な例

```typescript
import type { Character } from "./src/type/v2/character.ts";
import { CharacterPhaseResolver } from "./src/application/character_phase_resolver.ts";

const hero: Character = {
  id: "hero",
  name: "勇者",
  role: "protagonist",
  traits: ["臆病", "優しい"],
  relationships: { "mentor": "respect" },
  appearingChapters: ["chapter_01", "chapter_02", "chapter_03"],
  summary: "平凡な村人だった若者",

  // 初期状態（オプショナル）
  initialState: {
    traits: ["臆病", "優しい"],
    beliefs: ["平穏な暮らしが一番"],
    abilities: [],
    relationships: { "mentor": "respect" },
    goals: ["村で平和に暮らす"],
  },

  // 成長フェーズ
  phases: [
    {
      id: "awakening",
      name: "覚醒期",
      order: 1,
      summary: "真実を知り、力に目覚める",
      transitionType: "turning_point",
      importance: "major",
      triggerEventId: "discovery_of_truth",
      startChapter: "chapter_05",
      delta: {
        traits: {
          add: ["勇敢"],
          remove: ["臆病"],
        },
        beliefs: {
          add: ["仲間を守る"],
          remove: ["平穏な暮らしが一番"],
        },
        abilities: {
          add: ["魔法"],
        },
        goals: {
          add: ["世界を救う"],
          remove: ["村で平和に暮らす"],
        },
        status: {
          mental: "覚悟を決めた",
        },
      },
      displayNames: ["覚醒者"],
    },
    {
      id: "mastery",
      name: "習熟期",
      order: 2,
      summary: "力を完全にコントロールする",
      transitionType: "gradual",
      importance: "minor",
      startChapter: "chapter_10",
      delta: {
        abilities: {
          add: ["上級魔法", "剣術"],
          improve: ["魔法"],
        },
        status: {
          physical: "鍛え上げられた体",
        },
      },
    },
  ],
};

// フェーズ解決
const resolver = new CharacterPhaseResolver();

// 初期状態
const initial = resolver.resolveInitialState(hero);
console.log(initial.traits); // ["臆病", "優しい"]

// 覚醒期の状態
const awakened = resolver.resolveAtPhase(hero, "awakening");
console.log(awakened.traits); // ["優しい", "勇敢"]
console.log(awakened.abilities); // ["魔法"]

// 習熟期の状態
const mastered = resolver.resolveAtPhase(hero, "mastery");
console.log(mastered.abilities); // ["魔法", "上級魔法", "剣術"]

// フェーズタイムライン
const timeline = resolver.getPhaseTimeline(hero);
console.log(timeline);
// [
//   { phaseId: null, phaseName: "初期状態", order: 0, ... },
//   { phaseId: "awakening", phaseName: "覚醒期", order: 1, ... },
//   { phaseId: "mastery", phaseName: "習熟期", order: 2, ... },
// ]

// フェーズ間の差分
const diff = resolver.comparePhaseDiff(hero, null, "awakening");
console.log(diff.changes.traits);
// { added: ["勇敢"], removed: ["臆病"] }
```

---

## 関連ドキュメント

- [CLI リファレンス](./cli.md)
- [MCP リファレンス](./mcp.md)
- [LSP 実装](./lsp-implementation.md)
