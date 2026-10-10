# MCP lsp_validate vs CLI (Go 実装の現状)

| 項目 | 状態 |
| ---- | ---- |
| 診断生成経路 | CLI/MCP とも ValidateService + StorytellerSource を共有 |
| confidence / entityId | 対応済み。MCP の Diagnostic.data にある |
| 行番号 | CLI は 1 始まり、MCP(LSP) は 0 始まり（仕様） |
| 閾値 | CLI --severity（下限フィルタ）と LSP/MCP の帯は別概念として意図的に分離 |
| --strict / summary | MCP には無い（未要望） |
