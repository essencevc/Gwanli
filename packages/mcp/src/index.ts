#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { generate_plan } from "./lib/plan.js";
import { TaskExampleStore, TaskExampleSchema } from "./lib/chroma.js";

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
const taskStore = new TaskExampleStore();

// Define tool schemas
const SUGGEST_ISSUES_TOOL = {
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
};

const SAVE_TASK_EXAMPLE_TOOL = {
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
};

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [SUGGEST_ISSUES_TOOL, SAVE_TASK_EXAMPLE_TOOL],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "suggest_issues") {
    const { taskDescription, context = "" } = args as {
      taskDescription: string;
      context?: string;
    };

    const plan = await generate_plan(taskDescription, context);

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

  if (name === "save_task_example") {
    try {
      const example = TaskExampleSchema.parse(args);
      const id = await taskStore.addExample(example);
      
      return {
        content: [
          {
            type: "text",
            text: `Task example saved successfully with ID: ${id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error saving task example: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vibe All Coding MCP server running on stdio");
}

main().catch(console.error);
