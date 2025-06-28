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
  SuggestIssuesInputSchema,
  SaveTaskExampleInputSchema,
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

// Define tool schemas with Zod validation
const TOOLS = [
  {
    name: "suggest_issues",
    description: "Break down a task or feature request into actionable issues",
    inputSchema: {
      type: "object",
      properties: {
        taskDescription: {
          type: "string",
          description: "The task or feature request to break down into issues",
        },
        context: {
          type: "string",
          description: "Additional context about the codebase or project",
        },
      },
      required: ["taskDescription"],
    },
  },
  {
    name: "save_task_example",
    description: "Save a task example with context and issues for future reference",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "The task or feature description",
        },
        context: {
          type: "string",
          description: "Additional context about the task",
        },
        issues: {
          type: "string",
          description: "Generated issues or breakdown for the task",
        },
      },
      required: ["task", "context", "issues"],
    },
  },
] as const;

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls with Zod validation
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "suggest_issues": {
        // Validate input with Zod
        const validatedArgs: SuggestIssuesInput = SuggestIssuesInputSchema.parse(args);
        
        const plan = await generate_plan(validatedArgs.taskDescription, validatedArgs.context);

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
        // Validate input with Zod
        const validatedArgs: SaveTaskExampleInput = SaveTaskExampleInputSchema.parse(args);
        
        const id = await taskStore.addExample(validatedArgs);

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
