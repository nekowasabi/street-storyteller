package tools

import "github.com/takets/street-storyteller/internal/domain"

// These wire structs follow src/type/v2/plot.ts. Keeping them local avoids
// changing domain-wide serialization while making MCP scaffolds usable as
// project source. Optional fields not supplied by these tools are omitted.
type plotScaffold struct {
	ID      string             `json:"id"`
	Name    string             `json:"name"`
	Type    domain.PlotType    `json:"type"`
	Status  domain.PlotStatus  `json:"status"`
	Summary string             `json:"summary"`
	Beats   []plotBeatScaffold `json:"beats"`
}

type plotBeatScaffold struct {
	ID                string                   `json:"id"`
	Title             string                   `json:"title"`
	Summary           string                   `json:"summary"`
	StructurePosition domain.StructurePosition `json:"structurePosition"`
}

type plotIntersectionScaffold struct {
	ID                 string                    `json:"id"`
	SourcePlotID       string                    `json:"sourcePlotId"`
	SourceBeatID       string                    `json:"sourceBeatId"`
	TargetPlotID       string                    `json:"targetPlotId"`
	TargetBeatID       string                    `json:"targetBeatId"`
	Summary            string                    `json:"summary"`
	InfluenceDirection domain.InfluenceDirection `json:"influenceDirection"`
	InfluenceLevel     *domain.InfluenceLevel    `json:"influenceLevel,omitempty"`
}
