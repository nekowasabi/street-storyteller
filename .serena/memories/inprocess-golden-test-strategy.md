# In-process golden test 戦略 (os/exec sandbox 回避)

## カテゴリ

テスト戦略

## 重要度

high

## 作成日

2026-04-26

## ソース

mission-20260426-084012-2746861-005 (Process 04 CLI Go 移行)

## 教訓内容

CLI Golden test を os/exec ベースで書くと subagent サンドボックスで block
される。代わりに CLI の Run 関数を直接呼ぶ in-process 方式を採用する。

### 実装パターン

```go
// cli.Run(ctx, args, cli.Deps{Stdout: &buf, ...}) を直接呼ぶ
func runMain(t *testing.T, args []string) (string, int) {
    var buf bytes.Buffer
    code := cli.Run(context.Background(), args, cli.Deps{Stdout: &buf, Stderr: io.Discard})
    return buf.String(), code
}
```

### testdata 管理

- `testdata/golden/{name}.txt` に期待値を保存
- `-update` flag で期待値を自動更新可能

### 利点

- env 差異の影響を受けない
- サンドボックス制約 (os/exec 禁止) を回避できる
- CI でも安定して動作する

### ファイル参照

- `cmd/storyteller/main.go:15-23`
- `cmd/storyteller/golden_test.go:60-105`

## 適用すべき場面

- CLI コマンドの golden test を subagent 環境で実装するとき
- os/exec が制限されている CI/sandbox 環境

## 関連教訓

- subagent-sandbox-go-deny (sandbox 制約の背景)
