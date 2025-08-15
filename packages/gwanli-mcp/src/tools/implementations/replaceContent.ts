import type { ReplaceContentArgs } from "../schemas.js";
import type { McpResponse, ToolHandler } from "../types.js";
import {
  replaceParagraph,
  loadConfig,
} from "gwanli-core";

export const replaceContentHandler: ToolHandler<ReplaceContentArgs> = async (args) => {
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
      const pageId = await replaceParagraph(
        workspace.api_key,
        args.slug,
        args.oldParagraph,
        args.newParagraph,
        workspace.db_path
      );

      return {
        content: [
          {
            type: "text",
            text: `Successfully replaced paragraph in page ${args.slug} (ID: ${pageId})`,
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
            text: `Failed to replace paragraph in ${args.slug}: ${errorMessage}`,
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
          text: `Error replacing content: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
};
