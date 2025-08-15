import { getRecentJobs, getJobById, type JobState } from "gwanli-core";
import type { ListJobsArgs, CheckJobArgs } from "../schemas.js";
import type { McpResponse, ToolHandler } from "../types.js";

function formatJobsList(jobs: JobState[]): string {
  if (jobs.length === 0) {
    return "No jobs found.";
  }

  let result = `**Found ${jobs.length} job(s):**\n\n`;
  
  jobs.forEach((job, index) => {
    const statusText = job.state?.status ? ` (${job.state.status})` : "";
    const timeStr = new Date(job.timestamp).toLocaleString();
    result += `**${index + 1}. ${job.jobId}**${statusText}\n`;
    result += `   ${job.prefix.toUpperCase()} job - ${timeStr}`;
    if (index < jobs.length - 1) {
      result += "\n\n";
    }
  });
  
  if (jobs.length > 0) {
    result += "\n\n*Use `checkJob` tool with a job ID to see detailed status.*";
  }
  
  return result;
}

function formatJobDetails(job: JobState): string {
  let result = `**Job Details**\n`;
  result += `${"=".repeat(50)}\n`;
  result += `**Job ID:** \`${job.jobId}\`\n`;
  result += `**Type:** ${job.prefix.toUpperCase()}\n`;
  result += `**Timestamp:** ${job.timestamp}\n`;
  result += `**Created:** ${new Date(job.timestamp).toLocaleString()}\n\n`;
  
  if (job.state) {
    result += `**Status Information:**\n`;
    result += `\`\`\`json\n${JSON.stringify(job.state, null, 2)}\n\`\`\`\n`;
  } else {
    result += `**Status:** No status file found\n`;
  }
  result += `${"=".repeat(50)}`;
  
  return result;
}

export const listJobsHandler: ToolHandler<ListJobsArgs> = async (args) => {
  try {
    const jobs = getRecentJobs(args.count, args.prefix);
    const formattedJobs = formatJobsList(jobs);
    
    return {
      content: [
        {
          type: "text",
          text: formattedJobs,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error listing jobs: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
};

export const checkJobHandler: ToolHandler<CheckJobArgs> = async (args) => {
  try {
    const job = getJobById(args.jobId);
    
    if (!job) {
      return {
        content: [
          {
            type: "text",
            text: `Job '${args.jobId}' not found.`,
          },
        ],
        isError: true,
      };
    }

    const formattedJob = formatJobDetails(job);
    
    return {
      content: [
        {
          type: "text",
          text: formattedJob,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error checking job: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
};
