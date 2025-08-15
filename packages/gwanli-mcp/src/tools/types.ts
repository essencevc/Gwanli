// Common MCP response types
export interface McpContent {
  type: "text";
  text: string;
}

export interface McpResponse {
  content: McpContent[];
  isError?: boolean;
}

// Tool handler type
export type ToolHandler<T = any> = (args: T) => Promise<McpResponse>;
