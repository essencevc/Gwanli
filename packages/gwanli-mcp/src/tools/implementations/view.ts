import { loadConfig, get_db, getPageBySlug } from "gwanli-core";
import type { ViewArgs } from "../schemas.js";
import type { McpResponse, ToolHandler } from "../types.js";

export const viewHandler: ToolHandler<ViewArgs> = async (args) => {
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
    const db = get_db(config.workspace[searchWorkspace].db_path);
    const page = getPageBySlug(db, args.slug);

    db.close();

    if (!page) {
      return {
        content: [
          {
            type: "text",
            text: `Page not found with slug: "${args.slug}"`,
          },
        ],
        isError: true,
      };
    }

    const title = page.title || "Untitled";
    const type = page.type?.toUpperCase() || "UNKNOWN";
    const createdDate = new Date(page.createdAt).toLocaleString();
    const updatedDate = new Date(page.lastUpdated).toLocaleString();

    let formattedPage = `**[${type}] ${title}**\n`;
    formattedPage += `**Slug:** \`${page.slug}\`\n`;
    formattedPage += `**ID:** \`${page.id}\`\n`;
    formattedPage += `**Created:** ${createdDate}\n`;
    formattedPage += `**Updated:** ${updatedDate}\n`;

    if (page.type === "database" && "properties" in page && page.properties) {
      formattedPage += `**Properties:** ${JSON.stringify(
        page.properties,
        null,
        2
      )}\n`;
    }

    if (args.includeContent && "content" in page && page.content) {
      formattedPage += `\n**Content:**\n${page.content}`;
    }

    return {
      content: [
        {
          type: "text",
          text: formattedPage,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error viewing page: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
};
