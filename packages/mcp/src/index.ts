#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { generate_plan } from "./lib/plan.js";
import { ChromaTaskExampleStore } from "./lib/chroma.js";
import {
  Tools,
  toolToMcp,
  getToolByName,
  type ToolName,
  type SuggestIssuesInput,
  type SaveTaskExampleInput,
} from "./schemas.js";

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

// Initialize task example store
const taskStore = new ChromaTaskExampleStore();

// List available tools - convert Zod schemas to MCP format
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Tools.map(toolToMcp),
  };
});

// Handle tool calls with type-safe Zod validation
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Type-safe tool lookup
    const toolName = name as ToolName;
    const tool = getToolByName(toolName);
    
    if (!tool) {
      throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
    }

    // Validate input with the tool's Zod schema
    const validatedArgs = tool.inputSchema.parse(args);

    switch (tool.name) {
      case "suggest_issues": {
        const typedArgs = validatedArgs as SuggestIssuesInput;
        
        const plan = await generate_plan(typedArgs.taskDescription, typedArgs.context);

        if (plan.needsClarification) {
          return {
            content: [{ type: "text", text: plan.clarification_message }],
          };
        }

        if (plan.suggested_issues.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "Unable to generate issues. Please try again.",
              },
            ],
          };
        }

        const issuesText = plan.suggested_issues
          .map((issue: string, i: number) => `${i + 1}. ${issue}`)
          .join("\n");

        return {
          content: [{ type: "text", text: issuesText }],
        };
      }

      case "save_task_example": {
        const typedArgs = validatedArgs as SaveTaskExampleInput;
        
        const id = await taskStore.addExample(typedArgs);

        return {
          content: [
            {
              type: "text",
              text: `Task example saved successfully with ID: ${id}`,
            },
          ],
        };
      }

      default:
        // TypeScript will ensure this is never reached
        throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
    }
  } catch (error) {
    // Handle Zod validation errors gracefully
    if (error instanceof Error && error.name === 'ZodError') {
      return {
        content: [
          {
            type: "text",
            text: `Validation error: ${error.message}`,
          },
        ],
      };
    }
    
    // Re-throw other errors
    throw error;
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vibe All Coding MCP server running on stdio");
}

main().catch(console.error);
