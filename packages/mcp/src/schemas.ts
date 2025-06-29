import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Define tools as Zod schemas with metadata
export const SuggestIssuesTool = {
  name: "suggest_issues" as const,
  description: "Break down a task or feature request into actionable issues",
  inputSchema: z.object({
    taskDescription: z.string().min(1, "Task description is required"),
    context: z.string().optional().default(""),
  }),
} as const;

export const SaveTaskExampleTool = {
  name: "save_task_example" as const,
  description: "Save a task example with context and issues for future reference",
  inputSchema: z.object({
    task: z.string().min(1, "Task is required"),
    context: z.string().min(1, "Context is required"),
    issues: z.string().min(1, "Issues are required"),
  }),
} as const;

export const SearchNotionTool = {
  name: "search_notion" as const,
  description: "Search through indexed Notion pages. Creates index on first use if not exists.",
  inputSchema: z.object({
    query: z.string().min(1, "Search query is required"),
    notionToken: z.string().min(1, "Notion token is required"),
  }),
} as const;

// Create union of all tools
export const Tools = [SuggestIssuesTool, SaveTaskExampleTool, SearchNotionTool] as const;

// Helper to convert tool to MCP format
export function toolToMcp(tool: typeof SuggestIssuesTool | typeof SaveTaskExampleTool | typeof SearchNotionTool) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.inputSchema, { target: "jsonSchema7" }),
  };
}

// Type-safe tool name union
export type ToolName = typeof Tools[number]["name"];

// Get tool by name with type safety
export function getToolByName<T extends ToolName>(name: T) {
  return Tools.find(tool => tool.name === name) as Extract<typeof Tools[number], { name: T }>;
}

// Inferred input types
export type SuggestIssuesInput = z.infer<typeof SuggestIssuesTool.inputSchema>;
export type SaveTaskExampleInput = z.infer<typeof SaveTaskExampleTool.inputSchema>;
export type SearchNotionInput = z.infer<typeof SearchNotionTool.inputSchema>;
