#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  loadConfig,
  addWorkspace,
  updateWorkspace,
  deleteWorkspace,
  OAUTH_BASE_URL,
  checkWorkspace,
  indexNotionPages,
  JobTracker,
  listFiles,
  getRecentJobs,
  getJobById,
  type JobState,
} from "gwanli-core";

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
    inputSchema: {},
  },
  async () => {
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
              const description = workspace.description
                ? ` - ${workspace.description}`
                : "";
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

// Register index tool
server.registerTool(
  "index",
  {
    description: "Start indexing a Notion workspace in the background",
    inputSchema: {
      workspace: z
        .string()
        .default("default")
        .describe(
          "Workspace name to index - defaults to 'default' if not provided"
        ),
    },
  },
  async (args) => {
    try {
      const workspaceName = args.workspace || "default";

      // Check if workspace exists
      if (!checkWorkspace(workspaceName)) {
        return {
          content: [
            {
              type: "text",
              text: `Workspace "${workspaceName}" not found. Use the workspace tool to list available workspaces or add a new one.`,
            },
          ],
          isError: true,
        };
      }

      // Run indexing directly in background
      const config = loadConfig();
      const workspace = config.workspace[workspaceName];

      // Create job tracker
      const jobId = `mcp-${Date.now()}`;
      const jobTracker = new JobTracker(jobId);

      // Start indexing asynchronously
      indexNotionPages(workspace.api_key, workspace.db_path, jobTracker)
        .then(() => {
          jobTracker.updateStatus("END");
          console.log(`Indexing completed for workspace: ${workspaceName}`);
        })
        .catch((error) => {
          jobTracker.updateStatus("ERROR");
          console.error(
            `Indexing failed for workspace ${workspaceName}:`,
            error
          );
        });

      return {
        content: [
          {
            type: "text",
            text: `Indexing of Notion workspace has begun.\n\n**Job ID:** ${jobId}\n\nCheck back in a while to see its progress using the checkJob tool.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error starting indexing: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register ls tool
server.registerTool(
  "ls",
  {
    description: "List files from a workspace or database path",
    inputSchema: {
      workspace: z
        .string()
        .optional()
        .describe(
          "Workspace name or database path - defaults to default_search from config if not provided"
        ),
      prefix: z
        .string()
        .default("/")
        .describe("Path prefix to filter results - defaults to '/'"),
      depth: z
        .number()
        .default(2)
        .describe("Maximum depth to display - defaults to 2"),
    },
  },
  async (args) => {
    try {
      const config = loadConfig();

      if (!config.default_search) {
        return {
          content: [
            {
              type: "text",
              text: "No default search configured",
            },
          ],
          isError: true,
        };
      }

      const searchWorkspace = args.workspace ?? config.default_search;
      const prefix = args.prefix ?? "/";
      const maxDepth = args.depth ?? 2;

      const result = listFiles(searchWorkspace, prefix, maxDepth);

      return {
        content: [
          {
            type: "text",
            text: `**Files from: ${searchWorkspace}**\nPrefix: ${prefix}, Max Depth: ${maxDepth}\n\n${result}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing files: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register checkJob tool
server.registerTool(
  "checkJob",
  {
    description: "Check job status - either by specific ID or get recent jobs",
    inputSchema: {
      id: z
        .string()
        .optional()
        .describe("Specific job ID to check (e.g., 'mcp-1755172514281')"),
      count: z
        .number()
        .default(5)
        .describe("Number of recent jobs to show when no ID is provided - defaults to 5"),
      prefix: z
        .enum(["mcp", "cli"])
        .default("mcp")
        .describe("Job prefix filter - defaults to 'mcp'"),
    },
  },
  async (args) => {
    try {
      if (args.id) {
        // Get specific job by ID
        const job = getJobById(args.id);
        
        if (!job) {
          return {
            content: [
              {
                type: "text",
                text: `Job "${args.id}" not found.`,
              },
            ],
            isError: true,
          };
        }

        const stateText = job.state 
          ? `**Status:** \`\`\`json\n${JSON.stringify(job.state, null, 2)}\n\`\`\``
          : "**Status:** No status file found";

        return {
          content: [
            {
              type: "text",
              text: `**Job ID:** ${job.jobId}\n**Prefix:** ${job.prefix}\n**Timestamp:** ${job.timestamp}\n\n${stateText}`,
            },
          ],
        };
      } else {
        // Get recent jobs
        const jobs = getRecentJobs(args.count, args.prefix);
        
        if (jobs.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No ${args.prefix} jobs found.`,
              },
            ],
          };
        }

        const jobsList = jobs
          .map((job: JobState) => {
            const statusText = job.state?.status ? ` (${job.state.status})` : "";
            const timeStr = new Date(job.timestamp).toLocaleString();
            return `- **${job.jobId}**${statusText} - ${timeStr}`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `**Recent ${args.prefix.toUpperCase()} Jobs (${jobs.length}):**\n\n${jobsList}\n\nUse checkJob with a specific ID to see detailed status.`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error checking job: ${
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
