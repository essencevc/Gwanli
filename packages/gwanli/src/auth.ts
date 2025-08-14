import { Command } from "commander";
import open from "open";
import { createInterface } from "readline";
import { startAuthServer } from "./auth-server.js";
import { checkWorkspace, addWorkspace, Logger } from "gwanli-core";

async function promptUser(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function runAuthFlow(workspace: string): Promise<void> {
  Logger.console(`\nSetting up workspace: ${workspace}`);
  Logger.console("Starting local server for OAuth callback...");

  // Start local auth server
  const { url, tokenPromise } = await startAuthServer();
  Logger.log(`Started Auth Process on ${url}`);

  // Build OAuth URL and open browser
  const workerUrl = "http://localhost:8787";
  const callbackUrl = `${url}/callback`;
  const authUrl = `${workerUrl}/cli?callback=${encodeURIComponent(
    callbackUrl
  )}`;

  Logger.console("\nOpening browser for authentication...");
  await open(authUrl);
  Logger.console("Waiting for authentication completion...");

  // Wait for token from callback - server auto-closes when done
  const token = await tokenPromise;

  // Success
  Logger.console("\nAuthentication successful!");
  Logger.console(`Token: ${token.substring(0, 10)}...`);

  // Check if workspace already exists
  const workspaceExists = checkWorkspace(workspace);

  if (workspaceExists) {
    Logger.console(`\nWorkspace '${workspace}' already exists.`);
    const shouldOverride = await promptUser(
      "Do you want to override it? (y/n): "
    );

    if (shouldOverride !== "y" && shouldOverride !== "yes") {
      Logger.console("Operation cancelled. Workspace not updated.");
      return;
    }
  }

  // Add workspace to config
  try {
    addWorkspace(workspace, token);
    Logger.console(
      `\n✓ Workspace '${workspace}' has been ${
        workspaceExists ? "updated" : "created"
      } successfully!`
    );
    Logger.console("You can now use this workspace with gwanli commands.");

    // Force exit after a short delay to ensure all async operations complete
    setTimeout(() => {
      process.exit(0);
    }, 500);
  } catch (error) {
    Logger.error(`Failed to save workspace configuration: ${error}`);
    throw error;
  }
}

function printHeader(title: string): void {
  Logger.console(`\n${title}`);
  Logger.console("=".repeat(70));
}

function printFooter(): void {
  Logger.console("=".repeat(70));
}

export const auth = new Command("auth")
  .description("Generate a Notion API token and add workspace")
  .option(
    "--workspace <name>",
    "Workspace name to add after authentication (default: 'default')"
  )
  .action(async (options) => {
    const { workspace = "default" } = options;

    printHeader("Notion API Token Generator");

    try {
      await runAuthFlow(workspace);
    } catch (error) {
      Logger.error(`\nAuthentication failed: ${error}`);
      process.exit(1);
    }

    printFooter();
  });
