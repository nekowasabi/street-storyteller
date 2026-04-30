package manifest

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"

	apperrors "github.com/takets/street-storyteller/internal/errors"
)

// ManifestFileName は project root に置かれる manifest ファイル名。
//
// Why: ハードコード文字列をパッケージ定数として一箇所に集約。TS 側
// (`src/application/migration_facilitator.ts`) と同じ値で揃えており、
// 将来 rename する際の grep 単位を 1 つに保つ。
const ManifestFileName = ".storyteller.json"

// 既定パス。manifest が paths を省略した / 一部しか指定していない場合の
// fallback として用いる。
//
// Why: TS 側のサンプル (samples/cinderella, samples/momotaro,
// samples/mistery/old-letter-mystery) は version しか持たず、エンティティの
// ディレクトリは慣習的に `src/<entity>` に置かれている。Go 側でも同じ
// 慣習を defaulting で具現化することで、最小 manifest からそのまま動く
// プロジェクトレイアウトを保てる。
const (
	defaultCharactersPath     = "src/characters"
	defaultSettingsPath       = "src/settings"
	defaultForeshadowingsPath = "src/foreshadowings"
	defaultTimelinesPath      = "src/timelines"
	defaultPlotsPath          = "src/plots"
	defaultManuscriptsPath    = "manuscripts"
)

// Manifest は `.storyteller.json` の論理表現。
//
// Why: JSON tag を直接置かず、専用 DTO (rawManifest) → Manifest の二段構成にした。
// 理由は (1) JSON shape の進化 (rename / 移動) を Manifest API から分離する、
// (2) defaulting / validation を一箇所 (decode 関数) に集約する、(3) 呼び出し側
// から見ると "tag が無い素直な struct" として扱えるため。
type Manifest struct {
	// Version は manifest のスキーマ世代。必須。
	Version string
	// Project はプロジェクトのメタ情報。任意 (省略時はゼロ値)。
	Project ProjectInfo
	// Paths は entity ディレクトリへの相対パス群。未指定フィールドは
	// 既定値で埋められる。
	Paths PathConfig
}

// ProjectInfo は manifest の "project" セクション。
type ProjectInfo struct {
	Name        string
	Description string
}

// PathConfig は entity ディレクトリへの相対パス。基準は project root。
type PathConfig struct {
	Characters     string
	Settings       string
	Foreshadowings string
	Timelines      string
	Plots          string
	Manuscripts    string
}

// rawManifest は JSON decode 用の中間表現。
//
// Why: ポインタフィールドにすることで「未指定」と「空文字列指定」を
// 区別できる。empty 文字列を意図的に書くプロジェクトは想定しないが、
// 将来 validate を厳格化したくなった時に区別が活きる。今は単純化のため
// 空文字も「未指定」と同等に扱い defaulting する。
type rawManifest struct {
	Version *string         `json:"version"`
	Project *rawProjectInfo `json:"project"`
	Paths   *rawPathConfig  `json:"paths"`
}

type rawProjectInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type rawPathConfig struct {
	Characters     string `json:"characters"`
	Settings       string `json:"settings"`
	Foreshadowings string `json:"foreshadowings"`
	Timelines      string `json:"timelines"`
	Plots          string `json:"plots"`
	Manuscripts    string `json:"manuscripts"`
}

// Load は projectRoot 直下の `.storyteller.json` を読み込み Manifest を返す。
//
// projectRoot は絶対パスでも相対パスでも構わない (filepath.Join に委ねる)。
// 戻り値の error は常に *errors.Error で、Code は以下のいずれか:
//   - CodeNotFound: manifest ファイルが存在しない
//   - CodeIO:       読み込み中に I/O エラー
//   - CodeManifestInvalid: JSON 不正 / 必須フィールド欠落
func Load(projectRoot string) (*Manifest, error) {
	path := filepath.Join(projectRoot, ManifestFileName)

	data, err := os.ReadFile(path)
	if err != nil {
		// Why: errors.Is(err, fs.ErrNotExist) で missing を分岐し、
		// それ以外は I/O 系として CodeIO に集約する。Hints は
		// "次に何をすべきか" を 1 アクション分だけ提示するに留める。
		if errors.Is(err, fs.ErrNotExist) {
			return nil, apperrors.
				Wrap(err, apperrors.CodeNotFound, "manifest not found at "+path).
				WithHints(
					"run `storyteller init` to create a new project manifest",
					"verify the working directory is a storyteller project root",
				)
		}
		return nil, apperrors.
			Wrap(err, apperrors.CodeIO, "failed to read manifest at "+path).
			WithHints("check filesystem permissions for " + path)
	}

	m, err := decode(data)
	if err != nil {
		return nil, err
	}
	return m, nil
}

// LoadFromBytes は manifest の JSON バイト列を直接パースする。
// テストや stdin / network 経由で manifest を受け取る経路向け。
func LoadFromBytes(data []byte) (*Manifest, error) {
	return decode(data)
}

// decode は []byte → Manifest の中核ロジック。
//
// Why: Load / LoadFromBytes の共通処理を 1 箇所にまとめることで、defaulting と
// validation の責務分離を保つ。Load はファイル取得、decode はパースと整形。
func decode(data []byte) (*Manifest, error) {
	var raw rawManifest
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, apperrors.
			Wrap(err, apperrors.CodeManifestInvalid, "manifest JSON is malformed").
			WithHints(
				"validate the file with `jq . .storyteller.json`",
				"ensure the file is UTF-8 encoded JSON",
			)
	}

	if raw.Version == nil || *raw.Version == "" {
		return nil, apperrors.
			New(apperrors.CodeManifestInvalid, "manifest is missing required field 'version'").
			WithHints(
				"add `\"version\": \"1.0.0\"` to .storyteller.json",
				"see docs/manifest.md for the current schema",
			)
	}

	m := &Manifest{
		Version: *raw.Version,
		Paths:   defaultPathConfig(),
	}
	if raw.Project != nil {
		m.Project = ProjectInfo{
			Name:        raw.Project.Name,
			Description: raw.Project.Description,
		}
	}
	if raw.Paths != nil {
		m.Paths = mergePathConfig(m.Paths, *raw.Paths)
	}
	return m, nil
}

// defaultPathConfig は PathConfig の既定値を返す。
func defaultPathConfig() PathConfig {
	return PathConfig{
		Characters:     defaultCharactersPath,
		Settings:       defaultSettingsPath,
		Foreshadowings: defaultForeshadowingsPath,
		Timelines:      defaultTimelinesPath,
		Plots:          defaultPlotsPath,
		Manuscripts:    defaultManuscriptsPath,
	}
}

// mergePathConfig は base に override の非空フィールドだけを上書きする。
//
// Why: 「指定されたフィールドだけ既定値を置き換える」セマンティクスを
// 単一関数に集約。空文字列は「未指定」と同義として扱い、誤って空文字を
// 書いてしまった場合でも既定値が残る安全側に倒す。
func mergePathConfig(base PathConfig, override rawPathConfig) PathConfig {
	if override.Characters != "" {
		base.Characters = override.Characters
	}
	if override.Settings != "" {
		base.Settings = override.Settings
	}
	if override.Foreshadowings != "" {
		base.Foreshadowings = override.Foreshadowings
	}
	if override.Timelines != "" {
		base.Timelines = override.Timelines
	}
	if override.Plots != "" {
		base.Plots = override.Plots
	}
	if override.Manuscripts != "" {
		base.Manuscripts = override.Manuscripts
	}
	return base
}
