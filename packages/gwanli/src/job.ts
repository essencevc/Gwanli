import { Command } from "commander";
import { cliLogger, getRecentJobs, getJobById, type JobState } from "gwanli-core";

function formatJobsList(jobs: JobState[]): void {
  if (jobs.length === 0) {
    cliLogger.console("No jobs found.");
    return;
  }

  cliLogger.console(`\nFound ${jobs.length} job(s):\n`);
  
  jobs.forEach((job, index) => {
    const statusText = job.state?.status ? ` (${job.state.status})` : "";
    const timeStr = new Date(job.timestamp).toLocaleString();
    cliLogger.console(`${index + 1}. ${job.jobId}${statusText}`);
    cliLogger.console(`   ${job.prefix.toUpperCase()} job - ${timeStr}`);
    if (index < jobs.length - 1) {
      cliLogger.console("");
    }
  });
}

function formatJobDetails(job: JobState): void {
  cliLogger.console(`\nJob Details:`);
  cliLogger.console("=".repeat(50));
  cliLogger.console(`Job ID: ${job.jobId}`);
  cliLogger.console(`Type: ${job.prefix.toUpperCase()}`);
  cliLogger.console(`Timestamp: ${job.timestamp}`);
  cliLogger.console(`Created: ${new Date(job.timestamp).toLocaleString()}`);
  
  if (job.state) {
    cliLogger.console(`\nStatus Information:`);
    cliLogger.console(JSON.stringify(job.state, null, 2));
  } else {
    cliLogger.console(`\nNo status file found`);
  }
  cliLogger.console("=".repeat(50));
}

export const job = new Command("job")
  .description("Manage and check job status")
  .option("-i, --id <jobId>", "Check specific job by ID")
  .option("-n, --count <number>", "Number of recent jobs to show", "5")
  .option("-p, --prefix <type>", "Filter by job prefix (mcp|cli)", "mcp")
  .action(async (options) => {
    try {
      const { id, count, prefix } = options;
      
      // Validate prefix
      if (prefix && !['mcp', 'cli'].includes(prefix)) {
        cliLogger.error("Invalid prefix. Use 'mcp' or 'cli'");
        process.exit(1);
      }

      if (id) {
        // Get specific job by ID
        cliLogger.console(`Checking job: ${id}`);
        
        const job = getJobById(id);
        if (!job) {
          cliLogger.error(`Job '${id}' not found.`);
          process.exit(1);
        }

        formatJobDetails(job);
      } else {
        // Get recent jobs
        const jobCount = parseInt(count) || 5;
        cliLogger.console(`Fetching ${jobCount} recent ${prefix.toUpperCase()} jobs...`);
        
        const jobs = getRecentJobs(jobCount, prefix as 'mcp' | 'cli');
        formatJobsList(jobs);
        
        if (jobs.length > 0) {
          cliLogger.console(`\nUse 'gwanli job --id <jobId>' to see detailed status.`);
        }
      }
    } catch (error) {
      cliLogger.error(`Error checking jobs: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });
