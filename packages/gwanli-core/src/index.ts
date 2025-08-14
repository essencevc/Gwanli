import treeify from "treeify";
import Database from "better-sqlite3";
import { join } from "path";
import { homedir } from "os";
import { getAllSlugs } from "./lib/db.js";
import { buildTree, extractSlugPrefix } from "./lib/tree.js";

export function listFiles(
  db_path: string,
  prefix: string = "/",
  maxDepth: number = 2
): string {
  let slugs = [];

  try {
    // Expand ~ to home directory for consistent path handling
    const expandedPath = db_path.startsWith("~/")
      ? join(homedir(), db_path.slice(2))
      : db_path;
    const db = new Database(expandedPath);
    slugs = getAllSlugs(db);
  } catch (error) {
    console.error("Error fetching slugs:", error);
    throw error;
  }

  const { processedPrefix, shortenedPrefix } = extractSlugPrefix(prefix);

  const filteredSlugs = slugs
    .filter((slug) => slug && slug.startsWith(processedPrefix))
    .map((slug) => slug.replace(processedPrefix, shortenedPrefix))
    .sort((a, b) => a.length - b.length);

  const tree = buildTree(filteredSlugs, maxDepth);
  const formattedTree = treeify.asTree(tree, true, true);

  return `
  Showing files from ${prefix} with max depth ${maxDepth}
  - ++ indicates there are more pages/databases to explore from this path.

  ${formattedTree}
  `;
}

// Export notion functionality
export { indexNotionPages } from "./lib/notion.js";

// Export job management
export { JobTracker } from "./lib/jobs.js";
export type { JobStatus, JobInfo } from "./lib/jobs.js";

// Export process utilities
export { 
  spawnGwanliProcess, 
  listActiveGwanliProcesses, 
  killGwanliProcess, 
  getProcessByTaskName
} from "./lib/process.js";
export type { ProcessInfo } from "./lib/process.js";

// Export config functions
export { loadConfig, checkWorkspace, addWorkspace, updateWorkspace, deleteWorkspace } from "./config/loader.js";
export type { GwanliConfig, WorkspaceConfig } from "./config/types.js";

// Export constants
export { OAUTH_BASE_URL } from "./constants.js";

// Export logging utilities
export { Logger } from "./logging/index.js";

// Export shared types
export type {
  PageRecord,
  DatabasePageRecord,
  DatabaseRecord,
  ConvertedPage,
} from "./types/database.js";
export type { SlugMapping, IdToSlugMap } from "./types/notion.js";
export type { IndexJob } from "./types/index.js";
