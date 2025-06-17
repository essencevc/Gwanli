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

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [SUGGEST_ISSUES_TOOL],
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

  throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Vibe All Coding MCP server running on stdio");
}

main().catch(console.error);
