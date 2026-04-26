# JSON-RPC ResponseError には Error() メソッド必須

## カテゴリ

共有契約レビューポイント

## 重要度

medium

## 作成日

2026-04-26

## ソース

mission-20260426-084012-2746861-005 (Process 05 LSP/MCP adapter 分離)

## 教訓内容

LSP/MCP の `*protocol.ResponseError` を error interface 値として返却するためには
`Error() string` メソッドが必要。Wave-pre で types.go
を作るときに見落としやすい。

### 実装パターン

```go
func (e *ResponseError) Error() string {
    return fmt.Sprintf("jsonrpc error %d: %s", e.Code, e.Message)
}
```

### 参考

- gopls の jsonrpc2 ライブラリも同パターンを採用

### Wave-pre checklist 追記事項

types.go に Error() を追加することを Wave-pre checklist
の必須項目として記録する。

## 適用すべき場面

- Wave-A3 の wave-pre フェーズで types.go / protocol.go を作成するとき
- ResponseError 型を error interface として扱いたいとき

## 関連教訓

- wave-a3-pattern (wave-pre checklist)
