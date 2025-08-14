import { Command } from "commander";
import open from "open";
import { createInterface } from "readline";
import { checkWorkspace, addWorkspace, cliLogger, OAUTH_BASE_URL } from "gwanli-core";

async function promptUser(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function runAuthFlow(workspace: string): Promise<void> {
  cliLogger.console(`\nSetting up workspace: ${workspace}`);

  // Build OAuth URL and open browser
  const authUrl = `${OAUTH_BASE_URL}`;

  cliLogger.console("\nOpening browser for authentication...");
  await open(authUrl);
  cliLogger.console("Please complete authentication in your browser and copy the token.");

  // Ask user to paste token
  const token = await promptUser("Paste your Notion API token here: ");

  // Success
  cliLogger.console("\nAuthentication successful!");
  cliLogger.console(`Token: ${token.substring(0, 10)}...`);

  // Check if workspace already exists
  const workspaceExists = checkWorkspace(workspace);

  if (workspaceExists) {
    cliLogger.console(`\nWorkspace '${workspace}' already exists.`);
    const shouldOverride = await promptUser(
      "Do you want to override it? (y/n): "
    );

    if (shouldOverride.toLowerCase() !== "y" && shouldOverride.toLowerCase() !== "yes") {
      cliLogger.console("Operation cancelled. Workspace not updated.");
      return;
    }
  }

  // Add workspace to config
  try {
    addWorkspace(workspace, token);
    cliLogger.console(
      `\n✓ Workspace '${workspace}' has been ${
        workspaceExists ? "updated" : "created"
      } successfully!`
    );
    cliLogger.console("You can now use this workspace with gwanli commands.");

    // Force exit after a short delay to ensure all async operations complete
    setTimeout(() => {
      process.exit(0);
    }, 500);
  } catch (error) {
    cliLogger.error(`Failed to save workspace configuration: ${error}`);
    throw error;
  }
}

function printHeader(title: string): void {
  cliLogger.console(`\n${title}`);
  cliLogger.console("=".repeat(70));
}

function printFooter(): void {
  cliLogger.console("=".repeat(70));
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
      cliLogger.error(`\nAuthentication failed: ${error}`);
      process.exit(1);
    }

    printFooter();
  });
