import { Command } from "commander";
import open from "open";
import { createInterface } from "readline";
import { startAuthServer } from "./auth-server.js";
import { checkWorkspace, addWorkspace } from "gwanli-core";

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
  console.log(`\nSetting up workspace: ${workspace}`);
  console.log("Starting local server for OAuth callback...");

  // Start local auth server
  const { url, tokenPromise } = await startAuthServer();
  console.log(`Server started on ${url}`);

  // Build OAuth URL and open browser
  const workerUrl = "http://localhost:8787";
  const callbackUrl = `${url}/callback`;
  const authUrl = `${workerUrl}/cli?callback=${encodeURIComponent(callbackUrl)}`;

  console.log("\nOpening browser for authentication...");
  await open(authUrl);
  console.log("Waiting for authentication completion...");

  // Wait for token from callback - server auto-closes when done
  const token = await tokenPromise;

  // Success
  console.log("\nAuthentication successful!");
  console.log(`Token: ${token.substring(0, 10)}...`);

  // Check if workspace already exists
  const workspaceExists = checkWorkspace(workspace);
  
  if (workspaceExists) {
    console.log(`\nWorkspace '${workspace}' already exists.`);
    const shouldOverride = await promptUser("Do you want to override it? (y/n): ");
    
    if (shouldOverride !== 'y' && shouldOverride !== 'yes') {
      console.log("Operation cancelled. Workspace not updated.");
      return;
    }
  }

  // Add workspace to config
  try {
    addWorkspace(workspace, token);
    console.log(`\n✓ Workspace '${workspace}' has been ${workspaceExists ? 'updated' : 'created'} successfully!`);
    console.log("You can now use this workspace with gwanli commands.");
    
    // Force exit after a short delay to ensure all async operations complete
    setTimeout(() => {
      process.exit(0);
    }, 500);
  } catch (error) {
    console.error(`Failed to save workspace configuration: ${error}`);
    throw error;
  }
}

function printHeader(title: string): void {
  console.log(`\n${title}`);
  console.log("=".repeat(70));
}

function printFooter(): void {
  console.log("=".repeat(70));
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
      console.error(`\nAuthentication failed: ${error}`);
      process.exit(1);
    }
    
    printFooter();
  });
