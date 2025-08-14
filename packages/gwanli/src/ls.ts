import { Command } from "commander";
import { listFiles, loadConfig, cliLogger } from "gwanli-core";

export const ls = new Command("ls")
  .description("List files from a workspace or database path")
  .argument(
    "[workspace]",
    "Workspace name or database path (defaults to 'default' workspace)"
  )
  .option(
    "--prefix <prefix>",
    "Path prefix to filter results (default: '/')",
    "/"
  )
  .option("--depth <depth>", "Maximum depth to display (default: 2)", "2")
  .action(async (workspace, options) => {
    const { prefix, depth } = options;
    const maxDepth = parseInt(depth, 10);

    const config = loadConfig();

    if (!config.default_search) {
      return cliLogger.error("No default search configured");
    }

    let searchWorkspace = workspace ?? config.default_search;

    cliLogger.console(`\nListing files from: ${searchWorkspace}`);
    cliLogger.console(`Prefix: ${prefix}, Max Depth: ${maxDepth}\n`);

    try {
      const result = listFiles(searchWorkspace, prefix, maxDepth);
      cliLogger.console(result);
    } catch (error) {
      cliLogger.error(`Error listing files: ${error}`);
      process.exit(1);
    }
  });
