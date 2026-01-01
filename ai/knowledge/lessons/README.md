# 教訓システム (Lessons System)

このディレクトリは、Serena v2の情報参謀層が管理する教訓（Lessons）を保存する場所です。

## ディレクトリ構造

```
lessons/
├── code-patterns/     # コードパターンに関する教訓
├── debugging/         # デバッグ手法に関する教訓
├── performance/       # パフォーマンス最適化に関する教訓
├── testing/           # テスト戦略に関する教訓
├── architecture/      # アーキテクチャ設計に関する教訓
├── process/           # 開発プロセスに関する教訓
└── README.md          # このファイル
```

## カテゴリ説明

| カテゴリ | 説明 | 例 |
|----------|------|-----|
| code-patterns | コードパターンとイディオム | デザインパターン、効果的な実装方法 |
| debugging | デバッグとトラブルシューティング | エラー解決手法、調査方法 |
| performance | パフォーマンス最適化 | ボトルネック解消、効率化手法 |
| testing | テスト戦略と実践 | テスト設計、TDD、カバレッジ改善 |
| architecture | アーキテクチャ設計 | 設計判断、構造決定 |
| process | 開発プロセス改善 | ワークフロー、チーム連携 |

## ファイル命名規則

```
YYYY-MM-DD-簡潔な説明.md
```

例:
- `2025-01-01-effective-error-handling.md`
- `2025-01-02-lazy-loading-pattern.md`

## ファイルフォーマット

```markdown
---
id: lesson-unique-id
category: code-patterns
importance: high
created_at: 2025-01-01
updated_at: 2025-01-01
source_task: task-id
related_lessons:
  - related-lesson-id
tags:
  - tag1
  - tag2
---

# 教訓: [タイトル]

## 概要
[教訓の概要]

## 詳細
[詳細な説明]

## 適用例
[具体的な適用例]

## 注意点
[適用時の注意点]
```

## 重要度レベル

| レベル | 基準 | 保持期間 |
|--------|------|----------|
| critical | 組織全体に影響する重要な教訓 | 永久 |
| high | 繰り返し活用可能な教訓 | 1年 |
| medium | 特定状況で有用な教訓 | 6ヶ月 |
| low | 参考情報 | 3ヶ月 |

## 管理エージェント

このディレクトリは以下のエージェントによって管理されます:

- **serena-staff-intel-collector**: 教訓の収集
- **serena-staff-intel-analyzer**: 教訓の分析・パターン発見
- **serena-staff-intel-archivist**: 教訓の保存・整理
- **serena-commander-intel**: 教訓活用の意思決定

## Memory連携

重要な教訓はSerena Memoryにも保存されます:
- 即座アクセス用にMemoryへ保存
- 永続化用にこのディレクトリへ保存

Memoryキー形式: `lesson_{category}_{YYYY-MM-DD}_{summary}`

## 検索方法

### カテゴリ別
```bash
# 特定カテゴリの教訓を表示
ls ai/knowledge/lessons/code-patterns/
```

### キーワード検索
```bash
# キーワードで検索
rg "pattern" ai/knowledge/lessons/
```

### Serena Memory経由
```
mcp__serena__list_memories()
mcp__serena__read_memory("lesson_...")
```

## 貢献ガイドライン

1. 新しい教訓は情報参謀層を通じて追加される
2. 重複を避けるため、類似の教訓がないか確認
3. 明確で再現可能な内容を心がける
4. 適用条件と注意点を明記する

---

*このシステムはSerena v2の統合参謀本部モデルの一部です。*
