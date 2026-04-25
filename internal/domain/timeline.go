package domain

// Timeline / TimelineEvent / TimePoint mirror src/type/v2/timeline.ts.
// Bundled in one file because TimelineEvent only ever exists inside Timeline,
// and the LSP cache walks them together — splitting per type would force
// circular imports for shared enum constants.

// TimelineScope enumerates the four timeline scopes from timeline.ts.
//
// Why: typed string instead of int — preserves wire-format parity with the
// existing TS YAML/JSON snapshots without extra (Un)Marshal hooks.
type TimelineScope string

const (
	TimelineScopeStory     TimelineScope = "story"
	TimelineScopeWorld     TimelineScope = "world"
	TimelineScopeCharacter TimelineScope = "character"
	TimelineScopeArc       TimelineScope = "arc"
)

// EventCategory enumerates timeline event categories. Values mirror TS
// `EventCategory` in src/type/v2/timeline.ts.
type EventCategory string

const (
	EventCategoryPlotPoint      EventCategory = "plot_point"
	EventCategoryCharacterEvent EventCategory = "character_event"
	EventCategoryWorldEvent     EventCategory = "world_event"
	EventCategoryBackstory      EventCategory = "backstory"
	EventCategoryForeshadow     EventCategory = "foreshadow"
	EventCategoryClimax         EventCategory = "climax"
	EventCategoryResolution     EventCategory = "resolution"
)

// EventImportance ranks how central an event is to the narrative.
type EventImportance string

const (
	EventImportanceMajor      EventImportance = "major"
	EventImportanceMinor      EventImportance = "minor"
	EventImportanceBackground EventImportance = "background"
)

// TimePoint anchors an event in narrative time. Order is required; the rest
// stay optional via pointer so a zero TimePoint is valid.
type TimePoint struct {
	// Required: relative ordering within the parent timeline.
	Order int `json:"order"`

	// Optional display / linkage metadata.
	Label   *string `json:"label,omitempty"`
	Date    *string `json:"date,omitempty"`
	Chapter *string `json:"chapter,omitempty"`
}

// PhaseChangeInfo records a character phase transition triggered by an event.
type PhaseChangeInfo struct {
	CharacterID string  `json:"characterId"`
	ToPhaseID   string  `json:"toPhaseId"`
	FromPhaseID *string `json:"fromPhaseId,omitempty"`
	Description *string `json:"description,omitempty"`
}

// TimelineEventDetails carries optional long-form fields that may live inline
// or be split out into Markdown via the shared StringOrFileRef helper.
type TimelineEventDetails struct {
	Description *StringOrFileRef `json:"description,omitempty"`
	Impact      *StringOrFileRef `json:"impact,omitempty"`
	Notes       *StringOrFileRef `json:"notes,omitempty"`
}

// TimelineEventDetectionHints feeds the LSP detector with patterns specific
// to this event.
type TimelineEventDetectionHints struct {
	CommonPatterns  []string `json:"commonPatterns"`
	ExcludePatterns []string `json:"excludePatterns"`
	Confidence      float64  `json:"confidence"`
}

// TimelineEvent is one beat on a timeline. Cross-entity references
// (Characters, Settings, Chapters, CausedBy, Causes) stay as string IDs to
// keep the domain package free of inter-entity pointer cycles.
type TimelineEvent struct {
	// ----- required metadata -----
	ID         string        `json:"id"`
	Title      string        `json:"title"`
	Category   EventCategory `json:"category"`
	Time       TimePoint     `json:"time"`
	Summary    string        `json:"summary"`
	Characters []string      `json:"characters"`
	Settings   []string      `json:"settings"`
	Chapters   []string      `json:"chapters"`

	// ----- optional fields -----
	CausedBy       []string                     `json:"causedBy,omitempty"`
	Causes         []string                     `json:"causes,omitempty"`
	Importance     *EventImportance             `json:"importance,omitempty"`
	EndTime        *TimePoint                   `json:"endTime,omitempty"`
	DisplayNames   []string                     `json:"displayNames,omitempty"`
	Details        *TimelineEventDetails        `json:"details,omitempty"`
	DetectionHints *TimelineEventDetectionHints `json:"detectionHints,omitempty"`
	PhaseChanges   []PhaseChangeInfo            `json:"phaseChanges,omitempty"`
}

// TimelineDetails carries optional long-form Timeline fields.
type TimelineDetails struct {
	Background *StringOrFileRef `json:"background,omitempty"`
	Notes      *StringOrFileRef `json:"notes,omitempty"`
}

// TimelineDetectionHints feeds the LSP detector with patterns for the
// timeline label itself.
type TimelineDetectionHints struct {
	CommonPatterns  []string `json:"commonPatterns"`
	ExcludePatterns []string `json:"excludePatterns"`
	Confidence      float64  `json:"confidence"`
}

// TimelineDisplayOptions controls UI rendering hints from timeline.ts.
type TimelineDisplayOptions struct {
	ShowRelations *bool   `json:"showRelations,omitempty"`
	ColorScheme   *string `json:"colorScheme,omitempty"`
	Collapsed     *bool   `json:"collapsed,omitempty"`
}

// Timeline is the container for an ordered list of TimelineEvents within a
// given Scope. Parent / child links and RelatedCharacter remain string IDs
// so the LSP cache can resolve them lazily.
type Timeline struct {
	// ----- required metadata -----
	ID      string          `json:"id"`
	Name    string          `json:"name"`
	Scope   TimelineScope   `json:"scope"`
	Summary string          `json:"summary"`
	Events  []TimelineEvent `json:"events"`

	// ----- optional fields -----
	ParentTimeline   *string                 `json:"parentTimeline,omitempty"`
	ChildTimelines   []string                `json:"childTimelines,omitempty"`
	RelatedCharacter *string                 `json:"relatedCharacter,omitempty"`
	DisplayNames     []string                `json:"displayNames,omitempty"`
	DisplayOptions   *TimelineDisplayOptions `json:"displayOptions,omitempty"`
	Details          *TimelineDetails        `json:"details,omitempty"`
	DetectionHints   *TimelineDetectionHints `json:"detectionHints,omitempty"`
}
