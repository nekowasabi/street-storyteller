# Process 300: OODA レトロスペクティブと知見の永続化

## Implementation Brief（コピペ用）

- **背景**: process-01〜200 を経て実装・ドキュメント・E2E 検証が完了。OODA ループの最後のフェーズとして得られた知見を組織知として永続化する必要がある。
- **目的**: 本ミッションで得られた教訓・設計判断・落とし穴を 4 箇所（.serena/memories, stigmergy, CLAUDE.md, byterover）に保存し、将来の類似タスクで再利用できる状態にする。
- **変更範囲**:
  - `.serena/memories/lessons-sync-skills.md`（新規）
  - `stigmergy/lessons.jsonl` への追記または `stigmergy/patterns/embed-deployment.md`（新規）
  - 必要に応じて `CLAUDE.md` の更新（重要度高の場合のみ）
  - `brv` が利用可能なら byterover への保存
- **参照する定数**: なし（メタ情報処理のためコードレベルの定数参照は不要）
- **禁止事項**（PLAN Don'ts より）: 該当なし（本フェーズはコード変更を伴わない）
- **出力順序**:
  1) ミッション全体の振り返り（OODA Observe）
  2) 教訓カテゴリ分類（Orient）
  3) 永続化先を決定（Decide）
  4) 4 箇所への保存実行（Act）

---

## Overview

ミッション完了後の知見統合フェーズ。実装中に発見した非自明な設計判断・トレードオフ・テクニックを構造化メモリに保存し、組織横断の長期記憶として再利用可能にする。

## Affected Files

| パス | 種別 | 変更内容 |
|------|------|---------|
| `.serena/memories/lessons-sync-skills.md` | 新規 | 構造化長期メモリ。設計判断と落とし穴を記述 |
| `stigmergy/lessons.jsonl` | 追記 | JSONL 形式で 1〜3 エントリ追加 |
| `stigmergy/patterns/embed-deployment.md` | 新規（条件付き） | パターン化価値が高い場合のみ |
| `CLAUDE.md` | 修正（条件付き） | 重要度極めて高い知見の場合のみグローバル化 |
| byterover | 外部保存 | `brv` 利用可能時のみ |

## Knowledge Persistence (process-300 専用)

このプロセスでは、得られた知見を以下の **4 箇所** に保存すること:

### 1. `.serena/memories/` — 構造化された長期メモリ

- ツール: `mcp__serena__write_memory`
- ファイル名: `lessons-sync-skills`
- 想定内容（テンプレ）:

```markdown
# Lessons: storyteller update --sync-skills 実装

## 設計判断
- skills の go:embed 所有権を generate モジュールから `internal/assets/` 共通パッケージへ昇格させた
  - 理由: update など他コマンドからも再利用が必要になったため
  - 学び: モジュール固有に見えるアセットも、複数コマンドから参照される可能性があれば早期に共通パッケージへ抽出する

## トレードオフ
- バックアップ機能を実装しなかった
  - 理由: embed 正本から再生成可能、ユーザー判断「バックアップ不要」
  - 結果: API が簡素化し、`DeployOptions` は `DryRun bool` のみとなった
  - 反省: 「再生成可能なアセット」と「ユーザー固有データ」を峻別することで余計な機能を回避できた

## 落とし穴
- `go:embed all:skills` のパスはパッケージ相対で、ファイルシステム上の絶対/相対パスとは異なる
- `omitempty` の重要性: 既存 JSON スキーマ拡張時、新フィールドを omitempty にしないと後方互換性が壊れる

## 再利用可能パターン
- `DeployResult{Synced, Unchanged}` 構造体: 冪等な配布 API の標準形
- content hash 比較によるスキップ: 多くのファイル同期コマンドで再利用可能
```

### 2. `stigmergy/` — ファイルベースの教訓・パターン蓄積

- 追記先: `stigmergy/lessons.jsonl`（既存ファイルが無ければ新規作成）
- フォーマット例:

```jsonl
{"timestamp": "2026-05-16", "category": "architecture", "lesson": "go:embed アセットの所有権はモジュール固有ではなく専用パッケージへ", "context": "street-storyteller sync-skills implementation"}
{"timestamp": "2026-05-16", "category": "api-design", "lesson": "JSON スキーマ拡張は omitempty で後方互換性を保つ", "context": "update --sync-skills フラグ追加"}
{"timestamp": "2026-05-16", "category": "yagni", "lesson": "再生成可能アセットにバックアップ機能は不要", "context": "DeployOptions の簡素化判断"}
```

- パターン化価値が高い場合のみ `stigmergy/patterns/embed-deployment.md` を新規作成

### 3. グローバルメモリ — セッション横断知識

- 重要度が極めて高い場合のみ `~/.claude/CLAUDE.md` または プロジェクト `CLAUDE.md` に追記
- 本ミッションの場合、`CLAUDE.md` の「進行中の機能開発」セクションが process-200 で更新済みのため、追加更新は不要と判断
- 判断基準: 「他プロジェクトでも再利用される普遍パターンか」が yes なら追記

### 4. byterover — 外部知識ベース（条件付き）

- 確認コマンド: `command -v brv`
- 存在する場合のみ `brv save` で保存（コマンド体系は brv のヘルプで確認）
- 存在しない場合はスキップ（エラーにしない）

---

## Red Phase: 観察と仮説立て（Observe）

- [ ] ブリーフィング確認
- [ ] ミッション全体のトランスクリプト / コミット履歴を振り返り、以下を抽出:
  - 設計判断の主要な分岐点（3 件以上）
  - 想定外に時間を要した箇所
  - 後方互換性で工夫した点
  - YAGNI 原則の適用箇所
- [ ] 抽出結果を箇条書きで一時メモ化

✅ **Phase Complete**

---

## Green Phase: 永続化実行（Act）

- [ ] ブリーフィング確認
- [ ] `.serena/memories/lessons-sync-skills.md` に教訓を保存（`mcp__serena__write_memory` 使用）
- [ ] `stigmergy/lessons.jsonl` に 2〜4 エントリ追加
- [ ] パターン化価値が高い知見が 1 件以上あれば `stigmergy/patterns/embed-deployment.md` を新規作成
- [ ] 重要度極めて高い知見があれば `CLAUDE.md` グローバルセクションに 1〜3 行追記（基本不要）
- [ ] `command -v brv` を確認し、利用可能なら byterover に保存

✅ **Phase Complete**

---

## Refactor Phase: 知見の整理（Orient/Decide 再帰）

- [ ] 保存した教訓が将来の検索で hit しやすいタグ・キーワードを含むか確認
- [ ] 重複する教訓があれば統合
- [ ] `.serena/memories/` 内で `list_memories` を実行し、類似既存メモリとの関係を整理

✅ **Phase Complete**

---

## Knowledge Phase: 知見の永続化（チェックリスト）

- [ ] .serena/memories/ に教訓を保存（mcp__serena__write_memory）
- [ ] stigmergy/ に教訓・パターンを記録
- [ ] 重要度が高い知見を CLAUDE.md に追記（基本スキップ、判断要）
- [ ] `command -v brv` を確認し、利用可能なら byterover に保存

✅ **Phase Complete**

---

## Manual Verification（手動検証シナリオ）

1. `ls .serena/memories/ | grep sync-skills` で保存ファイル確認
2. `tail -5 stigmergy/lessons.jsonl` で追記エントリ確認
3. `mcp__serena__list_memories` で構造化メモリ一覧に lessons-sync-skills が登録されていることを確認
4. byterover 保存実施した場合は `brv list` 等で確認

---

## Dependencies
- Requires: process-200
- Blocks: -
