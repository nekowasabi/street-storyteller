# Requirements Document

## Introduction
Street StorytellerのPhase 0では、将来の機能拡張を支えるCLI基盤を整備し、`storyteller`コマンドをグローバルに配布できる状態にする必要がある。本仕様は、バイナリ配布・コマンド構造・補完・ヘルプ・設定管理の各観点から、開発者と執筆者の体験を一貫して向上させる要求事項を定義する。

## Requirements

### Requirement 1: CLIバイナリのビルドと配布
**Objective:** As a コア開発者, I want Storyteller CLIをビルド・インストールできるようにしたいので、どの環境でも一貫した実行体験を提供できる。

#### Acceptance Criteria
1. WHEN 開発者が`deno task build`を実行すると THEN Storyteller CLI基盤 SHALL 指定された出力先にスタンドアロンバイナリ`storyteller`を生成し、必要な実行権限を付与する。
2. WHEN ユーザーが`./install.sh`を実行すると THEN Storyteller CLI基盤 SHALL Denoインストールの有無を検証し、バイナリと補完ファイルを既定のインストール先に配置した上でPATH追加手順を案内する。
3. IF ユーザーがインストールスクリプトにカスタム出力先を指定した場合 THEN Storyteller CLI基盤 SHALL そのパスにバイナリを配置し、既定先との差分をログに記録する。
4. WHEN ユーザーが`./uninstall.sh`を実行すると THEN Storyteller CLI基盤 SHALL インストール済みバイナリと補完ファイルを安全に削除し、環境設定の手動クリーンアップ手順を表示する。

### Requirement 2: 拡張可能なコマンド構造
**Objective:** As a CLIアーキテクト, I want コマンド登録とディスパッチをモジュール化したいので、将来のサブコマンド追加を既存コード変更なしで行えるようにする。

#### Acceptance Criteria
1. WHEN Storyteller CLI基盤が起動すると THEN Storyteller CLI基盤 SHALL Command Registryを初期化し、自己登録型モジュールから`generate`などの既定コマンドを解決可能にする。
2. IF コマンドモジュールが重複するコマンド名を登録しようとした場合 THEN Storyteller CLI基盤 SHALL 初期化時にエラーを報告し非ゼロ終了コードで停止する。
3. WHEN 未登録のコマンド名で実行要求を受けると THEN Storyteller CLI基盤 SHALL 利用可能なコマンド一覧と`storyteller help`の利用方法を出力して終了する。
4. IF 新しいモジュールが規定の拡張ポイントに従って追加された場合 THEN Storyteller CLI基盤 SHALL 既存のCLIエントリポイントを編集せずにコマンドを利用可能な状態で読み込む。

### Requirement 3: シェル補完体験
**Objective:** As a CLI利用者, I want Zsh/Bash補完を利用したいので、コマンドやオプションを暗記せずに素早く操作できる。

#### Acceptance Criteria
1. WHEN ユーザーがZsh環境で`storyteller <TAB>`を入力すると THEN Storyteller CLI基盤 SHALL トップレベルコマンド（`generate`、`help`など）を補完候補として提示する。
2. WHEN ユーザーがBash環境で補完スクリプトを読み込むと THEN Storyteller CLI基盤 SHALL 同等のトップレベルおよびサブコマンド補完候補を提供する。
3. IF プロジェクト内にテンプレート識別子や要素名が存在する場合 THEN Storyteller CLI基盤 SHALL 補完候補に該当する値を動的に含める。
4. WHEN 補完ファイルが再インストールされると THEN Storyteller CLI基盤 SHALL 既存ファイルを安全に上書きし、必要に応じてシェル設定の再読み込み手順を案内する。

### Requirement 4: ヘルプおよびエラーメッセージ
**Objective:** As a 利用者, I want 状況に応じたヘルプとエラー説明を得たいので、CLI操作中の迷いと再試行コストを減らしたい。

#### Acceptance Criteria
1. WHEN ユーザーが`storyteller help`を実行すると THEN Storyteller CLI基盤 SHALL 利用可能なコマンド一覧、説明、主要オプション、サンプル使用例をセクション化して表示する。
2. IF ユーザーがサブコマンドに`--help`を付与した場合 THEN Storyteller CLI基盤 SHALL そのサブコマンド固有のオプション説明と典型的な使用例を出力する。
3. WHEN ユーザーが無効な引数または不足した必須オプションでコマンドを実行すると THEN Storyteller CLI基盤 SHALL 問題点と修正方法を含むエラー文と共に終了コード1を返す。
4. WHERE CLIがファイルシステム操作に失敗した場合 THEN Storyteller CLI基盤 SHALL 原因、影響、および再試行に必要な権限確認手順を含むメッセージを表示する。

### Requirement 5: 設定管理
**Objective:** As a パワーユーザー, I want グローバルとプロジェクト単位で設定を管理したいので、環境に応じた動作を柔軟に切り替えられる。

#### Acceptance Criteria
1. WHEN CLIが`~/storyteller.json`を検出すると THEN Storyteller CLI基盤 SHALL グローバル設定を読み込み、デフォルトのテンプレートや出力先を初期化する。
2. WHEN CLIがカレントプロジェクトの`storyteller.json`を検出すると THEN Storyteller CLI基盤 SHALL グローバル設定を上書きする優先度でプロジェクト設定を適用する。
3. IF 関連する環境変数が設定されている場合 THEN Storyteller CLI基盤 SHALL 設定ファイルより高い優先度で値を適用し、実際に使用した値をヘルプまたはログ出力で確認できるようにする。
4. WHILE CLIが設定値を参照している間 THE Storyteller CLI基盤 SHALL 不正な設定項目を検知した際にデフォルトへフォールバックし、警告メッセージを出力する。
