import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { parse, stringify } from "smol-toml";
import { GwanliConfig, GlobalConfigSchema, GWANLI_DIR } from "./types.js";

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
