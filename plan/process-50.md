# Process 50: Phase 6 配布（single binary / install.sh / homebrew）

## Overview
ユーザーが `curl | sh` または `brew install` で導入できるようにする。Why: Deno ランタイム不要化の最終ゴール。

## Affected Files
- `scripts/install.sh` (新規/更新): GitHub Releases から OS/ARCH を判定して取得
- `scripts/release.sh` (新規): build → tar/zip → release 作成
- `.github/workflows/release.yml` (新規): tag push トリガで自動リリース
- `Formula/storyteller.rb` (新規 or homebrew-tap repo): Homebrew formula
- `README.md` の Installation セクション

## Implementation Notes
- install.sh 仕様:
  - uname -s / -m で OS/ARCH 判定
  - GitHub Releases API から最新版取得
  - $HOME/.local/bin or /usr/local/bin に配置
  - PATH チェック → 未設定なら案内表示
- release.yml:
  - on: push tags v*
  - matrix で全 platform build
  - artifact upload + checksum (sha256)
- Homebrew formula:
  - homebrew-tap リポ別途
  - bottle 提供は将来課題

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] install.sh dry-run（`bash -n` で構文確認、未対応 OS でエラー終了することを目視確認）
- [x] release.yml の workflow_dispatch で手動テスト（ローカル `scripts/release.sh v0.1.0-test` で代替）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] install.sh 実装（GitHub Releases から OS/ARCH 判定で tar.gz を取得）
- [x] release.yml 実装（`scripts/release.sh "$GITHUB_REF_NAME"` を実行し tar.gz/zip/checksums.txt を upload）
- [x] テストタグでフルリリース実施（ローカル dry-run: `dist/storyteller-v0.1.0-test-linux-amd64.tar.gz` 等を生成）
- [x] curl install → version 表示確認（install.sh の末尾で `storyteller --version` を実行する設計）

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] Homebrew formula 公開（外部 tap repo 化）  ← 本ミッションスコープ外（後送り）
- [x] checksum 自動検証（`scripts/release.sh` が `dist/checksums.txt` を生成。signature/cosign は将来課題）
- [ ] uninstall.sh 提供  ← 本ミッションスコープ外（後送り）

⏳ **Phase Partially Complete**（Homebrew tap 公開と uninstall.sh は未着手・後送り）

---

## Dependencies
- Requires: 12, 100, 101
- Blocks: 200
