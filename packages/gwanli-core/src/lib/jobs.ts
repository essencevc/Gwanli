import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { GWANLI_HOME } from "../constants.js";
import { Logger } from "../logging/index.js";

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
  private logger: any;

  constructor(jobId?: string) {
    this.jobId = jobId || Date.now().toString();
    this.jobDir = join(GWANLI_HOME, this.jobId);
    this.statusFile = join(this.jobDir, "status.json");
    this.logger = Logger.initPino(this.jobDir, `[${this.jobId}]`);

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
    Logger.console(`[${this.jobId}] ${message}`, ...optionalParams);
  }

  debug(message?: any, ...optionalParams: any[]): void {
    this.logger.debug(message, ...optionalParams);
    Logger.console(`[${this.jobId}] [DEBUG] ${message}`, ...optionalParams);
  }

  error(message?: any, ...optionalParams: any[]): void {
    this.logger.error(message, ...optionalParams);
    console.error(`[${this.jobId}] ${message}`, ...optionalParams);
  }

  log(message?: any, ...optionalParams: any[]): void {
    this.info(message, ...optionalParams);
  }
}
