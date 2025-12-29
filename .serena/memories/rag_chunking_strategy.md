# RAG チャンキング戦略メモリ

## 設計概要

シーン単位ファイル（最大数十KB）に対するRAGチャンキング戦略が策定された。

### 核心決定事項

1. **埋め込みモデル**: openai/text-embedding-3-small（digragデフォルト）
   - $0.02/1Mトークン
   - 8,191トークン制限
   - 1536次元

2. **チャンキング戦略**:
   - 小（〜3,000文字）: ドキュメント単位（分割なし）
   - 中（3,000〜15,000文字）: シーン単位分割（## 見出し）
   - 大（15,000文字超）: セマンティック分割（将来）

3. **設定値**:
   - max_chunk_chars: 5,000（digrag制限6,000内）
   - overlap_chars: 500（10%）
   - min_chunk_chars: 200

4. **更新フロー**:
   - Git hook: post-commit推奨
   - 手動: `storyteller rag update`
   - インクリメンタル更新

### 実装計画

- Phase 1: ドキュメント単位（1週間）
- Phase 2: シーン単位分割（1週間）
- Phase 3: 更新自動化（1週間）
- Phase 4: セマンティック分割（オプション）

### 設計ドキュメント

`/home/takets/repos/street-storyteller/docs/designs/PLAN_RAG_CHUNKING.md`
