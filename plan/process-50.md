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
- [ ] ブリーフィング確認
- [ ] install.sh dry-run
- [ ] release.yml の workflow_dispatch で手動テスト

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] install.sh 実装
- [ ] release.yml 実装
- [ ] テストタグでフルリリース実施
- [ ] curl install → version 表示確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] Homebrew formula 公開
- [ ] checksum / signature 自動検証スクリプト
- [ ] uninstall.sh 提供

✅ **Phase Complete**

---

## Dependencies
- Requires: 12, 100, 101
- Blocks: 200
