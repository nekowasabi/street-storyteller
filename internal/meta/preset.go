package meta

import (
	"sort"

	apperrors "github.com/takets/street-storyteller/internal/errors"
)

// PresetType はシーン種別を識別する文字列ベースの型。
//
// Why: int+iota ではなく string を採用。理由は (1) JSON / CLI 出力で値が
// 人間可読、(2) TS 側 src/domain/meta/preset_templates.ts の literal union
// (`"battle-scene" | ...`) と等値で往復翻訳できる、(3) 新 preset 追加が
// 単なる定数追加で済む。
type PresetType string

const (
	PresetBattleScene  PresetType = "battle-scene"
	PresetRomanceScene PresetType = "romance-scene"
	PresetDialogue     PresetType = "dialogue"
	PresetExposition   PresetType = "exposition"
)

// ValidationType は ValidationRule の分類タグ。TS 側 PresetValidationType と
// 同値を保つ。
type ValidationType string

const (
	ValidationCharacterPresence  ValidationType = "character_presence"
	ValidationSettingConsistency ValidationType = "setting_consistency"
	ValidationPlotAdvancement    ValidationType = "plot_advancement"
	ValidationCustom             ValidationType = "custom"
)

// ValidationRule は preset に紐づく単一の検証ルール。
//
// Why: Validate を string で保持するのは TS 側が関数本体を文字列として
// 提供しており、Go runtime ではこれを実行できないため。代替として
// 「Validate を Go 関数に変換する」案も検討したが、(1) TS / Go 双方の
// preset 定義を同期させる維持コストが高い、(2) process-05 で別途 Go 専用の
// validator 実装を行う計画があり、現段階ではミラーリングに留めるのが安全。
type ValidationRule struct {
	Type     ValidationType
	Validate string
	Message  string
}

// Preset は単一シーン向けの validation rule 集合。
type Preset struct {
	Type        PresetType
	Validations []ValidationRule
}

// presets は TS 側 PRESETS const のミラー。
//
// Why: JSON ファイル不在のため、TS const を Go const map に直接コピーした。
// 代替の「JSON ファイルから読み込む」案は (1) ビルド時に I/O が必要、
// (2) TS 側の SSOT が破壊される、ため不採用。
var presets = map[PresetType]Preset{
	PresetBattleScene: {
		Type: PresetBattleScene,
		Validations: []ValidationRule{
			{
				Type:     ValidationPlotAdvancement,
				Validate: "(content: string) => {\n          const hasBattle = content.includes(\"戦\") || content.includes(\"戦い\") || content.includes(\"剣\");\n          return hasBattle;\n        }",
				Message:  "戦闘シーンの要素（戦い/剣など）が不足しています",
			},
		},
	},
	PresetRomanceScene: {
		Type: PresetRomanceScene,
		Validations: []ValidationRule{
			{
				Type:     ValidationPlotAdvancement,
				Validate: "(content: string) => {\n          const hasRomance = content.includes(\"恋\") || content.includes(\"愛\") || content.includes(\"想い\");\n          return hasRomance;\n        }",
				Message:  "恋愛シーンの要素（恋/愛など）が不足しています",
			},
		},
	},
	PresetDialogue: {
		Type: PresetDialogue,
		Validations: []ValidationRule{
			{
				Type:     ValidationPlotAdvancement,
				Validate: "(content: string) => {\n          const hasDialogue = content.includes(\"「\") && content.includes(\"」\");\n          return hasDialogue;\n        }",
				Message:  "会話シーンの要素（「...」）が不足しています",
			},
		},
	},
	PresetExposition: {
		Type: PresetExposition,
		Validations: []ValidationRule{
			{
				Type:     ValidationPlotAdvancement,
				Validate: "(content: string) => {\n          // TODO: 説明・導入シーン向けの検証を追加してください\n          return true;\n        }",
				Message:  "導入（説明）シーンの検証を追加してください",
			},
		},
	},
}

// GetPreset は名称から Preset を取得する。未知の名称は CodeValidation エラー。
//
// Why: panic ではなく error 返却を選択。CLI / MCP どちらの呼び出し元も
// ユーザ入力起点で preset 名を渡すため、不明値は通常のバリデーション失敗
// として apperrors.CodeValidation で扱うのが自然。
func GetPreset(name PresetType) (Preset, error) {
	p, ok := presets[name]
	if !ok {
		return Preset{}, apperrors.New(apperrors.CodeValidation, "unknown preset: "+string(name))
	}
	return p, nil
}

// ListPresets は登録されている全 PresetType を alphabetical 順で返す。
//
// Why: map iteration order が非決定的なため、呼び出し元の安定性を担保する
// ために sort.Slice で明示ソートする。逆順や登録順を返す案もあったが、
// CLI 出力やテストの予測可能性を最優先して alphabetical を採用。
func ListPresets() []PresetType {
	keys := make([]PresetType, 0, len(presets))
	for k := range presets {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })
	return keys
}
