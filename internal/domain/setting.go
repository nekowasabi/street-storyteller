package domain

// SettingType enumerates the kind of a Setting entity.
//
// Why: TS source defines a string literal union ("location" | "world" |
// "culture" | "organization"). A string-typed const enum preserves the wire
// value when (de)serializing JSON and keeps switch statements exhaustive at
// review time without pulling in a third-party enum library.
type SettingType string

const (
	SettingTypeLocation     SettingType = "location"
	SettingTypeWorld        SettingType = "world"
	SettingTypeCulture      SettingType = "culture"
	SettingTypeOrganization SettingType = "organization"
)

// SettingDetails captures optional long-form descriptions for a Setting.
//
// Why: Each TS field is `string | { file: string }`. We model that union as
// an inline anonymous struct pointer so callers can express three states:
//   - nil          : field absent
//   - {Value: "x"} : inline literal text
//   - {File: "p"}  : reference to an external markdown file
//
// Wave-A2 will likely lift this into a shared StringOrFileRef helper across
// Character / Setting / Foreshadowing once the union appears in more places.
type SettingDetails struct {
	Description *struct {
		Value string
		File  string
	}
	Geography *struct {
		Value string
		File  string
	}
	History *struct {
		Value string
		File  string
	}
	Culture *struct {
		Value string
		File  string
	}
	Politics *struct {
		Value string
		File  string
	}
	Economy *struct {
		Value string
		File  string
	}
	Inhabitants *struct {
		Value string
		File  string
	}
	Landmarks *struct {
		Value string
		File  string
	}
}

// SettingDetectionHints provides LSP detection tuning data.
type SettingDetectionHints struct {
	CommonPatterns  []string
	ExcludePatterns []string
	Confidence      float64
}

// Setting is the Go representation of `src/type/v2/setting.ts:Setting`.
//
// Required metadata is held by value; optional fields use either pointer
// (scalar / nested struct) or nil-slice convention.
type Setting struct {
	// Required metadata.
	ID                string
	Name              string
	Type              SettingType
	AppearingChapters []string
	Summary           string

	// Optional fields.
	DisplayNames    []string
	Details         *SettingDetails
	RelatedSettings []string
	DetectionHints  *SettingDetectionHints
}
