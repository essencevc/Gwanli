import { z } from "zod";

// Auth tool schema
export const AuthTool = {
  name: "auth" as const,
  description:
    "Check authentication status and get OAuth URLs for workspace setup",
  inputSchema: z.object({}),
} as const;

// Workspace tool schema
export const WorkspaceTool = {
  name: "workspace" as const,
  description:
    "Manage workspace configurations - add, delete, or update workspaces",
  inputSchema: z.object({
    type: z
      .enum(["ADD", "DELETE", "UPDATE", "LIST"])
      .describe(
        "Type of workspace operation: ADD to create new workspace, DELETE to remove existing workspace, UPDATE to modify workspace details, LIST to show all workspaces"
      ),
    name: z
      .string()
      .optional()
      .default("default")
      .describe(
        "Workspace name - defaults to 'default' if not provided. Used to identify which workspace to operate on"
      ),
    api_key: z
      .string()
      .optional()
      .describe(
        "API key/token for workspace authentication - required for ADD operations, optional for UPDATE to change the key"
      ),
    description: z
      .string()
      .optional()
      .describe(
        "Human-readable description of the workspace - required for UPDATE operations to set workspace description"
      ),
  }),
} as const;

// Index tool schema
export const IndexTool = {
  name: "index" as const,
  description:
    "Index Notion pages from a workspace into local database for searching",
  inputSchema: z.object({
    workspace: z
      .string()
      .optional()
      .describe(
        "Workspace name to index - defaults to default_search from config"
      ),
    force: z
      .boolean()
      .default(false)
      .describe(
        "Force re-index all pages - defaults to false for incremental updates"
      ),
  }),
} as const;

// Search tool schema
export const SearchTool = {
  name: "search" as const,
  description: "Search through indexed Notion pages using text queries",
  inputSchema: z.object({
    query: z.string().min(1).describe("Search query text"),
    workspace: z
      .string()
      .optional()
      .describe(
        "Workspace name to search in - defaults to default_search from config"
      ),
    limit: z
      .number()
      .default(10)
      .describe("Maximum number of results to return - defaults to 10"),
    offset: z
      .number()
      .default(0)
      .describe("Number of results to skip for pagination - defaults to 0"),
    includeContent: z
      .boolean()
      .default(false)
      .describe(
        "Include page content in results - defaults to false for performance"
      ),
  }),
} as const;

// Glob tool schema
export const GlobTool = {
  name: "glob" as const,
  description:
    "Find pages using glob patterns (*, ?, [abc]) on slug or title fields",
  inputSchema: z.object({
    pattern: z
      .string()
      .min(1)
      .describe(
        "Glob pattern to match against (e.g., 'project/*', 'meeting-*-notes', '[abc]*')"
      ),
    field: z
      .enum(["slug", "title"])
      .default("slug")
      .describe("Field to match pattern against - defaults to 'slug'"),
    workspace: z
      .string()
      .optional()
      .describe(
        "Workspace name to search in - defaults to default_search from config"
      ),
    limit: z
      .number()
      .default(10)
      .describe("Maximum number of results to return - defaults to 10"),
    offset: z
      .number()
      .default(0)
      .describe("Number of results to skip for pagination - defaults to 0"),
    includeContent: z
      .boolean()
      .default(false)
      .describe(
        "Include page content in results - defaults to false for performance"
      ),
  }),
} as const;

// View tool schema
export const ViewTool = {
  name: "view" as const,
  description: "View a specific page by its slug",
  inputSchema: z.object({
    slug: z
      .string()
      .min(1)
      .describe(
        "Slug of the page to view.  slugs must include the leading slash (e.g., /home/personal/fitness not home/personal/fitness)"
      ),
    workspace: z
      .string()
      .optional()
      .describe(
        "Workspace name to search in - defaults to default_search from config"
      ),
    includeContent: z
      .boolean()
      .default(true)
      .describe("Include page content in results - defaults to true"),
  }),
} as const;

// List Jobs tool schema
export const ListJobsTool = {
  name: "listJobs" as const,
  description:
    "List recent jobs with optional filtering by type (mcp/cli) and count",
  inputSchema: z.object({
    count: z
      .number()
      .default(5)
      .describe("Number of recent jobs to return - defaults to 5"),
    prefix: z
      .enum(["mcp", "cli"])
      .optional()
      .describe("Filter jobs by type - defaults to all jobs"),
  }),
} as const;

// Check Job tool schema
export const CheckJobTool = {
  name: "checkJob" as const,
  description: "Get detailed information about a specific job by ID",
  inputSchema: z.object({
    jobId: z.string().min(1).describe("Job ID to check"),
  }),
} as const;

// List Workspace tool schema
export const ListWorkspaceTool = {
  name: "listWorkspace" as const,
  description: "List files/pages from a workspace with optional filtering",
  inputSchema: z.object({
    workspace: z
      .string()
      .optional()
      .describe("Workspace name - defaults to default_search from config"),
    prefix: z
      .string()
      .default("/")
      .describe("Path prefix to filter results - defaults to '/'"),
    depth: z
      .number()
      .default(2)
      .describe("Maximum depth to display - defaults to 2"),
  }),
} as const;

// Create Page tool schema
export const CreatePageTool = {
  name: "createPage" as const,
  description: "Create a new Notion page from markdown content with optional parent slug",
  inputSchema: z.object({
    title: z
      .string()
      .min(1)
      .describe("Title of the new page"),
    markdownContent: z
      .string()
      .min(1)
      .describe("Markdown content for the page body"),
    parentSlug: z
      .string()
      .optional()
      .describe("Slug of the parent page - if null/empty, page will be created under workspace root"),
    workspace: z
      .string()
      .optional()
      .describe("Workspace name to use - defaults to default_search from config"),
  }),
} as const;

// Export all tools
export const Tools = {
  auth: AuthTool,
  workspace: WorkspaceTool,
  index: IndexTool,
  search: SearchTool,
  glob: GlobTool,
  view: ViewTool,
  listJobs: ListJobsTool,
  checkJob: CheckJobTool,
  listWorkspace: ListWorkspaceTool,
  createPage: CreatePageTool,
} as const;

// Generate TypeScript types
export type AuthArgs = z.infer<typeof AuthTool.inputSchema>;
export type WorkspaceArgs = z.infer<typeof WorkspaceTool.inputSchema>;
export type IndexArgs = z.infer<typeof IndexTool.inputSchema>;
export type SearchArgs = z.infer<typeof SearchTool.inputSchema>;
export type GlobArgs = z.infer<typeof GlobTool.inputSchema>;
export type ViewArgs = z.infer<typeof ViewTool.inputSchema>;
export type ListJobsArgs = z.infer<typeof ListJobsTool.inputSchema>;
export type CheckJobArgs = z.infer<typeof CheckJobTool.inputSchema>;
export type ListWorkspaceArgs = z.infer<typeof ListWorkspaceTool.inputSchema>;
export type CreatePageArgs = z.infer<typeof CreatePageTool.inputSchema>;
