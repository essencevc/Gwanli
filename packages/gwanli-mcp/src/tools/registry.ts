import { Tools } from "./schemas.js";
import { authHandler } from "./implementations/auth.js";
import { workspaceHandler } from "./implementations/workspace.js";
import { indexHandler } from "./implementations/index.js";
import { searchHandler } from "./implementations/search.js";
import { globHandler } from "./implementations/glob.js";
import { viewHandler } from "./implementations/view.js";
import { listJobsHandler, checkJobHandler } from "./implementations/jobs.js";
import { listWorkspaceHandler } from "./implementations/listWorkspace.js";
import { createPageHandler } from "./implementations/createPage.js";
import { replaceContentHandler } from "./implementations/replaceContent.js";

// Tool handler registry with proper typing
export const toolHandlers = {
  auth: authHandler,
  workspace: workspaceHandler,
  index: indexHandler,
  search: searchHandler,
  glob: globHandler,
  view: viewHandler,
  listJobs: listJobsHandler,
  checkJob: checkJobHandler,
  listWorkspace: listWorkspaceHandler,
  createPage: createPageHandler,
  replaceContent: replaceContentHandler,
} as const;

// Convert Zod schema to MCP-compatible JSON schema format
function zodSchemaToMcp(zodSchema: any): any {
  // Extract the shape from Zod object schema to get individual property schemas
  return zodSchema.shape || {};
}

// Helper to register a tool with an MCP server
export function registerTool<T extends keyof typeof Tools>(
  server: any,
  toolName: T
) {
  const tool = Tools[toolName];
  const handler = toolHandlers[toolName];

  server.registerTool(
    tool.name,
    {
      description: tool.description,
      inputSchema: zodSchemaToMcp(tool.inputSchema),
    },
    async (args: any) => {
      // Validate input args using Zod schema
      const validatedArgs = tool.inputSchema.parse(args || {});
      return handler(validatedArgs as any);
    }
  );
}

// Register all tools with a server
export function registerAllTools(server: any) {
  for (const toolName of Object.keys(Tools) as Array<keyof typeof Tools>) {
    registerTool(server, toolName);
  }
}
