# サブプロット・ビート・インターセクション操作

## View系ツール

### サブプロット一覧表示
```bash
subplot_view --list              # 一覧
subplot_view --id {id}           # 個別表示
subplot_view --list --format mermaid  # Mermaid図出力
```

## Create系ツール

### subplot_create
- **分類**: WRITE（ユーザー承認必須）
- **用途**: 新規サブプロット作成
- **前提**: `storyteller://subplots` で既存サブプロットを先読み

### beat_create
- **分類**: WRITE（ユーザー承認必須）
- **用途**: サブプロットに beat 追加
- **前提**: `subplot_view --id {id}` で該当サブプロットを確認

### intersection_create
- **分類**: WRITE（ユーザー承認必須）
- **用途**: サブプロット間の交差点作成
- **前提**: `subplot_view --list` で関連サブプロットを確認

## Timeline vs Subplot 違い

| 観点 | Timeline | Subplot |
|---|---|---|
| 管理対象 | 「いつ」（時系列） | 「何」「どのように」（展開構造） |
| 単位 | Event | Beat |
| 関係性 | 因果関係（causes/causedBy） | 交差（intersection） |

- Timeline: 時間軸上の出来事を追跡
- Subplot: 物語ラインの展開・構造を追跡
