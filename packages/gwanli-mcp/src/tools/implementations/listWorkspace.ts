import { loadConfig, listFiles } from "gwanli-core";
import type { ListWorkspaceArgs } from "../schemas.js";
import type { McpResponse, ToolHandler } from "../types.js";

export const listWorkspaceHandler: ToolHandler<ListWorkspaceArgs> = async (args) => {
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

    let result = `**Listing files from: ${searchWorkspace}**\n`;
    result += `**Prefix:** ${args.prefix}, **Max Depth:** ${args.depth}\n\n`;

    try {
      const files = listFiles(searchWorkspace, args.prefix, args.depth);
      result += files;

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing workspace files: ${
              error instanceof Error ? error.message : String(error)
            }`,
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
          text: `Error accessing workspace: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
};
