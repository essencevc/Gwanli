import {
  loadConfig,
  checkWorkspace,
  indexNotionPages,
  JobTracker,
} from "gwanli-core";
import type { IndexArgs } from "../schemas.js";
import type { McpResponse, ToolHandler } from "../types.js";

export const indexHandler: ToolHandler<IndexArgs> = async (args) => {
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

    const indexWorkspace = args.workspace ?? config.default_search;

    if (!checkWorkspace(indexWorkspace)) {
      return {
        content: [
          {
            type: "text",
            text: `Workspace "${indexWorkspace}" not found or not configured properly.`,
          },
        ],
        isError: true,
      };
    }

    // Generate a unique job ID and create tracker
    const jobId = `idx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tracker = new JobTracker(jobId);

    try {
      const workspaceConfig = config.workspace[indexWorkspace];
      const jobResult = await indexNotionPages(
        workspaceConfig.api_key,
        workspaceConfig.db_path,
        tracker
      );

      let statusText = `**Indexing Job Started**\n`;
      statusText += `**Job ID:** \`${jobId}\`\n`;
      statusText += `**Workspace:** ${indexWorkspace}\n`;
      statusText += `**Force Re-index:** ${args.force ? "Yes" : "No"}\n\n`;
      statusText += `**Status:** Indexing completed successfully\n`;
      statusText += `**Result:** ${jobResult}\n`;

      return {
        content: [
          {
            type: "text",
            text: statusText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error starting indexing job: ${
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
          text: `Error indexing pages: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
};
