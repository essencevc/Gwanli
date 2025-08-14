import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { parse, stringify } from "smol-toml";
import { GwanliConfig, GlobalConfigSchema, GWANLI_DIR, WorkspaceConfig } from "./types.js";

const CONFIG_PATH = join(GWANLI_DIR, "gwanli.toml");

export function loadConfig(configPath?: string): GwanliConfig {
  const filePath = configPath || CONFIG_PATH;

  // Create the gwanli directory if it doesn't exist
  if (!existsSync(GWANLI_DIR)) {
    mkdirSync(GWANLI_DIR, { recursive: true });
  }

  // Create the config file if it doesn't exist
  if (!existsSync(filePath)) {
    const defaultConfig = GlobalConfigSchema.parse({
      api_rate_limit: 2,
      max_depth: 2,
      workspace: {},
    });
    writeFileSync(filePath, stringify(defaultConfig));
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = parse(content);

    const config = GlobalConfigSchema.parse(parsed);

    return Object.freeze(config);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to load config from ${filePath}: ${error.message}`
      );
    }
    throw error;
  }
}

export function checkWorkspace(workspaceName: string, configPath?: string): boolean {
  const config = loadConfig(configPath);
  return workspaceName in config.workspace;
}

export function addWorkspace(
  workspaceName: string, 
  apiKey: string, 
  options?: { description?: string; dbPath?: string },
  configPath?: string
): void {
  const filePath = configPath || CONFIG_PATH;
  
  // Create the workspace config
  const workspaceConfig: WorkspaceConfig = {
    name: workspaceName,
    api_key: apiKey,
    db_path: options?.dbPath || join(GWANLI_DIR, `${workspaceName}.db`),
    ...(options?.description && { description: options.description })
  };

  // Load current config
  const config = loadConfig(configPath);
  
  // Add the new workspace
  config.workspace[workspaceName] = workspaceConfig;
  
  // Write updated config back to file
  writeFileSync(filePath, stringify(config));
}
