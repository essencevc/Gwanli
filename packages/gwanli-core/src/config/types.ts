import { z } from "zod";

export const WorkspaceConfigSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  description: z.string().optional(),
  api_key: z.string().min(1, "API key is required"),
  db_path: z.string().min(1, "Database path is required"),
});

export const GlobalConfigSchema = z.object({
  api_rate_limit: z.number().int().positive().default(2),
  max_depth: z.number().int().positive().default(2),
  default_search: z.string().optional(),
  workspace: z.record(z.string(), WorkspaceConfigSchema).default({}),
});

export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
export type GwanliConfig = z.infer<typeof GlobalConfigSchema>;
