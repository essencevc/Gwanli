// Export workspace explorer functions
export { listFiles } from "./lib/workspace-explorer.js";

// Export notion functionality
export { indexNotionPages } from "./lib/notion.js";

// Export job management
export { JobTracker, getRecentJobs, getJobById } from "./lib/jobs.js";
export type { JobStatus, JobInfo, JobState } from "./lib/jobs.js";

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
export { Logger, defaultLogger, cliLogger } from "./logging/index.js";

// Export shared types
export type {
  PageRecord,
  DatabasePageRecord,
  DatabaseRecord,
  ConvertedPage,
} from "./types/database.js";
export type { SlugMapping, IdToSlugMap } from "./types/notion.js";
export type { IndexJob } from "./types/index.js";
