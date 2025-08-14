import { Command } from "commander";
import open from "open";
import { startAuthServer } from "./auth-server.js";

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
  console.log(`Workspace '${workspace}' will be created with this token`);
  console.log(`Token: ${token.substring(0, 10)}...`);

  // TODO: Add workspace to config here
  console.log("\nWorkspace configuration not yet implemented");
  console.log("Manual step: Save this token for the workspace");
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
