#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig, addWorkspace, updateWorkspace, deleteWorkspace, OAUTH_BASE_URL } from "gwanli-core";

// Set MCP runtime environment
process.env.GWANLI_RUNTIME = "MCP";

// Create an MCP server
const server = new McpServer({
  name: "gwanli-mcp",
  version: "1.0.0",
});

// Register auth tool
server.registerTool(
  "auth",
  {
    description:
      "Check authentication status and get OAuth URLs for workspace setup",
    inputSchema: {
      workspace: z
        .string()
        .optional()
        .describe("Optional workspace name to get auth URL for"),
    },
  },
  async (args) => {
    try {
      // Load current config to check existing workspaces
      const config = loadConfig();
      const existingWorkspaces = Object.keys(config.workspace);

      const authUrl = `${OAUTH_BASE_URL}/`;

      const message =
        existingWorkspaces.length > 0
          ? `**Authenticated Workspaces:**\n${existingWorkspaces
              .map(
                (workspace) =>
                  `- ${workspace}${workspace === "default" ? " (default)" : ""}`
              )
              .join(
                "\n"
              )}\n\n**Get a new token for any workspace:**\n${authUrl}\n\nVisit the URL above, complete OAuth, and you'll receive a token to add to your workspace configuration.`
          : `**No authenticated workspaces found.**\n\nGenerate a token by visiting the URL above: ${authUrl}`;

      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error checking authentication: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register workspace management tool
server.registerTool(
  "workspace",
  {
    description:
      "Manage workspace configurations - add, delete, or update workspaces",
    inputSchema: {
      type: z
        .enum(["ADD", "DELETE", "UPDATE", "LIST"])
        .describe(
          "Type of workspace operation: ADD to create new workspace, DELETE to remove existing workspace, UPDATE to modify workspace details, LIST to show all workspaces"
        ),
      name: z
        .string()
        .optional()
        .default("default")
        .describe(
          "Workspace name - defaults to 'default' if not provided. Used to identify which workspace to operate on"
        ),
      api_key: z
        .string()
        .optional()
        .describe(
          "API key/token for workspace authentication - required for ADD operations, optional for UPDATE to change the key"
        ),
      description: z
        .string()
        .optional()
        .describe(
          "Human-readable description of the workspace - required for UPDATE operations to set workspace description"
        ),
    },
  },
  async (args: any) => {
    try {
      switch (args.type) {
        case "ADD":
          if (!args.api_key) {
            return {
              content: [
                {
                  type: "text",
                  text: "API key is required for adding workspace.",
                },
              ],
              isError: true,
            };
          }
          const addName = args.name || "default";
          addWorkspace(addName, args.api_key, {
            description: `Workspace: ${addName}`,
          });
          return {
            content: [
              {
                type: "text",
                text: `Successfully added workspace "${addName}" with API key.`,
              },
            ],
          };

        case "DELETE":
          const deleteName = args.name || "default";
          try {
            deleteWorkspace(deleteName);
            return {
              content: [
                {
                  type: "text",
                  text: `Successfully deleted workspace "${deleteName}".`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Workspace "${deleteName}" not found.`,
                },
              ],
              isError: true,
            };
          }

        case "UPDATE":
          if (!args.description) {
            return {
              content: [
                {
                  type: "text",
                  text: "Description is required for updating workspace.",
                },
              ],
              isError: true,
            };
          }
          const updateName = args.name || "default";
          try {
            updateWorkspace(updateName, {
              description: args.description,
              ...(args.api_key && { apiKey: args.api_key }),
            });
            return {
              content: [
                {
                  type: "text",
                  text: `Successfully updated workspace "${updateName}".`,
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: `Workspace "${updateName}" not found.`,
                },
              ],
              isError: true,
            };
          }

        case "LIST":
          const config = loadConfig();
          const workspaces = Object.entries(config.workspace);
          
          if (workspaces.length === 0) {
            return {
              content: [
                {
                  type: "text",
                  text: "**No workspaces found.**\n\nUse the workspace tool with type 'ADD' to create a new workspace.",
                },
              ],
            };
          }

          const workspaceList = workspaces
            .map(([name, workspace]) => {
              const defaultLabel = name === "default" ? " (default)" : "";
              const description = workspace.description ? ` - ${workspace.description}` : "";
              return `- **${name}**${defaultLabel}${description}`;
            })
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `**Available Workspaces:**\n\n${workspaceList}`,
              },
            ],
          };

        default:
          return {
            content: [
              {
                type: "text",
                text: "Invalid workspace operation type.",
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error managing workspace: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
