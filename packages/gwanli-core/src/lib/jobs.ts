import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { GWANLI_HOME } from "../constants.js";
import { Logger, defaultLogger } from "../logging/index.js";
import { Runtime } from "../logging/runtime.js";

export type JobStatus = "START" | "PROCESSING" | "END" | "ERROR";

export interface JobInfo {
  id: string;
  status: JobStatus;
  error?: string;
  startTime: string;
  endTime?: string;
}

export class JobTracker {
  private jobId: string;
  private jobDir: string;
  private statusFile: string;
  private logger: Logger;

  constructor(jobId: string) {
    this.jobId = jobId || Date.now().toString();
    this.jobDir = join(GWANLI_HOME, this.jobId);
    this.statusFile = join(this.jobDir, "status.json");
    this.logger = new Logger(this.jobDir, `[${this.jobId}]`);

    // Create job directory
    mkdirSync(this.jobDir, { recursive: true });

    // Initialize status
    this.updateStatus("START");
  }

  getJobId(): string {
    return this.jobId;
  }

  getJobDir(): string {
    return this.jobDir;
  }

  updateStatus(status: JobStatus, error?: string): void {
    const jobInfo: JobInfo = {
      id: this.jobId,
      status,
      startTime: this.getStartTime() || new Date().toISOString(),
      error,
    };

    if (status === "END" || status === "ERROR") {
      jobInfo.endTime = new Date().toISOString();
    }

    writeFileSync(this.statusFile, JSON.stringify(jobInfo, null, 2));
  }

  getStatus(): JobInfo | null {
    try {
      const content = readFileSync(this.statusFile, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private getStartTime(): string | undefined {
    const current = this.getStatus();
    return current?.startTime;
  }

  // Job-specific logging methods that write to the job directory
  info(message?: any, ...optionalParams: any[]): void {
    this.logger.info(message, ...optionalParams);
    defaultLogger.console(`[${this.jobId}] ${message}`, ...optionalParams);
  }

  debug(message?: any, ...optionalParams: any[]): void {
    this.logger.debug(message, ...optionalParams);
    defaultLogger.console(
      `[${this.jobId}] [DEBUG] ${message}`,
      ...optionalParams
    );
  }

  error(message?: any, ...optionalParams: any[]): void {
    this.logger.error(message, ...optionalParams);
    console.error(`[${this.jobId}] ${message}`, ...optionalParams);
  }

  log(message?: any, ...optionalParams: any[]): void {
    this.info(message, ...optionalParams);
  }
}

export interface JobState {
  jobId: string;
  timestamp: number;
  state: any;
  statusPath: string;
  prefix: 'cli' | 'mcp';
}

export function getRecentJobs(count: number = 5, prefix?: 'cli' | 'mcp'): JobState[] {
  try {
    const dirs = readdirSync(GWANLI_HOME, { withFileTypes: true })
      .filter(dirent => {
        if (!dirent.isDirectory()) return false;
        
        const hasValidPrefix = dirent.name.startsWith('cli-') || dirent.name.startsWith('mcp-');
        if (!hasValidPrefix) return false;
        
        if (prefix) {
          return dirent.name.startsWith(`${prefix}-`);
        }
        
        return true;
      })
      .map(dirent => {
        const match = dirent.name.match(/^(cli|mcp)-(\d+)$/);
        const timestamp = match ? parseInt(match[2]) : 0;
        const jobPrefix = match ? match[1] as 'cli' | 'mcp' : 'cli';
        
        return {
          name: dirent.name,
          timestamp,
          path: join(GWANLI_HOME, dirent.name),
          prefix: jobPrefix
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count);

    return dirs.map(dir => {
      const statusPath = join(dir.path, 'status.json');
      let state = null;
      
      try {
        const statusContent = readFileSync(statusPath, 'utf-8');
        state = JSON.parse(statusContent);
      } catch {
        // If status.json doesn't exist or is invalid, state remains null
      }

      return {
        jobId: dir.name,
        timestamp: dir.timestamp,
        state,
        statusPath,
        prefix: dir.prefix
      };
    });
  } catch {
    return [];
  }
}

export function getJobById(jobId: string): JobState | null {
  try {
    const jobPath = join(GWANLI_HOME, jobId);
    const statusPath = join(jobPath, 'status.json');
    
    // Check if directory exists
    try {
      const stats = statSync(jobPath);
      if (!stats.isDirectory()) return null;
    } catch {
      return null;
    }
    
    const match = jobId.match(/^(cli|mcp)-(\d+)$/);
    if (!match) return null;
    
    const timestamp = parseInt(match[2]);
    const prefix = match[1] as 'cli' | 'mcp';
    
    let state = null;
    try {
      const statusContent = readFileSync(statusPath, 'utf-8');
      state = JSON.parse(statusContent);
    } catch {
      // If status.json doesn't exist or is invalid, state remains null
    }

    return {
      jobId,
      timestamp,
      state,
      statusPath,
      prefix
    };
  } catch {
    return null;
  }
}
