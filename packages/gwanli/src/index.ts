#!/usr/bin/env node

import { Command } from "commander";
import { loadConfig, checkWorkspace, indexNotionPages, JobTracker } from "gwanli-core";

const program = new Command("index");

program
  .name("index")
  .description("Index a Notion workspace")
  .option("-w, --workspace <workspace>", "Workspace name to index", "default")
  .action(async (options) => {
    try {
      const workspaceName = options.workspace;
      
      // Check if workspace exists
      if (!checkWorkspace(workspaceName)) {
        console.error(`Workspace "${workspaceName}" not found. Use 'gwanli auth' to list available workspaces.`);
        process.exit(1);
      }

      console.log(`Starting indexing for workspace: ${workspaceName}`);
      
      const config = loadConfig();
      const workspace = config.workspace[workspaceName];
      
      if (!workspace) {
        console.error(`Workspace configuration not found for: ${workspaceName}`);
        process.exit(1);
      }
      
      // Create job tracker
      const jobId = `cli-${Date.now()}`;
      const jobTracker = new JobTracker(jobId);
      
      console.log(`Job ID: ${jobId}`);
      console.log(`Job directory: ${jobTracker.getJobDir()}`);
      
      // Start indexing
      await indexNotionPages(workspace.api_key, workspace.db_path, jobTracker);
      
      console.log(`Indexing completed for workspace: ${workspaceName}`);
      jobTracker.updateStatus("END");
      
    } catch (error) {
      console.error(`Indexing failed:`, error);
      process.exit(1);
    }
  });

export { program as index };
