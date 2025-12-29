# storyteller × digrag RAG 連携設計メモリ

## 設計概要

storytellerプロジェクトにdigrag RAGを統合するための設計が完了。

### 核心コンセプト

1. **RAGドキュメントジェネレーター**
   - storytellerの各要素（キャラクター、設定、伏線、原稿）を
   - **専用の精度重視Markdownドキュメント**に変換（digrag互換ではなく、セマンティック検索最適化）
   - `.rag-docs/` ディレクトリに出力

2. **ドキュメント形式（専用形式 - 検索精度重視）**
   - digrag互換ではなく、storyteller専用の構造化形式を採用
   - 関係性・メタデータを明示的に構造化して検索精度向上
   - `Tags:` で要素タイプを指定（フィルタリング用）
   - 関係性は他要素のIDを含める（関連検索で発見しやすく）

3. **タグ体系**
   - 要素タイプ: `character`, `setting`, `foreshadowing`, `manuscript`
   - 役割: `protagonist`, `antagonist`, `supporting`
   - 伏線状態: `planted`, `resolved`, `abandoned`
   - チャプター: `chapter01`, `chapter02` など

4. **更新フロー（ワンコマンド化）**
   - **`storyteller rag` メインコマンドで一括実行（エクスポート+ビルド）**
   - オプションで個別実行も可能：`storyteller rag export`,
     `storyteller rag build`
   - `--incremental` で差分のみ更新
   - Git hook自動化対応

### 実装計画（2025-12-29更新 - ワンコマンド化対応）

- Phase 1: `storyteller rag` メインコマンド基盤+キャラクター+設定 - 4日
- Phase 1.5: チャンキングエンジン（document/scene分割）- 2.5日
- Phase 2: 全要素対応（伏線、タイムライン、関係性、原稿）- 4日
- Phase 3: インクリメンタルエクスポート - 2日
- Phase 4: ビルド統合＋Git Hooks - 2日
- Phase 5: MCPプロンプト統合（story_director拡張）+ ドキュメント - 4日

### 設計ドキュメント

- 統合設計:
  `/home/takets/repos/street-storyteller/docs/designs/PLAN_RAG_UNIFIED.md`
- 実装タスク:
  `/home/takets/repos/street-storyteller/docs/designs/RAG_IMPLEMENTATION_TASKS.md`
- チャンキング:
  `/home/takets/repos/street-storyteller/docs/designs/PLAN_RAG_CHUNKING.md`
- 基本設計:
  `/home/takets/repos/street-storyteller/docs/designs/PLAN_RAG_INTEGRATION.md`

### 技術仕様

- 埋め込みモデル: openai/text-embedding-3-small（digragデフォルト）
- チャンキング:
  小（〜3,000文字）はドキュメント単位、中（〜15,000文字）はシーン単位
- 最大チャンクサイズ: 5,000文字（digrag制限6,000内）
- オーバーラップ: 10%（〜500文字）
- インクリメンタル更新: ファイルハッシュベースの変更検出

### digrag MCP Tools

- `query_memos`: BM25/Semantic/Hybrid検索（tag_filter, enable_rewrite対応）
- `list_tags`: タグ一覧取得
- `get_recent_memos`: 最近更新されたドキュメント取得

### 推定総工数

約18.5日（バッファ込み4週間）
