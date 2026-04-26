package protocol

// InitializeParams is the params shape for the "initialize" request.
type InitializeParams struct {
	ProtocolVersion string             `json:"protocolVersion"`
	Capabilities    ClientCapabilities `json:"capabilities"`
	ClientInfo      ClientInfo         `json:"clientInfo"`
}

// InitializeResult is the result shape returned for "initialize".
type InitializeResult struct {
	ProtocolVersion string             `json:"protocolVersion"`
	Capabilities    ServerCapabilities `json:"capabilities"`
	ServerInfo      ServerInfo         `json:"serverInfo"`
}

// ClientInfo identifies the connecting MCP client.
type ClientInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// ServerInfo identifies this MCP server.
type ServerInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
}

// ClientCapabilities is a placeholder for future capability negotiation.
type ClientCapabilities struct{}

// ServerCapabilities advertises which feature groups this server implements.
type ServerCapabilities struct {
	Tools     *ToolsCapability     `json:"tools,omitempty"`
	Resources *ResourcesCapability `json:"resources,omitempty"`
	Prompts   *PromptsCapability   `json:"prompts,omitempty"`
}

// ToolsCapability is a placeholder marker for "tools/*" support.
type ToolsCapability struct{}

// ResourcesCapability is a placeholder marker for "resources/*" support.
type ResourcesCapability struct{}

// PromptsCapability is a placeholder marker for "prompts/*" support.
type PromptsCapability struct{}

// ListToolsResult is the result shape for "tools/list".
type ListToolsResult struct {
	Tools []Tool `json:"tools"`
}

// ListResourcesResult is the result shape for "resources/list".
type ListResourcesResult struct {
	Resources []Resource `json:"resources"`
}

// ReadResourceParams is the params shape for "resources/read".
type ReadResourceParams struct {
	URI string `json:"uri"`
}

// ReadResourceResult is the result shape for "resources/read".
type ReadResourceResult struct {
	Contents []ResourceContent `json:"contents"`
}

// ResourceContent is a single content blob attached to a resource.
type ResourceContent struct {
	URI      string `json:"uri"`
	MimeType string `json:"mimeType,omitempty"`
	Text     string `json:"text,omitempty"`
}

// ListPromptsResult is the result shape for "prompts/list".
type ListPromptsResult struct {
	Prompts []Prompt `json:"prompts"`
}

// GetPromptParams is the params shape for "prompts/get".
type GetPromptParams struct {
	Name      string            `json:"name"`
	Arguments map[string]string `json:"arguments,omitempty"`
}

// GetPromptResult is the result shape for "prompts/get".
type GetPromptResult struct {
	Description string          `json:"description,omitempty"`
	Messages    []PromptMessage `json:"messages"`
}

// PromptMessage is one message in a prompt template.
type PromptMessage struct {
	Role    string       `json:"role"`
	Content ContentBlock `json:"content"`
}
