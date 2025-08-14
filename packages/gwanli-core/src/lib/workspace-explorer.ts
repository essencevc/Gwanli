import treeify from "treeify";
import Database from "better-sqlite3";
import { join } from "path";
import { homedir } from "os";
import { getAllSlugs } from "./db.js";
import { buildTree, extractSlugPrefix } from "./tree.js";
import { loadConfig } from "../config/loader.js";
import { Logger, defaultLogger } from "../logging/logger.js";

/**
 * List files from a workspace or database path
 */
export function listFiles(
  workspaceNameOrPath: string,
  prefix: string = "/",
  maxDepth: number = 2,
  logger: Logger = defaultLogger
): string {
  let slugs: string[] = [];
  let displayName: string;
  let dbPath: string;

  try {
    // Try to treat as workspace name first
    try {
      const config = loadConfig();
      const workspace = config.workspace[workspaceNameOrPath];

      if (workspace) {
        dbPath = workspace.db_path;
        displayName = `workspace: ${workspaceNameOrPath}`;
        logger.debug(
          `Loading files from workspace: ${workspaceNameOrPath}, db_path: ${dbPath}`
        );
      } else {
        throw new Error("Not a workspace");
      }
    } catch {
      // If not a workspace, treat as direct database path
      dbPath = workspaceNameOrPath;
      displayName = "database path";
      logger.debug(`Loading files from database path: ${dbPath}`);
    }

    // Expand ~ to home directory for consistent path handling
    const expandedPath = dbPath.startsWith("~/")
      ? join(homedir(), dbPath.slice(2))
      : dbPath;

    const db = new Database(expandedPath);
    slugs = getAllSlugs(db, logger);
    db.close();
  } catch (error) {
    logger.error("Error fetching slugs:", error);
    throw error;
  }

  const { processedPrefix, shortenedPrefix } = extractSlugPrefix(prefix);

  const filteredSlugs = slugs
    .filter((slug) => slug && slug.startsWith(processedPrefix))
    .map((slug) => slug.replace(processedPrefix, shortenedPrefix))
    .sort((a, b) => a.length - b.length);

  logger.debug(
    `Found ${filteredSlugs.length} files matching prefix: ${prefix}`
  );

  const tree = buildTree(filteredSlugs, maxDepth);
  const formattedTree = treeify.asTree(tree, true, true);

  return `
  Showing files from ${prefix} with max depth ${maxDepth} (${displayName})
  - ++ indicates there are more pages/databases to explore from this path.

  ${formattedTree}
  `;
}
