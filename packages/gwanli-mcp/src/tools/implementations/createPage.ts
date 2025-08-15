import type { CreatePageArgs } from "../schemas.js";
import type { McpResponse, ToolHandler } from "../types.js";
import {
  createPageFromMarkdown,
  loadConfig,
} from "gwanli-core";

export const createPageHandler: ToolHandler<CreatePageArgs> = async (args) => {
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

    // Handle parent slug - if null/empty, we need to find a workspace root page
    let parentSlug = args.parentSlug;
    if (!parentSlug) {
      // Default to root - this might need adjustment based on your workspace structure
      parentSlug = "/";
    }

    try {
      const pageId = await createPageFromMarkdown(
        workspace.api_key,
        args.markdownContent,
        parentSlug,
        args.title,
        workspace.db_path
      );

      return {
        content: [
          {
            type: "text",
            text: `Successfully created page "${
              args.title
            }" with ID: ${pageId}${
              parentSlug ? ` under parent: ${parentSlug}` : " at workspace root"
            }`,
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
            text: `Failed to create page "${args.title}": ${errorMessage}`,
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
          text: `Error creating page: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
};
