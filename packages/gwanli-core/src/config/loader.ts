import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { parse, stringify } from "smol-toml";
import { GwanliConfig, GlobalConfigSchema, WorkspaceConfig } from "./types.js";
import { GWANLI_HOME } from "../constants.js";

const CONFIG_PATH = join(GWANLI_HOME, "gwanli.toml");

export function loadConfig(configPath?: string): GwanliConfig {
  const filePath = configPath || CONFIG_PATH;

  // Create the gwanli directory if it doesn't exist
  if (!existsSync(GWANLI_HOME)) {
    mkdirSync(GWANLI_HOME, { recursive: true });
  }

  // Create the config file if it doesn't exist
  if (!existsSync(filePath)) {
    const defaultConfig = GlobalConfigSchema.parse({
      api_rate_limit: 2,
      max_depth: 2,
      default_search: undefined,
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

export function checkWorkspace(
  workspaceName: string,
  configPath?: string
): boolean {
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
    db_path: options?.dbPath || join(GWANLI_HOME, `${workspaceName}.db`),
    ...(options?.description && { description: options.description }),
  };

  // Load current config
  const config = loadConfig(configPath);

  // Create a mutable copy
  const updatedConfig = { ...config, workspace: { ...config.workspace } };

  // Add the new workspace
  updatedConfig.workspace[workspaceName] = workspaceConfig;

  // If this is the first workspace and no default is set, make it the default search workspace
  if (Object.keys(updatedConfig.workspace).length === 1 && !updatedConfig.default_search) {
    updatedConfig.default_search = workspaceName;
  }

  // Write updated config back to file
  writeFileSync(filePath, stringify(updatedConfig));
}

export function updateWorkspace(
  workspaceName: string,
  updates: { description?: string; apiKey?: string; dbPath?: string },
  configPath?: string
): void {
  const filePath = configPath || CONFIG_PATH;

  // Load current config
  const config = loadConfig(configPath);

  // Check if workspace exists
  if (!(workspaceName in config.workspace)) {
    throw new Error(`Workspace "${workspaceName}" not found`);
  }

  // Create a mutable copy
  const updatedConfig = { ...config, workspace: { ...config.workspace } };

  // Update the workspace with provided values
  if (updates.description !== undefined) {
    updatedConfig.workspace[workspaceName].description = updates.description;
  }
  if (updates.apiKey !== undefined) {
    updatedConfig.workspace[workspaceName].api_key = updates.apiKey;
  }
  if (updates.dbPath !== undefined) {
    updatedConfig.workspace[workspaceName].db_path = updates.dbPath;
  }

  // Write updated config back to file
  writeFileSync(filePath, stringify(updatedConfig));
}

export function deleteWorkspace(
  workspaceName: string,
  configPath?: string
): void {
  const filePath = configPath || CONFIG_PATH;

  // Load current config
  const config = loadConfig(configPath);

  // Check if workspace exists
  if (!(workspaceName in config.workspace)) {
    throw new Error(`Workspace "${workspaceName}" not found`);
  }

  // Create a mutable copy
  const updatedConfig = { ...config, workspace: { ...config.workspace } };

  // Remove the workspace
  delete updatedConfig.workspace[workspaceName];

  // Write updated config back to file
  writeFileSync(filePath, stringify(updatedConfig));
}
