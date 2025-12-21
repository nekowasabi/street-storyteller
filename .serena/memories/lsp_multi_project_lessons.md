# LSPマルチプロジェクト対応の教訓

## 問題パターン

### monorepoでのLSP動作問題

**問題**:
monorepo内のサブプロジェクト（`samples/cinderella`等）でLSPが正しく動作しない

**症状**:

- nvim-lspconfigの`root_pattern("deno.json")`が親ディレクトリを最初に検出
- LSP初期化時のprojectRootが固定され、サブプロジェクトのエンティティをロードできない
- Hover/Diagnosticsがサブプロジェクトの要素を認識しない

**根本原因**:

- LSPサーバーは初期化時に受け取ったrootUriでプロジェクトを判断
- エディタの`root_pattern()`は起動時に一度だけ評価される
- サブプロジェクトのファイルを開いても、親プロジェクトのコンテキストが使用される

## 解決パターン

### 1. ファイルベースの動的プロジェクト検出

**設計**: `ProjectDetector`クラス

```
ProjectDetector
├── detectProjectRoot(fileUri): Promise<string>
├── findMarkerFile(startPath): Promise<ProjectDetectionResult | null>
└── cache: Map<fileUri, projectRoot>
```

**ポイント**:

- 各LSPリクエストでファイルURIから最も近いマーカーファイル（`.storyteller.json`）を検出
- 上方向に探索、見つからなければフォールバックを使用
- 結果をキャッシュしてパフォーマンス確保

### 2. 遅延ロード + キャッシュ戦略

**設計**: `ProjectContextManager`クラス

```
ProjectContextManager
├── getContext(projectRoot): Promise<ProjectContext>
├── loadingPromises: Map<string, Promise> // 重複ロード防止
└── contexts: Map<projectRoot, ProjectContext>
```

**ポイント**:

- プロジェクトごとにエンティティをキャッシュ
- Promise Mapで並行ロードリクエストを統合（重複ロード防止）
- 遅延ロードで初期化時間を短縮

### 3. 後方互換性のためのフォールバック

**設計**: 動的コンテキストが空の場合は初期化時のエンティティを使用

```typescript
// HoverProvider等で
const context = await this.contextManager.getContext(projectRoot);
const entityInfoMap = context.entityInfoMap.size > 0
  ? context.entityInfoMap
  : this.fallbackEntityInfoMap;
```

**ポイント**:

- 既存のプロジェクト（マーカーファイルなし）でも動作継続
- 新機能はオプトイン（マーカーファイルがあれば動的検出）

### 4. Optionsパラメータによる非破壊的拡張

**問題**: 既存関数のシグネチャを変更すると呼び出し元の修正が必要

**解決**: オプションオブジェクトパターン

```typescript
// Before
function provideHover(params: HoverParams): HoverResult;

// After - 既存呼び出しに影響なし
type HoverOptions = {
  projectRoot?: string;
  contextManager?: ProjectContextManager;
};

function provideHover(params: HoverParams, options?: HoverOptions): HoverResult;
```

## 実装ファイル一覧

### 新規作成

- `src/lsp/project/project_detector.ts` - プロジェクト検出ロジック
- `src/lsp/project/project_context_manager.ts` - コンテキスト管理

### 変更

- `src/lsp/server/server.ts` - 検出器・管理器の統合
- `src/lsp/providers/hover_provider.ts` - optionsパラメータ追加

### テスト

- `tests/lsp/project/project_detector_test.ts`
- `tests/lsp/project/project_context_manager_test.ts`
- `tests/lsp/multi_project_integration_test.ts`
- `tests/lsp/multi_project_e2e_test.ts`

## 今後の適用場面

### この教訓が適用可能なケース

1. **他のmonorepoツール開発時**
   - マーカーファイルベースのプロジェクト検出は汎用的
   - 遅延ロード + キャッシュパターンは再利用可能

2. **LSP機能追加時**
   - optionsパラメータパターンで後方互換性維持
   - `getContext(projectRoot)`でプロジェクト固有データ取得

3. **パフォーマンス最適化が必要な場合**
   - Promise Mapによる重複リクエスト統合
   - キャッシュによる再計算回避

## TDDアプローチ

- 402テストを維持しつつ新機能追加
- 単体テスト（project_detector_test.ts）でロジック検証
- 統合テスト（multi_project_integration_test.ts）で連携確認
- E2Eテスト（multi_project_e2e_test.ts）でシナリオ検証

## 学んだこと

1. **エディタとLSPの責務分離を理解する**
   - エディタはプロセス管理（root_pattern）
   - LSPは動的コンテキスト管理（ファイルごと）

2. **キャッシュ戦略の重要性**
   - ファイルシステム探索は高コスト
   - キャッシュで実用的なパフォーマンスを実現

3. **後方互換性の設計**
   - フォールバックで既存ユーザーに影響なし
   - 新機能はオプトイン方式
