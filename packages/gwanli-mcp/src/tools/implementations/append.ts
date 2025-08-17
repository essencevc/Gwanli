import type { AppendArgs } from "../schemas.js";
import type { McpResponse, ToolHandler } from "../types.js";
import {
  appendToPage,
  loadConfig,
} from "gwanli-core";

export const appendHandler: ToolHandler<AppendArgs> = async (args) => {
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

    const workspaceName = args.workspace || config.default_search;
    const workspace = config.workspace[workspaceName];

    if (!workspace) {
      return {
        content: [
          {
            type: "text",
            text: `Workspace '${workspaceName}' not found. Available workspaces: ${Object.keys(
              config.workspace
            ).join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    if (!workspace.api_key) {
      return {
        content: [
          {
            type: "text",
            text: `No API key configured for workspace '${workspaceName}'`,
          },
        ],
        isError: true,
      };
    }

    try {
      const pageId = await appendToPage(
        workspace.api_key,
        args.slug,
        args.markdownContent,
        workspace.db_path,
        args.beforeBlockId,
        args.afterBlockId
      );

      let positionMessage = "at the end of the page";
      if (args.beforeBlockId) {
        positionMessage = `before block ${args.beforeBlockId}`;
      } else if (args.afterBlockId) {
        positionMessage = `after block ${args.afterBlockId}`;
      }

      return {
        content: [
          {
            type: "text",
            text: `Successfully appended content to page ${args.slug} ${positionMessage} (Page ID: ${pageId})`,
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        content: [
          {
            type: "text",
            text: `Failed to append content to ${args.slug}: ${errorMessage}`,
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
          text: `Error appending content: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
};
