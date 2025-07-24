#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { initializeTaskStore } from "./lib/env.js";
import { TaskExampleStorage } from "./lib/storage-interface.js";
import {
  handleSuggestIssues,
  handleSaveTaskExample,
  handleIndexNotion,
} from "./lib/mcp.js";
import {
  Tools,
  toolToMcp,
  getToolByName,
  type ToolName,
  type SuggestIssuesInput,
  type SaveTaskExampleInput,
  IndexNotionInput,
} from "./schemas.js";

// Initialize task storage
const taskStore: TaskExampleStorage = initializeTaskStore();

const server = new Server(
  {
    name: "vibe-all-coding",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools - convert Zod schemas to MCP format
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Tools.map(toolToMcp),
  };
});

// Handle tool calls with type-safe routing
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Type-safe tool lookup
  const toolName = name as ToolName;
  const tool = getToolByName(toolName);

  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
  }

  // Validate input with the tool's Zod schema
  const validatedArgs = tool.inputSchema.parse(args);

  // Route to appropriate handler with exhaustive matching
  switch (tool.name) {
    case "suggest_issues":
      return await handleSuggestIssues(
        validatedArgs as SuggestIssuesInput,
        taskStore
      );

    case "save_task_example":
      return await handleSaveTaskExample(
        validatedArgs as SaveTaskExampleInput,
        taskStore
      );
    case "index_notion":
      return await handleIndexNotion(validatedArgs as IndexNotionInput);

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vibe All Coding MCP server running on stdio");
}

main().catch(console.error);
