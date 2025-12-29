# Deno テスト権限に関する教訓

## 背景

2025-12-29に238件のテスト失敗を修正した際に得られた教訓。

## 問題1: テスト実行時の権限不足

### 症状

- `NotCapable: Requires write access to <TMP>` エラー
- `NotCapable: Requires env access to "HOME"` エラー
- テストファイル自体は正しいが、権限フラグ不足で失敗

### 原因

`deno.json`の`test`タスクで個別権限を指定していたが、一部のAPIで不足していた：

```json
"test": "deno test --allow-write --allow-read --allow-net --allow-run --allow-env"
```

特に問題となったAPI：

- `Deno.makeTempDir()`: `--allow-write`だけでは`<TMP>`への書き込みが許可されない
- `Deno.env.get()`: テスト定義時のトップレベル評価で権限エラー

### 解決策

テストタスクには`-A`（全権限）を使用する：

```json
"test": "deno test -A"
```

### ベストプラクティス

1. **開発中のテストは`-A`を使う**:
   テスト自体の問題か権限の問題かを切り分けやすい
2. **CI/CDでは最小権限を検討**: セキュリティが重要な場合は明示的に指定
3. **新しいDenoAPIを使う際は権限を確認**: 特に`<TMP>`, `<CWD>`,
   `<HOME>`などの特殊パス

## 問題2: テスト定義時のトップレベル評価

### 症状

```
(in promise) NotCapable: Requires env access to "HOME"
  ignore: !Deno.env.get("HOME")
```

テストファイル読み込み時にエラーが発生し、他のテストも巻き込んで失敗

### 原因

`Deno.test()`のオプション内で`Deno.env.get()`を直接呼び出していた：

```typescript
Deno.test({
  name: "Test Name",
  ignore: !Deno.env.get("HOME"),  // ← テスト定義時に評価される
  permissions: { env: ["HOME"] }, // ← この時点ではまだ適用されていない
}, async (t) => { ... });
```

### 解決策

try-catchでラップした即時実行関数を使用：

```typescript
Deno.test({
  name: "Test Name",
  ignore: (() => {
    try {
      return !Deno.env.get("HOME");
    } catch {
      return true; // 権限がない場合はスキップ
    }
  })(),
  permissions: { env: ["HOME"], read: true },
}, async (t) => { ... });
```

### ベストプラクティス

1. **テスト定義時のAPI呼び出しを避ける**: `ignore`や動的な値は関数でラップ
2. **権限エラーは適切にハンドリング**: catch節でスキップするのが安全
3. **`permissions`オプションはテスト実行時のみ有効**: 定義時には適用されない

## チェックリスト

新しいテストを追加する際：

- [ ] `Deno.makeTempDir()`を使う場合は`-A`または適切な権限を確認
- [ ] `Deno.env.get()`をテスト定義時に使わない（関数でラップ）
- [ ] `ignore`オプションで外部APIを呼ぶ場合はtry-catchでラップ
- [ ] CI/CDの権限設定を確認

## 関連ファイル

- `/home/takets/repos/street-storyteller/deno.json`: テストタスク定義
- `/home/takets/repos/street-storyteller/tests/integration/ui_integration_test.ts`:
  修正例
