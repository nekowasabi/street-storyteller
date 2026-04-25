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
// Why: Each TS field is `string | { file: string }`. Wave-A2-pre lifts this
// into the shared StringOrFileRef helper. Pointer semantics preserved so each
// field can express three states:
//   - nil                       : field absent
//   - &{Value: "x"}             : inline literal text
//   - &{File: "p"}              : reference to an external markdown file
type SettingDetails struct {
	Description *StringOrFileRef
	Geography   *StringOrFileRef
	History     *StringOrFileRef
	Culture     *StringOrFileRef
	Politics    *StringOrFileRef
	Economy     *StringOrFileRef
	Inhabitants *StringOrFileRef
	Landmarks   *StringOrFileRef
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
