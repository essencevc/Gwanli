import { loadConfig, OAUTH_BASE_URL } from "gwanli-core";
import type { AuthArgs } from "../schemas.js";
import type { McpResponse, ToolHandler } from "../types.js";

export const authHandler: ToolHandler<AuthArgs> = async () => {
  try {
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
};
