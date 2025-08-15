import {
  loadConfig,
  addWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from "gwanli-core";
import type { WorkspaceArgs } from "../schemas.js";
import type { McpResponse, ToolHandler } from "../types.js";

export const workspaceHandler: ToolHandler<WorkspaceArgs> = async (args) => {
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
};
