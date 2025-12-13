# Requirements Document

## Introduction

Street Storytellerのアーキテクチャを再設計し、Issue
#7で求められているレイヤ化・依存逆転を実現する。TDDで安全に進化できる構造を整え、将来のCLI機能追加やAI/LSP連携を段階的に取り込めるようにするとともに、既存プロジェクトが新構造へ移行する際の破壊的変更を最小限に抑える。

## Requirements

### Requirement 1: モジュール化されたアーキテクチャ境界

**Objective:** As a CLIアーキテクト, I want Street
Storytellerコアを責務ごとに分離し、拡張ポイントを定義したいので、機能追加時に既存コードの改変を最小化できる。

#### Acceptance Criteria

1. WHEN 開発者が新しいCLI機能モジュールを追加すると THEN Street
   Storytellerアーキテクチャ SHALL
   既存ファイルの直接編集を伴わない登録インターフェースを提供する。
2. IF コマンド実装がドメインサービスにアクセスする必要がある場合 THEN Street
   Storytellerアーキテクチャ SHALL
   抽象インターフェース経由で依存性を解決できるようにする。
3. WHILE CLIコアが実行されている間 THE Street Storytellerアーキテクチャ SHALL
   I/O層とドメインロジック層を別モジュールとして維持する。
4. WHERE サンプル実装（`sample/`ディレクトリ）が参照される場合 THE Street
   Storytellerアーキテクチャ SHALL
   同一の拡張ポイントに沿ったコード例を提供する。

### Requirement 2: TDDを前提とした検証可能な開発フロー

**Objective:** As a コア開発者, I want
テスト駆動でアーキテクチャを進化させたいので、失敗しやすい箇所を早期に検出しリグレッションを防ぎたい。

#### Acceptance Criteria

1. WHEN 開発者が`deno test`を実行すると THEN Street Storytellerアーキテクチャ
   SHALL
   コマンド層・ドメイン層・インフラ層のテストスイートを個別に実行できるように構成する。
2. IF 新しいモジュールがテストスタブを未提供で登録される場合 THEN Street
   Storytellerアーキテクチャ SHALL CIで失敗を報告する構成手順を提示する。
3. WHEN テストが外部ファイルシステムにアクセスする必要がある場合 THEN Street
   Storytellerアーキテクチャ SHALL モック可能な抽象化を通じて副作用を隔離する。
4. WHILE 開発者がTDDサイクルを回している間 THE Street Storytellerアーキテクチャ
   SHALL サンプルの赤→緑→リファクタ手順をREADME系ドキュメントで提示する。

### Requirement 3: 既存プロジェクトの移行容易性

**Objective:** As a 既存ユーザー, I want
旧構成のプロジェクトを新アーキテクチャへ移行したいので、手作業を減らし互換性リスクを避けたい。

#### Acceptance Criteria

1. WHEN ユーザーが新バージョンの`storyteller generate`を実行すると THEN Street
   Storytellerアーキテクチャ SHALL
   旧テンプレートと互換なディレクトリ構造を維持しつつ新レイヤ用ファイルを追加する。
2. IF 既存プロジェクトに新しい設定ファイルが欠落している場合 THEN Street
   Storytellerアーキテクチャ SHALL
   自動移行コマンドかガイドを提示して不足分を補完する。
3. WHEN CLIが旧バージョンのプロジェクトを検出すると THEN Street
   Storytellerアーキテクチャ SHALL
   バージョン差分を通知し安全な移行手順をログに出力する。
4. WHERE マイグレーションガイドラインが参照される場合 THE Street
   Storytellerアーキテクチャ SHALL 後方互換性の制約と回避策を明示する。
