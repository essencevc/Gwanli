import { loadConfig, get_db, findPagesByPattern } from "gwanli-core";
import type { GlobArgs } from "../schemas.js";
import type { McpResponse, ToolHandler } from "../types.js";

export const globHandler: ToolHandler<GlobArgs> = async (args) => {
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

    const result = findPagesByPattern(db, args.pattern, args.field, {
      limit: args.limit,
      offset: args.offset,
      includeContent: args.includeContent,
    });

    db.close();

    if (result.results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No results found for pattern: "${args.pattern}" in field: ${args.field}`,
          },
        ],
      };
    }

    const formattedResults = result.results
      .map((page, index) => {
        const title = page.title || "Untitled";
        const slug = page.slug || "";
        const type = page.type?.toUpperCase() || "UNKNOWN";

        let content = `**${index + 1 + args.offset}. [${type}] ${title}**`;
        if (slug) content += `\n   Slug: \`${slug}\``;
        if (page.content && args.includeContent) {
          const preview = page.content.substring(0, 200);
          content += `\n   Preview: ${preview}${
            page.content.length > 200 ? "..." : ""
          }`;
        }
        content += `\n   Updated: ${new Date(
          page.lastUpdated
        ).toLocaleString()}`;

        return content;
      })
      .join("\n\n");

    const paginationInfo = `**Results ${args.offset + 1}-${
      args.offset + result.results.length
    } of ${result.totalCount}**${result.hasMore ? " (more available)" : ""}`;

    return {
      content: [
        {
          type: "text",
          text: `**Pattern Results for: "${args.pattern}" (${args.field})**\n\n${paginationInfo}\n\n${formattedResults}`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error finding pages by pattern: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
};
